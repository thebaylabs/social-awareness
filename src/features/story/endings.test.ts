import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Story } from '../../content/schemas'
import {
  ENDINGS_FOUND_KEY,
  MORAL_REVEALED_KEY,
  choicesTaken,
  isFinished,
  reachableEndings,
  readEndingsFound,
  readFinished,
  readMoralRevealed,
  writeEndingsFound,
  writeMoralRevealed,
} from './endings'

const t = (en: string) => ({ en })
const end = { outcome: t('o'), lesson: t('l') }

const story: Story = {
  id: 's',
  audience: 'yuvako',
  title: t('T'),
  startNode: 'start',
  placeholder: false,
  nodes: [
    {
      id: 'start',
      text: t('a'),
      choices: [
        { label: t('stay up'), next: 'late' },
        { label: t('sleep'), next: 'rested' },
      ],
    },
    {
      id: 'late',
      text: t('b'),
      choices: [
        { label: t('keep going'), next: 'tired' },
        { label: t('go back'), next: 'start' },
      ],
    },
    { id: 'tired', text: t('c'), ending: { ...end, title: t('Tired') } },
    { id: 'orphan', text: t('d'), ending: end },
    { id: 'rested', text: t('e'), ending: end },
  ],
}

describe('reachableEndings', () => {
  it('lists the endings that can be reached, in file order', () => {
    expect(reachableEndings(story).map((node) => node.id)).toEqual(['tired', 'rested'])
  })
})

describe('choicesTaken', () => {
  it('is empty at the start', () => {
    expect(choicesTaken(story, ['start'])).toEqual([])
  })

  it('lists each choice on the path, including a loop back', () => {
    expect(choicesTaken(story, ['start', 'late', 'start', 'rested'])).toEqual([
      t('stay up'),
      t('go back'),
      t('sleep'),
    ])
  })
})

/** A minimal in-memory sessionStorage. */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  }
}

describe('endings found in this tab', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('is empty when storage is unavailable, and writing does not throw', () => {
    expect(readEndingsFound('s')).toEqual([])
    expect(() => writeEndingsFound('s', ['tired'])).not.toThrow()
  })

  it('keeps each story separately', () => {
    const storage = memoryStorage()
    vi.stubGlobal('window', { sessionStorage: storage })
    writeEndingsFound('s', ['tired'])
    writeEndingsFound('other', ['x', 'y'])
    expect(readEndingsFound('s')).toEqual(['tired'])
    expect(readEndingsFound('other')).toEqual(['x', 'y'])
    expect(JSON.parse(storage.data.get(ENDINGS_FOUND_KEY) ?? '')).toEqual({
      s: ['tired'],
      other: ['x', 'y'],
    })
  })

  it('ignores stored values that are not a list of ids', () => {
    vi.stubGlobal('window', {
      sessionStorage: memoryStorage({ [ENDINGS_FOUND_KEY]: '{"s": "tired", "t": [1, "ok"]}' }),
    })
    expect(readEndingsFound('s')).toEqual([])
    expect(readEndingsFound('t')).toEqual(['ok'])

    vi.stubGlobal('window', { sessionStorage: memoryStorage({ [ENDINGS_FOUND_KEY]: 'not json' }) })
    expect(readEndingsFound('s')).toEqual([])
  })
})

describe('scenarios finished and the shared lesson', () => {
  afterEach(() => vi.unstubAllGlobals())
  const other: Story = { ...story, id: 'other' }

  it('counts a scenario as finished once one of its reachable endings is found', () => {
    expect(isFinished(story, [])).toBe(false)
    expect(isFinished(story, ['orphan'])).toBe(false)
    expect(isFinished(story, ['rested'])).toBe(true)
  })

  it('reads which scenarios are finished in this tab', () => {
    vi.stubGlobal('window', { sessionStorage: memoryStorage() })
    expect(readFinished([story, other])).toEqual(new Set())
    writeEndingsFound('other', ['tired'])
    expect(readFinished([story, other])).toEqual(new Set(['other']))
  })

  it('remembers that the lesson was revealed, and is safe without storage', () => {
    expect(readMoralRevealed()).toBe(false)
    expect(() => writeMoralRevealed()).not.toThrow()

    const storage = memoryStorage()
    vi.stubGlobal('window', { sessionStorage: storage })
    expect(readMoralRevealed()).toBe(false)
    writeMoralRevealed()
    expect(readMoralRevealed()).toBe(true)
    expect(storage.data.get(MORAL_REVEALED_KEY)).toBe('revealed')
  })
})
