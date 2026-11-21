import { useEffect, useState } from 'react'
import { DIYA_GOAL } from '../config/site'
import { siteCrowd } from './crowd'

const crowd = siteCrowd()

/** How often to re-read the count while waiting. */
const POLL_MS = 1000

export interface DiyaCrowd {
  /** Always true: progress is set from `/admin`. */
  enabled: boolean
  /** Shared progress, or null until the first read after lighting. */
  count: number | null
  goal: number
  /** True once the goal is reached. */
  complete: boolean
}

/**
 * Once this device's diya is lit: read the shared progress (set on `/admin`)
 * until the goal is reached. The bar stays hidden until `lit`.
 */
export function useDiyaCrowd(lit: boolean): DiyaCrowd {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (!lit) return
    let stopped = false
    let timer: number | undefined

    async function ask() {
      try {
        const total = await crowd.readCount()
        if (stopped) return
        setCount(total)
        if (total >= DIYA_GOAL) {
          stopped = true
          return
        }
      } catch {
        // ignore and poll again
      }
      if (!stopped) timer = window.setTimeout(ask, POLL_MS)
    }

    const unsubscribe = crowd.subscribe((total) => {
      if (stopped) return
      setCount(total)
      if (total >= DIYA_GOAL) {
        stopped = true
        window.clearTimeout(timer)
      }
    })

    void ask()
    return () => {
      stopped = true
      window.clearTimeout(timer)
      unsubscribe()
    }
  }, [lit])

  return { enabled: true, count, goal: DIYA_GOAL, complete: count !== null && count >= DIYA_GOAL }
}
