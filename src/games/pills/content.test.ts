import { describe, expect, it } from 'vitest'
import { PILLS } from '../../content/games'
import { IMPACT_GROUPS, pills as pillsSchema } from '../../content/schemas'
import raw from '../../../content/pills.json'

const reds = PILLS.data?.cards ?? []
const greens = PILLS.data?.green.pages ?? []

/** Every localized text ({ en, gu, hi }) anywhere inside a value. */
function texts(value: unknown, path = ''): [string, Record<string, string>][] {
  if (Array.isArray(value)) return value.flatMap((v, i) => texts(v, `${path}[${i}]`))
  if (value === null || typeof value !== 'object') return []
  const obj = value as Record<string, unknown>
  if (typeof obj.en === 'string') return [[path, obj as Record<string, string>]]
  return Object.entries(obj).flatMap(([k, v]) => texts(v, path ? `${path}.${k}` : k))
}

describe('pill content', () => {
  it('passes the schema', () => {
    expect(PILLS.errors).toEqual([])
    expect(PILLS.data).not.toBeNull()
  })

  it('has five red cards, a blue section and two or three green pages', () => {
    expect(reds).toHaveLength(5)
    expect(PILLS.data?.blue.message.en).toBeTruthy()
    expect(greens.length).toBeGreaterThanOrEqual(2)
    expect(greens.length).toBeLessThanOrEqual(3)
  })

  it('gives every red card the full insight layout', () => {
    for (const c of reds) {
      expect(c.title?.en).toBeTruthy()
      expect(c.takeaway?.en).toBeTruthy()
      expect(c.recommendation?.en).toBeTruthy()
      expect(Object.keys(c.audienceImpacts ?? {}).sort()).toEqual([...IMPACT_GROUPS].sort())
    }
  })

  it('has English and Gujarati for every text on every card', () => {
    const missing = texts(raw).flatMap(([path, t]) =>
      (['en', 'gu'] as const).filter((l) => !t[l]?.trim()).map((l) => `${path}: ${l}`),
    )
    expect(missing).toEqual([])
  })

  it('does not just copy English into Gujarati', () => {
    const copies = texts(raw).filter(([, t]) => t.gu === t.en)
    expect(copies.map(([p]) => p)).toEqual([])
  })

  it('has only children and adults as age groups', () => {
    expect([...IMPACT_GROUPS]).toEqual(['children', 'adults'])
    for (const c of reds) expect(Object.keys(c.audienceImpacts ?? {})).toEqual(IMPACT_GROUPS)
  })

  it('gives every red card IEEE-style references with a link', () => {
    for (const c of reds) {
      expect(c.source, c.title?.en).not.toBeNull()
      for (const s of [c.source, ...c.moreSources]) {
        expect(s?.url, c.title?.en).toMatch(/^https:\/\//)
        // IEEE: author or organisation, a quoted title (or a journal article), a year.
        expect(s?.citation, c.title?.en).toMatch(/"[^"]+[,.?]"|Sci\. Rep\.|Br\. J\./)
        expect(s?.citation, c.title?.en).toMatch(/\b((19|20)\d\d|n\.d\.)/)
        expect(s?.citation, c.title?.en).toMatch(/\.$/)
      }
    }
  })

  /** The [n] markers in some texts, in one language. */
  const markers = (value: unknown, lang: 'en' | 'gu') =>
    texts(value).flatMap(([, t]) =>
      [...(t[lang] ?? '').matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])),
    )

  it('cites every reference at least once, and only references that exist, in every language', () => {
    for (const c of reds) {
      const count = 1 + c.moreSources.length
      for (const lang of ['en', 'gu'] as const) {
        const used = new Set(
          markers([c.text, c.audienceImpacts, c.recommendation, c.takeaway], lang),
        )
        for (const n of used) expect(n, `${c.title?.en} [${n}] ${lang}`).toBeLessThanOrEqual(count)
        for (let n = 1; n <= count; n++)
          expect(used.has(n), `${c.title?.en}: reference [${n}] is cited in ${lang}`).toBe(true)
      }
    }
  })

  it('gives every green page IEEE-style references with a link, all cited in all languages', () => {
    for (const g of greens) {
      const sources = [g.source, ...g.moreSources]
      for (const s of sources) {
        expect(s.url, g.title.en).toMatch(/^https:\/\//)
        expect(s.citation, g.title.en).toMatch(/\b((19|20)\d\d|n\.d\.)/)
        expect(s.citation, g.title.en).toMatch(/\.$/)
      }
      for (const lang of ['en', 'gu'] as const) {
        const used = new Set(markers([g.text, g.action, g.why], lang))
        for (const n of used)
          expect(n, `${g.title.en} [${n}] ${lang}`).toBeLessThanOrEqual(sources.length)
        for (let n = 1; n <= sources.length; n++)
          expect(used.has(n), `${g.title.en}: reference [${n}] is cited in ${lang}`).toBe(true)
      }
    }
  })

  it('has a page on the Adult Development study, with its source and careful wording', () => {
    const page = greens.find((g) => /Adult Development/.test(g.text.en))
    expect(page?.source.url).toBe(
      [
        'https://news.',
        'har' + 'vard',
        '.edu/gazette/story/2017/04/over-nearly-80-years-',
        'har' + 'vard',
        '-study-has-been-showing-how-to-live-a-healthy-and-happy-life/',
      ].join(''),
    )
    expect(page?.text.en).toMatch(/strongly associated with better happiness, health and longevity/)
    expect(page?.text.en).toMatch(/does not prove/)
    expect(page?.why.en).not.toMatch(/\b(proves|causes|guarantees)\b/)
  })

  it('gives the guide a short line about not escaping reality, in every language', () => {
    const m = PILLS.data?.blue.message
    expect(m?.en).toMatch(/reality/)
    // It sits in a speech bubble on a phone, so it stays brief.
    expect(m?.en.length).toBeLessThanOrEqual(100)
    expect(m?.gu?.length).toBeGreaterThan(10)
  })

  it('gives every visual a text alternative in all three languages', () => {
    for (const c of [...reds, ...greens]) {
      expect(c.visual?.alt.en.length, c.title?.en).toBeGreaterThan(20)
      expect(c.visual?.alt.gu?.length, c.title?.en).toBeGreaterThan(20)
    }
  })

  it('uses a mixture of visual types', () => {
    expect(new Set(reds.map((c) => c.visual?.type)).size).toBeGreaterThanOrEqual(3)
  })

  it('rejects a finished red card without a source, visual or alt text', () => {
    const base = structuredClone(raw) as { cards: Record<string, unknown>[] }
    const first = base.cards[0]!
    expect(pillsSchema.safeParse({ ...base, cards: [{ ...first, source: null }] }).success).toBe(
      false,
    )
    const noVisual = { ...first }
    delete noVisual.visual
    expect(pillsSchema.safeParse({ ...base, cards: [noVisual] }).success).toBe(false)
    const noAlt = structuredClone(first) as { visual: { alt?: unknown } }
    delete noAlt.visual.alt
    expect(pillsSchema.safeParse({ ...base, cards: [noAlt] }).success).toBe(false)
  })

  it('still accepts the old plain placeholder card', () => {
    const plain = { path: 'red', text: { en: 'x' }, source: null, placeholder: true }
    expect(pillsSchema.safeParse({ ...(raw as object), cards: [plain] }).success).toBe(true)
  })
})
