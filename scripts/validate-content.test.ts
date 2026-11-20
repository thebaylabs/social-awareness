import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { validateContent } from './validate-content'

const dirs: string[] = []

/** Copy the real content and locales into a temporary folder so tests can break them. */
function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'content-test-'))
  dirs.push(dir)
  cpSync('content', join(dir, 'content'), { recursive: true })
  cpSync('locales', join(dir, 'locales'), { recursive: true })
  return dir
}

function edit(dir: string, rel: string, change: (text: string) => string) {
  const path = join(dir, rel)
  writeFileSync(path, change(readFileSync(path, 'utf8')))
}

const errorsOf = (dir: string) =>
  validateContent(dir)
    .problems.filter((p) => p.severity === 'error')
    .map((p) => `${p.file}: ${p.message}`)

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('validateContent', () => {
  it('passes the shipped content with no errors and no missing translations', () => {
    const { problems } = validateContent('.')
    expect(problems.filter((p) => p.severity !== 'warning')).toEqual([])
  })

  it('fails a story whose choice points to a missing node', () => {
    const dir = fixture()
    edit(dir, 'content/stories/homework-time.json', (s) =>
      s.replace('"next": "play"', '"next": "nowhere"'),
    )
    expect(errorsOf(dir).join('\n')).toMatch(/homework-time\.json: .*missing node "nowhere"/)
  })

  it('fails a story with missing English text', () => {
    const dir = fixture()
    edit(dir, 'content/stories/one-am-exam.json', (s) =>
      s.replace('"en": "Watch one more video"', '"en": ""'),
    )
    expect(errorsOf(dir).join('\n')).toMatch(/one-am-exam\.json: .*English text is required/)
  })

  it('fails a story picture with no source', () => {
    const dir = fixture()
    edit(dir, 'content/stories/one-am-exam.json', (s) =>
      s.replace('"source": "Original placeholder drawing made for this project"', '"source": ""'),
    )
    expect(errorsOf(dir).join('\n')).toMatch(/source/)
  })

  it('fails a shared scenario lesson whose picture is missing', () => {
    const dir = fixture()
    edit(dir, 'content/scenario-moral.json', (s) =>
      s.replace('placeholder-pause-moral.svg', 'no-such-picture.svg'),
    )
    expect(errorsOf(dir).join('\n')).toMatch(
      /scenario-moral\.json: image "no-such-picture\.svg" is not in content\/images\//,
    )
  })

  it('reports a shared scenario lesson with no Gujarati as a missing translation', () => {
    const dir = fixture()
    edit(dir, 'content/scenario-moral.json', (s) => s.replace(/,\s*"gu": "થોભો[^"]*"/, ''))
    const { problems } = validateContent(dir)
    expect(problems.filter((p) => p.severity === 'error')).toEqual([])
    expect(problems).toContainEqual({
      severity: 'translation',
      file: 'content/scenario-moral.json',
      message: 'title: missing Gujarati (gu)',
    })
  })

  it('fails a prasang picture with no alt text', () => {
    const dir = fixture()
    edit(dir, 'content/prasangs/lamp-by-the-window.en.md', (s) =>
      s.replace(
        '![The same lamp burning steadily beside a half-closed window, with an open notebook nearby.]',
        '![]',
      ),
    )
    expect(errorsOf(dir).join('\n')).toMatch(/lamp-by-the-window\.en\.md: .*no alt text/)
  })

  it('fails prasang language files that disagree', () => {
    const dir = fixture()
    edit(dir, 'content/prasangs/sparrows-and-the-sea.gu.md', (s) =>
      s
        .replace('audience: bhulkao', 'audience: yuvako')
        .replace('placeholder: false', 'placeholder: true'),
    )
    const errors = errorsOf(dir).join('\n')
    expect(errors).toMatch(/sparrows-and-the-sea\.gu\.md: audience differs/)
    expect(errors).toMatch(/sparrows-and-the-sea\.gu\.md: placeholder differs/)
  })

  it('reports a missing translation without failing, unless strict', () => {
    const dir = fixture()
    edit(dir, 'locales/gu.json', (s) => s.replace(/\s*"games\.lead": "[^"]*",/, ''))
    const { problems } = validateContent(dir)
    expect(problems.filter((p) => p.severity === 'error')).toEqual([])
    expect(problems.filter((p) => p.severity === 'translation').map((p) => p.message)).toContain(
      '"games.lead" is missing',
    )
  })

  it('fails an interface string whose {placeholders} differ from English', () => {
    const dir = fixture()
    edit(dir, 'locales/gu.json', (s) => s.replace('{page} પર પાછા જાઓ', '{pg} પર પાછા જાઓ'))
    expect(errorsOf(dir).join('\n')).toMatch(/nav\.back.*same \{placeholders\}/)
  })

  it('warns, without failing, about an unknown doodle icon', () => {
    const dir = fixture()
    edit(dir, 'content/doodle-items.json', (s) => s.replace('"icon": "book"', '"icon": "unicorn"'))
    const { problems } = validateContent(dir)
    expect(problems.filter((p) => p.severity === 'error')).toEqual([])
    expect(
      problems.some((p) => p.severity === 'warning' && /unknown icon "unicorn"/.test(p.message)),
    ).toBe(true)
  })

  it('fails a negative doodle item without an explanation', () => {
    const dir = fixture()
    edit(dir, 'content/doodle-items.json', (s) => s.replace(/"explanation": \{[^}]*\},?/, ''))
    expect(errorsOf(dir).join('\n')).toMatch(/negative item needs an explanation/)
  })
})
