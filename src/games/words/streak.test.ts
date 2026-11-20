import { describe, expect, it } from 'vitest'
import { dailyIndex, localDayNumber } from './logic'
import {
  BOARD_SIZE,
  currentStreak,
  rankStreaks,
  recordDaily,
  runningDays,
  type StreakEntry,
} from './streak'

/** Local day numbers for 14, 15, 16 and 18 November 2026 (10 a.m.). */
const DAY = localDayNumber(new Date(2026, 10, 14, 10))
const [d14, d15, d16, d18] = [DAY, DAY + 1, DAY + 2, DAY + 4]

describe('recordDaily()', () => {
  it('starts a streak at 1 on a first win, and at 0 on a first loss', () => {
    expect(recordDaily(null, d14, true)).toEqual({ streak: 1, lastDay: d14 })
    expect(recordDaily(null, d14, false)).toEqual({ streak: 0, lastDay: d14 })
  })

  it('adds one for a win on the next day', () => {
    const first = recordDaily(null, d14, true)
    const second = recordDaily(first, d15, true)
    expect(second).toEqual({ streak: 2, lastDay: d15 })
    expect(recordDaily(second, d16, true)).toEqual({ streak: 3, lastDay: d16 })
  })

  it('starts again at 1 after a missed day', () => {
    expect(recordDaily({ streak: 5, lastDay: d14 }, d16, true)).toEqual({ streak: 1, lastDay: d16 })
  })

  it('ends the streak at 0 on a loss, and starts again at 1 with the next win', () => {
    const lost = recordDaily({ streak: 5, lastDay: d14 }, d15, false)
    expect(lost).toEqual({ streak: 0, lastDay: d15 })
    expect(recordDaily(lost, d16, true)).toEqual({ streak: 1, lastDay: d16 })
  })

  it('counts a day only once, so a reload changes nothing', () => {
    const won = { streak: 3, lastDay: d15 }
    expect(recordDaily(won, d15, true)).toEqual(won)
    expect(recordDaily(won, d15, false)).toEqual(won)
  })

  it('returns only the streak and day, even when given a whole leaderboard entry', () => {
    const entry = { id: 'riya0000000000000000', name: 'Riya', streak: 3, lastDay: d15 }
    expect(recordDaily(entry, d15, true)).toStrictEqual({ streak: 3, lastDay: d15 })
    expect(recordDaily(entry, d16, true)).toStrictEqual({ streak: 4, lastDay: d16 })
  })

  it('ignores an earlier day, as after a clock change', () => {
    const won = { streak: 3, lastDay: d15 }
    expect(recordDaily(won, d14, true)).toEqual(won)
  })

  it('uses the same day numbers that pick the daily word', () => {
    // Midnight in the visitor's time zone is the start of the next day and the next word.
    const evening = new Date(2026, 10, 14, 23, 59)
    const morning = new Date(2026, 10, 15, 0, 1)
    expect(localDayNumber(morning)).toBe(localDayNumber(evening) + 1)
    expect(dailyIndex(morning, 12)).toBe((dailyIndex(evening, 12) + 1) % 12)
    const first = recordDaily(null, localDayNumber(evening), true)
    expect(recordDaily(first, localDayNumber(morning), true).streak).toBe(2)
  })
})

describe('currentStreak()', () => {
  it('keeps a streak running while today’s word can still extend it', () => {
    expect(currentStreak({ streak: 4, lastDay: d15 }, d15)).toBe(4)
    expect(currentStreak({ streak: 4, lastDay: d15 }, d16)).toBe(4)
  })

  it('counts a player already on tomorrow’s date in a time zone ahead', () => {
    expect(currentStreak({ streak: 4, lastDay: d16 }, d15)).toBe(4)
  })

  it('drops a streak once a whole day has been missed', () => {
    expect(currentStreak({ streak: 4, lastDay: d14 }, d16)).toBe(0)
    expect(currentStreak({ streak: 4, lastDay: d14 }, d18)).toBe(0)
  })

  it('is 0 after a loss', () => {
    expect(currentStreak({ streak: 0, lastDay: d16 }, d16)).toBe(0)
  })
})

describe('runningDays()', () => {
  it('is yesterday, today and tomorrow', () => {
    expect(runningDays(d15)).toEqual([d14, d15, d16])
  })
})

describe('rankStreaks()', () => {
  const entry = (name: string, streak: number, lastDay: number): StreakEntry => ({
    id: name.toLowerCase().padEnd(20, '0'),
    name,
    streak,
    lastDay,
  })

  it('lists running streaks only, longest first, then by name', () => {
    const entries = [
      entry('Meera', 3, d16),
      entry('Old', 40, d14), // missed d15
      entry('Riya', 5, d15),
      entry('Lost', 0, d16),
      entry('Aarav', 3, d16),
    ]
    expect(rankStreaks(entries, d16).map((e) => [e.name, e.streak])).toEqual([
      ['Riya', 5],
      ['Aarav', 3],
      ['Meera', 3],
    ])
  })

  it(`shows at most ${BOARD_SIZE} players`, () => {
    const many = Array.from({ length: 15 }, (_, i) => entry(`P${'abcdefghijklmno'[i]}`, i + 1, d16))
    const top = rankStreaks(many, d16)
    expect(top).toHaveLength(BOARD_SIZE)
    expect(top[0]?.streak).toBe(15)
    expect(top.at(-1)?.streak).toBe(6)
  })
})
