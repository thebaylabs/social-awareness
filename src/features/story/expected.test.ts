import { describe, expect, it } from 'vitest'
import type { Story } from '../../content/schemas'
import { reachableEndings } from './endings'
import { followedExpectedPath } from './expected'

const t = (en: string) => ({ en })
const end = { outcome: t('o'), lesson: t('l') }

const story: Story = {
  id: 's',
  audience: 'bhulkao',
  title: t('T'),
  startNode: 'start',
  placeholder: false,
  nodes: [
    {
      id: 'start',
      text: t('a'),
      choices: [
        { label: t('play'), next: 'play' },
        { label: t('finish'), next: 'finish', expected: true },
      ],
    },
    {
      id: 'finish',
      text: t('b'),
      choices: [
        { label: t('together'), next: 'together', expected: true },
        { label: t('alone'), next: 'alone' },
      ],
    },
    { id: 'play', text: t('c'), ending: end },
    { id: 'together', text: t('d'), ending: end },
    { id: 'alone', text: t('e'), ending: end },
  ],
}

describe('followedExpectedPath', () => {
  it('is true only when every expected decision was taken', () => {
    expect(followedExpectedPath(story, ['start', 'finish', 'together'])).toBe(true)
  })

  it('is false when an expected decision was skipped', () => {
    expect(followedExpectedPath(story, ['start', 'finish', 'alone'])).toBe(false)
    expect(followedExpectedPath(story, ['start', 'play'])).toBe(false)
  })

  it('is false before an ending', () => {
    expect(followedExpectedPath(story, ['start', 'finish'])).toBe(false)
  })
})

/** Every path from the start of a story to one of its endings. */
function pathsToEndings(story: Story): string[][] {
  const byId = new Map(story.nodes.map((node) => [node.id, node]))
  const found: string[][] = []
  const walk = (path: string[]) => {
    const node = byId.get(path[path.length - 1] ?? '')
    if (!node) return
    if (node.ending) found.push(path)
    for (const choice of node.choices ?? []) {
      if (!path.includes(choice.next)) walk([...path, choice.next])
    }
  }
  walk([story.startNode])
  return found
}

describe('the scenarios in content/stories', () => {
  const files = import.meta.glob<Story>('/content/stories/*.json', {
    eager: true,
    import: 'default',
  })
  const stories = Object.values(files)

  it('finds the story files', () => {
    expect(stories.length).toBeGreaterThan(0)
  })

  for (const story of stories) {
    it(`${story.id} has one best ending, reached by a single path`, () => {
      const best = pathsToEndings(story).filter((path) => followedExpectedPath(story, path))
      expect(best).toHaveLength(1)
      expect(reachableEndings(story).length).toBeGreaterThan(1)
    })
  }
})
