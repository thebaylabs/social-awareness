import { describe, expect, it } from 'vitest'
import { memoryStreakBoard } from './streakBoard'

const riya = { id: 'riya0000000000000000', name: 'Riya' }
const aarav = { id: 'aarav000000000000000', name: 'Aarav' }
const DAY = 20_000

describe('memoryStreakBoard()', () => {
  it('counts consecutive daily wins and ranks running streaks', async () => {
    const board = memoryStreakBoard()
    expect(await board.record(riya, DAY, true)).toEqual({ streak: 1, lastDay: DAY })
    expect(await board.record(riya, DAY + 1, true)).toEqual({ streak: 2, lastDay: DAY + 1 })
    await board.record(aarav, DAY + 1, true)

    expect(await board.top(DAY + 1)).toEqual([
      { id: riya.id, name: 'Riya', streak: 2, lastDay: DAY + 1 },
      { id: aarav.id, name: 'Aarav', streak: 1, lastDay: DAY + 1 },
    ])
  })

  it('keeps the streak when the same day is counted again with a new name', async () => {
    const board = memoryStreakBoard()
    await board.record(riya, DAY, true)
    expect(await board.record({ ...riya, name: 'Riyu' }, DAY, true)).toEqual({
      streak: 1,
      lastDay: DAY,
    })
    expect((await board.top(DAY)).map((e) => e.name)).toEqual(['Riyu'])
  })

  it('leaves out a lost streak and one with a missed day', async () => {
    const board = memoryStreakBoard()
    await board.record(riya, DAY, true)
    await board.record(riya, DAY + 1, false)
    await board.record(aarav, DAY, true)
    expect(await board.top(DAY + 1)).toEqual([
      { id: aarav.id, name: 'Aarav', streak: 1, lastDay: DAY },
    ])
    expect(await board.top(DAY + 2)).toEqual([])
  })
})
