import pillsRaw from '../../content/pills.json'
import wordsRaw from '../../content/words.json'
import doodleRaw from '../../content/doodle-items.json'
import type { GameId } from '../config/sections'
import {
  doodle as doodleSchema,
  pills as pillsSchema,
  words as wordsSchema,
  type DoodleContent,
  type Pills,
  type WordEntry,
} from './schemas'

/** A game content file after schema checking: the data, or the problems that stop it loading. */
export type Loaded<T> = { data: T; errors: [] } | { data: null; errors: string[] }

function problems(error: { issues: { path: PropertyKey[]; message: string }[] }): string[] {
  return error.issues.map((i) => `${i.path.map(String).join('.') || '(file)'}: ${i.message}`)
}

function load<T>(
  schema: {
    safeParse: (
      v: unknown,
    ) =>
      | { success: true; data: T }
      | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } }
  },
  raw: unknown,
): Loaded<T> {
  const parsed = schema.safeParse(raw)
  return parsed.success
    ? { data: parsed.data, errors: [] }
    : { data: null, errors: problems(parsed.error) }
}

export const PILLS: Loaded<Pills> = load(pillsSchema, pillsRaw)

/** The pill game shows placeholder content while any red card, the blue section or any green page is a placeholder. */
export function pillsArePlaceholder(data: Pills | null = PILLS.data): boolean {
  return (
    !data ||
    data.blue.placeholder ||
    data.cards.some((c) => c.placeholder) ||
    data.green.pages.some((p) => p.placeholder)
  )
}

export const WORDS: Loaded<{ words: WordEntry[] }> = load(wordsSchema, wordsRaw)

export const DOODLE: Loaded<DoodleContent> = load(doodleSchema, doodleRaw)

/** Whether a game currently shows placeholder content (for badges and the preview strip). */
export function gameIsPlaceholder(id: GameId): boolean {
  switch (id) {
    case 'pills':
      return pillsArePlaceholder()
    case 'words':
      return !WORDS.data || WORDS.data.words.some((w) => w.placeholder)
    case 'doodle':
      return !DOODLE.data || DOODLE.data.items.some((i) => i.placeholder)
    case 'temple':
      return false
  }
}
