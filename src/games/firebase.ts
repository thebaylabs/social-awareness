/**
 * The site's one Firebase connection, shared by the doodle leaderboard and the
 * Shabd Khoj streak leaderboard. Firebase is loaded only when a leaderboard
 * needs it, and only when the build has Firebase settings (see .env.example).
 */

export type FirestoreLite = typeof import('firebase/firestore/lite')

export interface FirestoreConnection {
  db: import('firebase/firestore/lite').Firestore
  fs: FirestoreLite
}

export function firebaseConfig(env: Record<string, string | undefined>) {
  const apiKey = env.VITE_FIREBASE_API_KEY?.trim()
  const projectId = env.VITE_FIREBASE_PROJECT_ID?.trim()
  if (!apiKey || !projectId) return null
  return {
    apiKey,
    projectId,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || `${projectId}.firebaseapp.com`,
    appId: env.VITE_FIREBASE_APP_ID?.trim() || undefined,
  }
}

export type FirebaseConfig = NonNullable<ReturnType<typeof firebaseConfig>>

let shared: Promise<FirestoreConnection> | null = null

/** Firestore for this page. Firebase allows one app per page, so every leaderboard shares it. */
export function connectFirestore(config: FirebaseConfig): Promise<FirestoreConnection> {
  if (!shared) {
    shared = Promise.all([import('firebase/app'), import('firebase/firestore/lite')]).then(
      ([{ initializeApp }, fs]) => ({ db: fs.getFirestore(initializeApp(config)), fs }),
      (error: unknown) => {
        shared = null
        throw error
      },
    )
  }
  return shared
}
