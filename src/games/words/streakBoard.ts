import { connectFirestore, firebaseConfig, type FirestoreConnection } from '../firebase'
import type { Player } from './player'
import {
  BOARD_SIZE,
  rankStreaks,
  recordDaily,
  runningDays,
  type StreakEntry,
  type StreakRecord,
} from './streak'

/**
 * The Shabd Khoj streak leaderboard, shared by every visitor. Stored in
 * Firestore at wordStreaks/<player id> as { name, streak, lastDay, updatedAt }
 * (see firestore.rules for what visitors may write, and
 * firestore.indexes.json for the index the board's query needs).
 */

export const STREAKS_COLLECTION = 'wordStreaks'

export interface StreakBoard {
  /**
   * Count the player's daily game for `day`, save their name with it, and
   * return their record. Counting the same day again only updates the name.
   */
  record(player: Player, day: number, won: boolean): Promise<StreakRecord>
  /** The longest streaks still running on `today`. */
  top(today: number): Promise<StreakEntry[]>
}

/** Keeps streaks for this page visit only. Used by the dev server when Firebase is not set up. */
export function memoryStreakBoard(): StreakBoard {
  const players = new Map<string, StreakEntry>()
  return {
    async record(player, day, won) {
      const { streak, lastDay } = recordDaily(players.get(player.id) ?? null, day, won)
      players.set(player.id, { id: player.id, name: player.name, streak, lastDay })
      return { streak, lastDay }
    },
    async top(today) {
      return rankStreaks([...players.values()], today)
    },
  }
}

function readEntry(id: string, data: Record<string, unknown>): StreakEntry | null {
  const { name, streak, lastDay } = data
  if (typeof name !== 'string' || !Number.isInteger(streak) || !Number.isInteger(lastDay)) {
    return null
  }
  return { id, name, streak: streak as number, lastDay: lastDay as number }
}

export function firestoreStreakBoard({ db, fs }: FirestoreConnection): StreakBoard {
  const streaks = fs.collection(db, STREAKS_COLLECTION)
  return {
    record(player, day, won) {
      const ref = fs.doc(streaks, player.id)
      return fs.runTransaction(db, async (tx) => {
        const current = await tx.get(ref)
        const saved = current.exists() ? readEntry(current.id, current.data()) : null
        const { streak, lastDay } = recordDaily(saved, day, won)
        const unchanged =
          saved?.name === player.name && saved.streak === streak && saved.lastDay === lastDay
        if (!unchanged) {
          tx.set(ref, { name: player.name, streak, lastDay, updatedAt: fs.serverTimestamp() })
        }
        return { streak, lastDay }
      })
    },
    async top(today) {
      // Streaks that ended at 0 sort last, so the first BOARD_SIZE results hold every running one needed.
      const snapshot = await fs.getDocs(
        fs.query(
          streaks,
          fs.where('lastDay', 'in', runningDays(today)),
          fs.orderBy('streak', 'desc'),
          fs.limit(BOARD_SIZE),
        ),
      )
      const entries = snapshot.docs.flatMap((d) => readEntry(d.id, d.data()) ?? [])
      return rankStreaks(entries, today)
    },
  }
}

/** True when this build can show the board (Firebase is set up, or this is the dev server). */
export function streakBoardAvailable(): boolean {
  return import.meta.env.DEV || firebaseConfig(import.meta.env) !== null
}

let shared: Promise<StreakBoard | null> | null = null

/** The streak board for this build, or null when Firebase is not set up (production only). */
export function getStreakBoard(): Promise<StreakBoard | null> {
  if (!shared) {
    const config = firebaseConfig(import.meta.env)
    shared = config
      ? connectFirestore(config).then(firestoreStreakBoard, (error: unknown) => {
          shared = null
          throw error
        })
      : Promise.resolve(import.meta.env.DEV ? memoryStreakBoard() : null)
  }
  return shared
}
