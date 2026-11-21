/**
 * Small wrappers around localStorage. Storage can be unavailable (private
 * windows, blocked site data), so every access is guarded and failure is
 * silent: the site works the same, it just does not remember.
 *
 * localStorage holds the language choice and the shared diya progress
 * (see STORAGE_KEYS). Nothing else may be stored.
 */
export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore: storage is a convenience only.
  }
}

export function removeStored(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore.
  }
}
