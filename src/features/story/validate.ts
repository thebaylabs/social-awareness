import type { Story } from '../../content/schemas'

export interface StoryCheck {
  /** Problems that stop the story from being shown (and fail the build). */
  errors: string[]
  /** Things worth fixing that do not stop the story. */
  warnings: string[]
}

/** Recommended number of steps (screens) on each path from the start to an ending. */
export const STEP_GUIDELINE = { min: 3, max: 5 }

/**
 * Check a story's structure. Pure, so the validation script and the player
 * use exactly the same rules. The player refuses to show a story with errors.
 */
export function validateStory(story: Story): StoryCheck {
  const errors: string[] = []
  const warnings: string[] = []
  const byId = new Map<string, Story['nodes'][number]>()

  for (const node of story.nodes) {
    if (byId.has(node.id)) errors.push(`node "${node.id}" is defined more than once`)
    byId.set(node.id, node)
  }

  if (!byId.has(story.startNode)) errors.push(`startNode "${story.startNode}" does not exist`)

  for (const node of story.nodes) {
    const hasChoices = node.choices !== undefined
    const hasEnding = node.ending !== undefined
    if (hasChoices === hasEnding) {
      errors.push(`node "${node.id}" must have exactly one of "choices" or "ending"`)
    }
    if (hasChoices && node.choices!.length === 0) {
      errors.push(`node "${node.id}" has an empty "choices" list`)
    }
    if (node.image && node.video) {
      errors.push(`node "${node.id}" has both an image and a video; use one`)
    }
    for (const choice of node.choices ?? []) {
      if (!byId.has(choice.next)) {
        errors.push(`node "${node.id}" has a choice pointing to missing node "${choice.next}"`)
      }
    }
  }

  // Every node must be able to reach an ending (no dead ends, no closed loops).
  const canEnd = new Set<string>()
  let changed = true
  for (const node of story.nodes) if (node.ending) canEnd.add(node.id)
  while (changed) {
    changed = false
    for (const node of story.nodes) {
      if (canEnd.has(node.id)) continue
      if ((node.choices ?? []).some((c) => canEnd.has(c.next))) {
        canEnd.add(node.id)
        changed = true
      }
    }
  }
  for (const node of story.nodes) {
    if (!canEnd.has(node.id)) errors.push(`node "${node.id}" cannot reach an ending`)
  }

  if (errors.length > 0) return { errors, warnings }

  // Unreachable nodes and path length are only warnings.
  const reachable = new Set<string>()
  const queue = [story.startNode]
  while (queue.length > 0) {
    const id = queue.shift() as string
    if (reachable.has(id)) continue
    reachable.add(id)
    for (const c of byId.get(id)?.choices ?? []) queue.push(c.next)
  }
  for (const node of story.nodes) {
    if (!reachable.has(node.id)) warnings.push(`node "${node.id}" cannot be reached from the start`)
  }

  // A Yuvako scenario lists its endings by title once they are found.
  if (story.audience === 'yuvako') {
    for (const node of story.nodes) {
      if (node.ending && !node.ending.title) {
        warnings.push(
          `ending "${node.id}" has no "title"; the list of endings found shows a number`,
        )
      }
    }
  }

  const lengths: number[] = []
  const walk = (id: string, seen: string[]) => {
    const node = byId.get(id)
    if (!node || seen.includes(id)) return
    const path = [...seen, id]
    if (node.ending) lengths.push(path.length)
    for (const c of node.choices ?? []) walk(c.next, path)
  }
  walk(story.startNode, [])
  const shortest = Math.min(...lengths)
  const longest = Math.max(...lengths)
  if (shortest < STEP_GUIDELINE.min || longest > STEP_GUIDELINE.max) {
    warnings.push(
      `paths run from ${shortest} to ${longest} steps; the guideline is ${STEP_GUIDELINE.min} to ${STEP_GUIDELINE.max}`,
    )
  }

  return { errors, warnings }
}
