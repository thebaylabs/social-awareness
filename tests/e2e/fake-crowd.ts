import type { Page } from '@playwright/test'

/**
 * Seeds the shared diya progress in localStorage before the page loads
 * (src/crowd/crowd.ts). Mutate `count` during a test; the public page polls
 * and also listens for storage / BroadcastChannel updates.
 */
export interface FakeCrowd {
  /** Shared progress value (as if set from `/admin`). */
  get count(): number
  set count(value: number)
}

const KEY = 'outreach.diya.count'

export async function fakeCrowd(page: Page, count: number): Promise<FakeCrowd> {
  let current = count
  await page.addInitScript(
    ({ key, value }) => {
      try {
        localStorage.setItem(key, String(value))
      } catch {
        // ignore
      }
    },
    { key: KEY, value: count },
  )

  return {
    get count() {
      return current
    },
    set count(value: number) {
      current = value
      void page.evaluate(
        ({ key, next }) => {
          localStorage.setItem(key, String(next))
          try {
            new BroadcastChannel('outreach.diya.count').postMessage(next)
          } catch {
            // ignore
          }
          window.dispatchEvent(
            new StorageEvent('storage', { key, newValue: String(next) }),
          )
        },
        { key: KEY, next: value },
      )
    },
  }
}
