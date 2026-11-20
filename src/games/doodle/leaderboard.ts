import { connectFirestore, firebaseConfig, type FirebaseConfig } from '../firebase'
import { nameKey } from './name'

/**
 * The all-time doodle leaderboard: each player's best score ever, keyed by
 * name. Stored in Firestore at doodlePlayers/<name key> (see firestore.rules
 * for what visitors may write).
 */

export const TOP_COUNT = 3
export const PLAYERS_COLLECTION = 'doodlePlayers'

export interface LeaderboardEntry {
  name: string
  score: number
}

export interface LeaderboardSnapshot {
  top: LeaderboardEntry[]
  /** Number of different names that have ever played. */
  players: number
}

export interface Leaderboard {
  /** Record a score; keeps only the name's best score. */
  submit(name: string, score: number): Promise<void>
  read(): Promise<LeaderboardSnapshot>
}

/** Keeps scores for this page visit only. Used by the dev server when Firebase is not set up. */
export function memoryLeaderboard(): Leaderboard {
  const players = new Map<string, LeaderboardEntry>()
  return {
    async submit(name, score) {
      const key = nameKey(name)
      if (score > (players.get(key)?.score ?? -1)) players.set(key, { name, score })
    },
    async read() {
      const all = [...players.values()]
      return {
        top: all.sort((a, b) => b.score - a.score).slice(0, TOP_COUNT),
        players: all.length,
      }
    },
  }
}

async function firestoreLeaderboard(config: FirebaseConfig): Promise<Leaderboard> {
  const { db, fs } = await connectFirestore(config)
  const players = fs.collection(db, PLAYERS_COLLECTION)

  return {
    async submit(name, score) {
      const ref = fs.doc(players, nameKey(name))
      await fs.runTransaction(db, async (tx) => {
        const current = await tx.get(ref)
        const best = current.exists() ? Number(current.get('score')) : -1
        if (score > best) tx.set(ref, { name, score, updatedAt: fs.serverTimestamp() })
      })
    },
    async read() {
      const [top, count] = await Promise.all([
        fs.getDocs(fs.query(players, fs.orderBy('score', 'desc'), fs.limit(TOP_COUNT))),
        fs.getCount(players),
      ])
      return {
        top: top.docs.map((d) => ({ name: String(d.get('name')), score: Number(d.get('score')) })),
        players: count.data().count,
      }
    },
  }
}

let shared: Promise<Leaderboard | null> | null = null

/** The leaderboard for this build, or null when Firebase is not set up (production only). */
export function getLeaderboard(): Promise<Leaderboard | null> {
  if (!shared) {
    const config = firebaseConfig(import.meta.env)
    shared = config
      ? firestoreLeaderboard(config).catch((error: unknown) => {
          shared = null
          throw error
        })
      : Promise.resolve(import.meta.env.DEV ? memoryLeaderboard() : null)
  }
  return shared
}
