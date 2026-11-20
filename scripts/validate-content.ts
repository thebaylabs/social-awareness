/**
 * Content validation. Runs before every build (`npm run build`) and on its own
 * with `npm run validate`. Add `--strict` to treat missing Gujarati
 * text as an error (CI does this).
 *
 * It reuses the app's own schemas and story rules, so what passes here is
 * exactly what the site can show.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { z } from 'zod'
import {
  doodle as doodleSchema,
  pills as pillsSchema,
  prasangFrontMatter,
  scenarioMoral as scenarioMoralSchema,
  story as storySchema,
  words as wordsSchema,
  type PrasangFrontMatter,
} from '../src/content/schemas.ts'
import {
  findMarkdownImages,
  parseFrontMatter,
  prasangFileName,
} from '../src/content/frontmatter.ts'
import { validateStory } from '../src/features/story/validate.ts'
import { DOODLE_ICON_NAMES } from '../src/games/doodle/icon-names.ts'

const LANGS = ['en', 'gu'] as const
const OTHER_LANGS = ['gu'] as const

export type Severity = 'error' | 'warning' | 'translation'
export interface Problem {
  severity: Severity
  file: string
  message: string
}

export interface Report {
  problems: Problem[]
  /** Number of content files checked. */
  checked: number
}

class Collector {
  problems: Problem[] = []
  checked = 0
  error(file: string, message: string) {
    this.problems.push({ severity: 'error', file, message })
  }
  warn(file: string, message: string) {
    this.problems.push({ severity: 'warning', file, message })
  }
  translation(file: string, message: string) {
    this.problems.push({ severity: 'translation', file, message })
  }
}

function readJson(c: Collector, root: string, rel: string): unknown {
  try {
    return JSON.parse(readFileSync(join(root, rel), 'utf8')) as unknown
  } catch (e) {
    c.error(rel, `not valid JSON: ${(e as Error).message}`)
    return undefined
  }
}

function reportZod(c: Collector, file: string, error: z.ZodError) {
  for (const issue of error.issues) {
    c.error(file, `${issue.path.map(String).join('.') || '(file)'}: ${issue.message}`)
  }
}

function listFiles(dir: string, pattern: RegExp): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => pattern.test(f))
    .sort()
}

/**
 * Walk any value and report every localized text object ({ en, gu? })
 * that lacks Gujarati.
 */
function checkTranslations(c: Collector, file: string, value: unknown, path = ''): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => checkTranslations(c, file, v, `${path}[${i}]`))
    return
  }
  if (value === null || typeof value !== 'object') return
  const obj = value as Record<string, unknown>
  if (
    typeof obj.en === 'string' &&
    Object.keys(obj).every((k) => (LANGS as readonly string[]).includes(k))
  ) {
    for (const lang of OTHER_LANGS) {
      const text = obj[lang]
      if (typeof text !== 'string' || text.trim() === '') {
        c.translation(file, `${path || '(text)'}: missing Gujarati (${lang})`)
      }
    }
    return
  }
  for (const [key, v] of Object.entries(obj))
    checkTranslations(c, file, v, path ? `${path}.${key}` : key)
}

function placeholdersIn(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string).sort()
}

// ---------- Locales ----------

function checkLocales(c: Collector, root: string) {
  const en = readJson(c, root, 'locales/en.json') as Record<string, unknown> | undefined
  if (!en) return
  c.checked++
  for (const [key, value] of Object.entries(en)) {
    if (typeof value !== 'string' || value.trim() === '')
      c.error('locales/en.json', `"${key}" has no English text`)
  }
  for (const lang of OTHER_LANGS) {
    const rel = `locales/${lang}.json`
    const messages = readJson(c, root, rel) as Record<string, unknown> | undefined
    if (!messages) continue
    c.checked++
    for (const key of Object.keys(messages)) {
      if (!(key in en)) c.error(rel, `"${key}" is not in en.json (typo, or remove it)`)
    }
    for (const [key, enValue] of Object.entries(en)) {
      const value = messages[key]
      if (typeof value !== 'string' || value.trim() === '') {
        c.translation(rel, `"${key}" is missing`)
        continue
      }
      if (
        typeof enValue === 'string' &&
        placeholdersIn(enValue).join() !== placeholdersIn(value).join()
      ) {
        c.error(
          rel,
          `"${key}" must use the same {placeholders} as English: ${placeholdersIn(enValue).join(', ') || 'none'}`,
        )
      }
    }
  }
}

// ---------- Stories ----------

function checkStories(c: Collector, root: string, images: Set<string>, used: Set<string>) {
  const dir = join(root, 'content/stories')
  const ids = new Map<string, string>()
  for (const name of listFiles(dir, /\.json$/)) {
    const rel = `content/stories/${name}`
    const raw = readJson(c, root, rel)
    if (raw === undefined) continue
    c.checked++
    const parsed = storySchema.safeParse(raw)
    if (!parsed.success) {
      reportZod(c, rel, parsed.error)
      continue
    }
    const story = parsed.data
    const key = `${story.audience}/${story.id}`
    if (ids.has(key)) c.error(rel, `story id "${story.id}" is also used by ${ids.get(key)}`)
    ids.set(key, rel)
    const check = validateStory(story)
    check.errors.forEach((m) => c.error(rel, m))
    check.warnings.forEach((m) => c.warn(rel, m))
    for (const node of story.nodes) {
      for (const src of [node.image?.src, node.video?.poster]) {
        if (!src) continue
        used.add(src)
        if (!images.has(src))
          c.error(rel, `node "${node.id}": image "${src}" is not in content/images/`)
      }
      if (node.video?.captions === undefined && node.video) {
        c.warn(rel, `node "${node.id}": video has no captions file`)
      }
    }
    checkTranslations(c, rel, raw)
  }
}

// ---------- The lesson the Yuvako scenarios share ----------

function checkScenarioMoral(c: Collector, root: string, images: Set<string>, used: Set<string>) {
  const rel = 'content/scenario-moral.json'
  if (!existsSync(join(root, rel))) return
  const raw = readJson(c, root, rel)
  if (raw === undefined) return
  c.checked++
  const parsed = scenarioMoralSchema.safeParse(raw)
  if (!parsed.success) return reportZod(c, rel, parsed.error)
  const src = parsed.data.image?.src
  if (src) {
    used.add(src)
    if (!images.has(src)) c.error(rel, `image "${src}" is not in content/images/`)
  }
  checkTranslations(c, rel, raw)
}

// ---------- Prasangs ----------

interface PrasangFile {
  rel: string
  lang: string
  front: PrasangFrontMatter
}

function checkPrasangs(
  c: Collector,
  root: string,
  images: Set<string>,
  used: Set<string>,
  audio: Set<string>,
) {
  const dir = join(root, 'content/prasangs')
  const groups = new Map<string, PrasangFile[]>()
  for (const name of listFiles(dir, /\.md$/)) {
    const rel = `content/prasangs/${name}`
    const fileName = prasangFileName(name)
    if (!fileName || !(LANGS as readonly string[]).includes(fileName.lang)) {
      c.error(rel, 'name must be <id>.<lang>.md, where <lang> is en or gu')
      continue
    }
    c.checked++
    let doc
    try {
      doc = parseFrontMatter(readFileSync(join(dir, name), 'utf8'))
    } catch (e) {
      c.error(rel, `front matter is not valid YAML: ${(e as Error).message}`)
      continue
    }
    const parsed = prasangFrontMatter.safeParse(doc.data)
    if (!parsed.success) {
      reportZod(c, rel, parsed.error)
      continue
    }
    const front = parsed.data
    if (front.id !== fileName.id)
      c.error(rel, `id "${front.id}" does not match the file name "${fileName.id}"`)
    if (front.comic) {
      if (front.images.length < 2)
        c.error(rel, 'a comic prasang needs at least two images under images:')
      for (const img of front.images) {
        if (!img.alt?.trim())
          c.error(rel, `comic page "${img.src}" needs alt text: add "alt:" under its src`)
      }
    } else if (front.images.length > 0 && !front.images[0]?.alt?.trim()) {
      c.error(rel, 'the cover (first image) needs alt text: add "alt:" under its src')
    }
    const listed = new Set(front.images.map((i) => i.src))
    for (const img of front.images) {
      used.add(img.src)
      if (!images.has(img.src)) c.error(rel, `image "${img.src}" is not in content/images/`)
    }
    if (front.soundtrack) {
      if (!audio.has(front.soundtrack))
        c.error(rel, `soundtrack "${front.soundtrack}" is not in content/audio/`)
      if (!front.comic) c.error(rel, 'soundtrack requires comic: true')
    }
    for (const img of findMarkdownImages(doc.body)) {
      if (!img.alt)
        c.error(rel, `picture "${img.src}" in the text has no alt text: write it inside ![...]`)
      if (!listed.has(img.src)) {
        c.error(rel, `picture "${img.src}" in the text is not listed under images: with its source`)
      }
    }
    if (!doc.body.trim()) c.error(rel, 'the prasang has no text')
    const group = groups.get(fileName.id) ?? []
    group.push({ rel, lang: fileName.lang, front })
    groups.set(fileName.id, group)
  }

  for (const [id, files] of groups) {
    const en = files.find((f) => f.lang === 'en')
    if (!en) {
      c.error(`content/prasangs/${id}.en.md`, 'the English file is missing')
      continue
    }
    const imageKey = (f: PrasangFile) =>
      JSON.stringify(f.front.images.map((i) => [i.src, i.source]))
    for (const f of files) {
      if (f === en) continue
      if (f.front.audience !== en.front.audience) c.error(f.rel, `audience differs from ${en.rel}`)
      if (f.front.placeholder !== en.front.placeholder)
        c.error(f.rel, `placeholder differs from ${en.rel}`)
      if (f.front.comic !== en.front.comic) c.error(f.rel, `comic differs from ${en.rel}`)
      if (f.front.soundtrack !== en.front.soundtrack)
        c.error(f.rel, `soundtrack differs from ${en.rel}`)
      if (f.front.pageSeconds !== en.front.pageSeconds)
        c.error(f.rel, `pageSeconds differs from ${en.rel}`)
      if (imageKey(f) !== imageKey(en))
        c.error(f.rel, `images (src and source) differ from ${en.rel}`)
    }
    for (const lang of OTHER_LANGS) {
      if (!files.some((f) => f.lang === lang)) {
        c.translation(
          `content/prasangs/${id}.${lang}.md`,
          'translation file is missing (English is shown instead)',
        )
      }
    }
  }
}

// ---------- Games ----------

function checkPills(c: Collector, root: string) {
  const rel = 'content/pills.json'
  if (!existsSync(join(root, rel))) return
  const raw = readJson(c, root, rel)
  if (raw === undefined) return
  c.checked++
  const parsed = pillsSchema.safeParse(raw)
  if (!parsed.success) return reportZod(c, rel, parsed.error)
  const { cards, green } = parsed.data
  if (cards.length < 1) c.error(rel, 'add at least one red card')
  cards.forEach((card, i) => {
    if (card.source === null) c.warn(rel, `cards[${i}]: red card has no source yet`)
    for (const [j, src] of [card.source, ...card.moreSources].entries()) {
      if (src && !src.url)
        c.warn(rel, `cards[${i}]: source ${j + 1} has no link (url), so readers cannot check it`)
    }
  })
  green.pages.forEach((page, i) => {
    for (const [j, src] of [page.source, ...page.moreSources].entries()) {
      if (!src.url)
        c.warn(
          rel,
          `green.pages[${i}]: source ${j + 1} has no link (url), so readers cannot check it`,
        )
    }
  })
  checkTranslations(c, rel, raw)
}

function checkWords(c: Collector, root: string) {
  const rel = 'content/words.json'
  if (!existsSync(join(root, rel))) return
  const raw = readJson(c, root, rel)
  if (raw === undefined) return
  c.checked++
  const parsed = wordsSchema.safeParse(raw)
  if (!parsed.success) return reportZod(c, rel, parsed.error)
  const seen = new Set<string>()
  parsed.data.words.forEach((w, i) => {
    if (seen.has(w.word)) c.error(rel, `words[${i}]: "${w.word}" is listed twice`)
    seen.add(w.word)
    if (!w.native?.gu) {
      c.warn(rel, `words[${i}]: "${w.word}" has no native-script form for Gujarati`)
    }
  })
  checkTranslations(c, rel, raw)
}

function checkDoodle(c: Collector, root: string) {
  const rel = 'content/doodle-items.json'
  if (!existsSync(join(root, rel))) return
  const raw = readJson(c, root, rel)
  if (raw === undefined) return
  c.checked++
  const parsed = doodleSchema.safeParse(raw)
  if (!parsed.success) return reportZod(c, rel, parsed.error)
  const { config, items } = parsed.data
  if (config.maxSpeed < config.startSpeed)
    c.error(rel, 'config.maxSpeed is lower than config.startSpeed')
  if (!items.some((i) => i.kind === 'positive')) c.error(rel, 'add at least one positive item')
  if (!items.some((i) => i.kind === 'negative') && config.negativeShare > 0) {
    c.error(rel, 'add at least one negative item, or set negativeShare to 0')
  }
  items.forEach((item, i) => {
    if (!(DOODLE_ICON_NAMES as readonly string[]).includes(item.icon)) {
      c.warn(
        rel,
        `items[${i}]: unknown icon "${item.icon}" (a generic icon is used). Known: ${DOODLE_ICON_NAMES.join(', ')}`,
      )
    }
  })
  checkTranslations(c, rel, raw)
}

// ---------- Run ----------

export function validateContent(root: string): Report {
  const c = new Collector()
  const imageDir = join(root, 'content/images')
  const images = new Set(listFiles(imageDir, /\.(svg|png|jpe?g|webp|gif|avif)$/i))
  const audio = new Set(listFiles(join(root, 'content/audio'), /\.(mp3|ogg|wav|m4a)$/i))
  const used = new Set<string>()
  checkLocales(c, root)
  checkStories(c, root, images, used)
  checkScenarioMoral(c, root, images, used)
  checkPrasangs(c, root, images, used, audio)
  checkPills(c, root)
  checkWords(c, root)
  checkDoodle(c, root)
  for (const img of images) {
    if (!used.has(img)) c.warn(`content/images/${img}`, 'not used by any content file')
  }
  return { problems: c.problems, checked: c.checked }
}

function main() {
  const strict = process.argv.includes('--strict')
  const root = resolve(process.argv.find((a) => a.startsWith('--root='))?.slice(7) ?? '.')
  const { problems, checked } = validateContent(root)
  const isFailure = (p: Problem) =>
    p.severity === 'error' || (strict && p.severity === 'translation')
  const groups: [string, Problem[]][] = [
    ['Errors', problems.filter((p) => p.severity === 'error')],
    [
      strict ? 'Missing translations (errors in --strict mode)' : 'Missing translations',
      problems.filter((p) => p.severity === 'translation'),
    ],
    ['Warnings', problems.filter((p) => p.severity === 'warning')],
  ]
  for (const [title, list] of groups) {
    if (list.length === 0) continue
    console.log(`\n${title} (${list.length}):`)
    for (const p of list) console.log(`  ${p.file}: ${p.message}`)
  }
  const failures = problems.filter(isFailure).length
  console.log(
    `\nvalidate: ${checked} files checked, ${failures} failing problem(s)${strict ? ' [strict]' : ''}.`,
  )
  if (failures > 0) process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
