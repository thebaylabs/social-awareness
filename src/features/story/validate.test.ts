import { describe, expect, it } from 'vitest'
import type { Story } from '../../content/schemas'
import { validateStory } from './validate'

const t = (en: string) => ({ en })
const end = { outcome: t('o'), lesson: t('l') }

function story(nodes: Story['nodes'], startNode = 'a'): Story {
  return { id: 's', audience: 'bhulkao', title: t('T'), startNode, nodes, placeholder: false }
}

const good = story([
  {
    id: 'a',
    text: t('a'),
    choices: [
      { label: t('x'), next: 'b' },
      { label: t('y'), next: 'c' },
    ],
  },
  { id: 'b', text: t('b'), choices: [{ label: t('x'), next: 'd' }] },
  { id: 'c', text: t('c'), choices: [{ label: t('x'), next: 'd' }] },
  { id: 'd', text: t('d'), ending: end },
])

describe('validateStory', () => {
  it('accepts a well-formed story', () => {
    expect(validateStory(good)).toEqual({ errors: [], warnings: [] })
  })

  it('rejects a choice that points to a missing node', () => {
    const s = story([{ id: 'a', text: t('a'), choices: [{ label: t('x'), next: 'nowhere' }] }])
    expect(validateStory(s).errors.join()).toMatch(/missing node "nowhere"/)
  })

  it('rejects a missing start node', () => {
    expect(validateStory(story(good.nodes, 'zzz')).errors.join()).toMatch(/startNode "zzz"/)
  })

  it('rejects duplicate node ids', () => {
    const s = story([...good.nodes, { id: 'd', text: t('d2'), ending: end }])
    expect(validateStory(s).errors.join()).toMatch(/"d" is defined more than once/)
  })

  it('needs exactly one of choices or ending', () => {
    const both = story([
      { id: 'a', text: t('a'), choices: [{ label: t('x'), next: 'a' }], ending: end },
    ])
    const neither = story([{ id: 'a', text: t('a') }])
    expect(validateStory(both).errors.join()).toMatch(/exactly one/)
    expect(validateStory(neither).errors.join()).toMatch(/exactly one/)
  })

  it('rejects nodes that cannot reach an ending', () => {
    const s = story([
      {
        id: 'a',
        text: t('a'),
        choices: [
          { label: t('x'), next: 'b' },
          { label: t('y'), next: 'e' },
        ],
      },
      { id: 'b', text: t('b'), choices: [{ label: t('x'), next: 'c' }] },
      { id: 'c', text: t('c'), choices: [{ label: t('x'), next: 'b' }] },
      { id: 'e', text: t('e'), ending: end },
    ])
    const { errors } = validateStory(s)
    expect(errors).toContain('node "b" cannot reach an ending')
    expect(errors).toContain('node "c" cannot reach an ending')
  })

  it('rejects a node with both an image and a video', () => {
    const media = { alt: t('alt'), source: 'test' }
    const s = story([
      {
        id: 'a',
        text: t('a'),
        ending: end,
        image: { src: 'a.svg', ...media },
        video: { src: 'v.mp4', ...media },
      },
    ])
    expect(validateStory(s).errors.join()).toMatch(/both an image and a video/)
  })

  it('warns about unreachable nodes and paths outside three to five steps', () => {
    const s = story([
      { id: 'a', text: t('a'), choices: [{ label: t('x'), next: 'd' }] },
      { id: 'd', text: t('d'), ending: end },
      { id: 'orphan', text: t('o'), ending: end },
    ])
    const { errors, warnings } = validateStory(s)
    expect(errors).toEqual([])
    expect(warnings.join()).toMatch(/"orphan" cannot be reached/)
    expect(warnings.join()).toMatch(/guideline is 3 to 5/)
  })

  it('warns when a Yuvako ending has no title, and only for Yuvako', () => {
    const titled = { ...end, title: t('Named') }
    const nodes: Story['nodes'] = [
      {
        id: 'a',
        text: t('a'),
        choices: [
          { label: t('x'), next: 'b' },
          { label: t('y'), next: 'c' },
        ],
      },
      { id: 'b', text: t('b'), choices: [{ label: t('x'), next: 'd' }] },
      { id: 'c', text: t('c'), choices: [{ label: t('x'), next: 'e' }] },
      { id: 'd', text: t('d'), ending: titled },
      { id: 'e', text: t('e'), ending: end },
    ]
    expect(validateStory({ ...story(nodes), audience: 'yuvako' }).warnings).toEqual([
      'ending "e" has no "title"; the list of endings found shows a number',
    ])
    expect(validateStory(story(nodes)).warnings).toEqual([])
  })

  it('allows loops as long as an ending stays reachable', () => {
    const s = story([
      { id: 'a', text: t('a'), choices: [{ label: t('x'), next: 'b' }] },
      {
        id: 'b',
        text: t('b'),
        choices: [
          { label: t('back'), next: 'a' },
          { label: t('on'), next: 'c' },
        ],
      },
      { id: 'c', text: t('c'), ending: end },
    ])
    expect(validateStory(s).errors).toEqual([])
  })
})
