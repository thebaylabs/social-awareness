import { DIYA_GOAL, STORAGE_KEYS } from '../config/site'
import { readStored, writeStored } from '../i18n/storage'

/**
 * Shared diya progress, set from `/admin` and read on the public page after
 * lighting. Stored in localStorage so no cloud project is required. Other tabs
 * on the same browser pick up changes via `storage` and BroadcastChannel.
 */
export interface Crowd {
  readCount(): Promise<number>
  setCount(n: number): Promise<void>
  /** Subscribe to count changes. Returns unsubscribe. */
  subscribe(listener: (count: number) => void): () => void
}

const CHANNEL = 'outreach.diya.count'

/** Clamp to an integer in 0..DIYA_GOAL. Non-finite values become 0. */
export function clampCount(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(DIYA_GOAL, Math.round(n)))
}

function readLocal(): number {
  const raw = readStored(STORAGE_KEYS.diyaCount)
  if (raw === null) return 0
  const n = Number(raw)
  return Number.isInteger(n) && n >= 0 ? Math.min(n, DIYA_GOAL) : 0
}

function writeLocal(n: number): number {
  const count = clampCount(n)
  writeStored(STORAGE_KEYS.diyaCount, String(count))
  return count
}

let shared: Crowd | null = null

/** Local shared count: always available; no cloud project required. */
export function localCrowd(): Crowd {
  if (shared) return shared

  const listeners = new Set<(count: number) => void>()
  let bc: BroadcastChannel | null = null
  try {
    if (typeof BroadcastChannel !== 'undefined') bc = new BroadcastChannel(CHANNEL)
  } catch {
    bc = null
  }

  function emit(count: number) {
    for (const listener of listeners) listener(count)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEYS.diyaCount) return
      emit(readLocal())
    })
  }

  bc?.addEventListener('message', (event) => {
    emit(clampCount(Number(event.data)))
  })

  shared = {
    async readCount() {
      return readLocal()
    },
    async setCount(n) {
      const count = writeLocal(n)
      emit(count)
      try {
        bc?.postMessage(count)
      } catch {
        // ignore
      }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
  return shared
}

/** The count this build uses. Always the local shared store. */
export function siteCrowd(): Crowd {
  return localCrowd()
}
