import { describe, expect, it } from 'vitest'
import { firebaseConfig } from '../firebase'
import { memoryLeaderboard } from './leaderboard'

describe('firebaseConfig()', () => {
  it('needs an API key and a project id', () => {
    expect(firebaseConfig({})).toBeNull()
    expect(firebaseConfig({ VITE_FIREBASE_API_KEY: 'k' })).toBeNull()
    expect(firebaseConfig({ VITE_FIREBASE_API_KEY: 'k', VITE_FIREBASE_PROJECT_ID: 'p' })).toEqual({
      apiKey: 'k',
      projectId: 'p',
      authDomain: 'p.firebaseapp.com',
      appId: undefined,
    })
  })
})

describe('leaderboard', () => {
  it("keeps each name's best score and shows the top three of all time", async () => {
    const board = memoryLeaderboard()
    await board.submit('Riya', 4)
    await board.submit('riya', 2)
    await board.submit('Aarav', 9)
    await board.submit('Meera', 6)
    await board.submit('Dev', 1)

    expect(await board.read()).toEqual({
      top: [
        { name: 'Aarav', score: 9 },
        { name: 'Meera', score: 6 },
        { name: 'Riya', score: 4 },
      ],
      players: 4,
    })
  })

  it('raises a name to its new best score', async () => {
    const board = memoryLeaderboard()
    await board.submit('Riya', 4)
    await board.submit('Riya', 12)
    expect((await board.read()).top).toEqual([{ name: 'Riya', score: 12 }])
  })

  it('counts a player who scored zero', async () => {
    const board = memoryLeaderboard()
    await board.submit('Riya', 0)
    expect((await board.read()).players).toBe(1)
  })
})
