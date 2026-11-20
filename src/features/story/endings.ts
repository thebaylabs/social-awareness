import type { LocalizedTextData, Story, StoryNode } from '../../content/schemas'
import type { StoryHistory } from './state'

/**
 * Endings that can be reached from the start, in the order they appear in the
 * story file. An ending nobody can reach is left out, so "every ending found"
 * is always possible.
 */
export function reachableEndings(story: Story): StoryNode[] {
  const byId = new Map(story.nodes.map((node) => [node.id, node]))
  const reachable = new Set<string>()
  const queue = [story.startNode]
  while (queue.length > 0) {
    const id = queue.shift() as string
    if (reachable.has(id)) continue
    reachable.add(id)
    for (const choice of byId.get(id)?.choices ?? []) queue.push(choice.next)
  }
  return story.nodes.filter((node) => node.ending && reachable.has(node.id))
}

/** The label of each choice taken along the path, oldest first. */
export function choicesTaken(story: Story, history: StoryHistory): LocalizedTextData[] {
  const byId = new Map(story.nodes.map((node) => [node.id, node]))
  const labels: LocalizedTextData[] = []
  for (let i = 0; i < history.length - 1; i++) {
    const next = history[i + 1]
    const choice = byId.get(history[i] ?? '')?.choices?.find((c) => c.next === next)
    if (choice) labels.push(choice.label)
  }
  return labels
}

/**
 * sessionStorage key for the scenario endings found in this browser tab, as
 * { "<story id>": ["<ending node id>", …] }. It is cleared when the tab
 * closes. With MORAL_REVEALED_KEY, this is all the site keeps in sessionStorage.
 */
export const ENDINGS_FOUND_KEY = 'outreach.scenario.endings'

/** sessionStorage key set to "revealed" once the shared lesson has been revealed in this tab. */
export const MORAL_REVEALED_KEY = 'outreach.scenario.moral'

function readAll(): Record<string, unknown> {
  try {
    const raw = window.sessionStorage.getItem(ENDINGS_FOUND_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

/** Ending ids found so far for a story. Empty when storage is unavailable. */
export function readEndingsFound(storyId: string): string[] {
  const ids = readAll()[storyId]
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []
}

export function writeEndingsFound(storyId: string, ids: readonly string[]): void {
  try {
    const all = readAll()
    all[storyId] = ids
    window.sessionStorage.setItem(ENDINGS_FOUND_KEY, JSON.stringify(all))
  } catch {
    // Ignore: the count is a convenience only.
  }
}

/** True when at least one ending of the story has been found in this tab. */
export function isFinished(story: Story, found: readonly string[]): boolean {
  return reachableEndings(story).some((ending) => found.includes(ending.id))
}

/** The stories, of those given, with at least one ending found in this tab. */
export function readFinished(stories: readonly Story[]): Set<string> {
  return new Set(stories.filter((s) => isFinished(s, readEndingsFound(s.id))).map((s) => s.id))
}

export function readMoralRevealed(): boolean {
  try {
    return window.sessionStorage.getItem(MORAL_REVEALED_KEY) === 'revealed'
  } catch {
    return false
  }
}

export function writeMoralRevealed(): void {
  try {
    window.sessionStorage.setItem(MORAL_REVEALED_KEY, 'revealed')
  } catch {
    // Ignore: without storage the lesson is simply revealed again next time.
  }
}
