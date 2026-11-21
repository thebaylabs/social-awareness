import { afterEach, describe, expect, it, vi } from 'vitest'
import { clampCount, localCrowd } from './crowd'
import { STORAGE_KEYS } from '../config/site'

const memory = new Map<string, string>()

const localStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value)
  },
  removeItem: (key: string) => {
    memory.delete(key)
  },
}

vi.stubGlobal('localStorage', localStorage)
vi.stubGlobal('window', {
  localStorage,
  addEventListener() {},
})

vi.stubGlobal(
  'BroadcastChannel',
  class {
    postMessage() {}
    addEventListener() {}
    close() {}
  },
)

afterEach(() => {
  memory.clear()
})

describe('clampCount', () => {
  it('keeps values between 0 and the goal', () => {
    expect(clampCount(-3)).toBe(0)
    expect(clampCount(37.4)).toBe(37)
    expect(clampCount(200)).toBe(100)
    expect(clampCount(Number.NaN)).toBe(0)
  })
})

describe('localCrowd', () => {
  it('starts at zero and stores the value set from admin', async () => {
    const crowd = localCrowd()
    expect(await crowd.readCount()).toBe(0)
    await crowd.setCount(42)
    expect(await crowd.readCount()).toBe(42)
    expect(memory.get(STORAGE_KEYS.diyaCount)).toBe('42')
  })

  it('notifies subscribers when the count changes', async () => {
    const crowd = localCrowd()
    const seen: number[] = []
    const stop = crowd.subscribe((n) => seen.push(n))
    await crowd.setCount(7)
    await crowd.setCount(7)
    stop()
    await crowd.setCount(8)
    expect(seen).toEqual([7, 7])
  })
})
