import { COOKIES } from '../../config/site'
import { checkName } from '../doodle/name'

/**
 * A Shabd Khoj player on this browser: a random id and the name they chose
 * for the streak leaderboard. Both live in one first-party cookie, so the
 * name is asked for only once per browser.
 */
export interface Player {
  /** 20 random letters and digits; the player's document id in Firestore. */
  id: string
  name: string
}

/** Browsers keep a cookie for at most 400 days, so it is renewed on every visit. */
export const PLAYER_COOKIE_MAX_AGE = 400 * 24 * 60 * 60

const ID_LENGTH = 20
const ID_PATTERN = /^[a-z0-9]{20}$/
const ID_LETTERS = 'abcdefghijklmnopqrstuvwxyz0123456789'

/**
 * A new random player id. Uses getRandomValues, which works on plain http too
 * (unlike randomUUID), and skips bytes that would make some letters likelier.
 */
export function newPlayerId(
  fill: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array = (bytes) => crypto.getRandomValues(bytes),
): string {
  const limit = 256 - (256 % ID_LETTERS.length)
  let id = ''
  while (id.length < ID_LENGTH) {
    for (const byte of fill(new Uint8Array(32))) {
      if (byte < limit && id.length < ID_LENGTH) id += ID_LETTERS[byte % ID_LETTERS.length]
    }
  }
  return id
}

/** The player saved in a Cookie header (document.cookie), or null when there is none or it is damaged. */
export function parsePlayerCookie(cookies: string): Player | null {
  for (const part of cookies.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key !== COOKIES.wordsPlayer) continue
    const value = rest.join('=')
    const dot = value.indexOf('.')
    const id = value.slice(0, dot)
    if (dot < 0 || !ID_PATTERN.test(id)) return null
    let name: string
    try {
      name = decodeURIComponent(value.slice(dot + 1))
    } catch {
      return null
    }
    const check = checkName(name)
    return check.ok ? { id, name: check.name } : null
  }
  return null
}

/** The Set-Cookie text that saves a player: first-party, sent only to this site's pages. */
export function playerCookie(player: Player, options: { secure: boolean; path: string }): string {
  return [
    `${COOKIES.wordsPlayer}=${player.id}.${encodeURIComponent(player.name)}`,
    `Max-Age=${PLAYER_COOKIE_MAX_AGE}`,
    `Path=${options.path}`,
    'SameSite=Lax',
    ...(options.secure ? ['Secure'] : []),
  ].join('; ')
}

/** The player saved on this browser. Cookies can be blocked, so failure means "no player". */
export function readPlayer(): Player | null {
  try {
    return parsePlayerCookie(document.cookie)
  } catch {
    return null
  }
}

/** Save (or renew) the player's cookie. */
export function savePlayer(player: Player): void {
  try {
    document.cookie = playerCookie(player, {
      secure: window.location.protocol === 'https:',
      path: import.meta.env.BASE_URL,
    })
  } catch {
    // Ignore: without cookies the name is asked for again next time.
  }
}
