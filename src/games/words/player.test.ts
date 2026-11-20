import { describe, expect, it } from 'vitest'
import { PLAYER_COOKIE_MAX_AGE, newPlayerId, parsePlayerCookie, playerCookie } from './player'

const ID = 'abcdefghij0123456789'

describe('newPlayerId()', () => {
  it('makes 20 lowercase letters and digits', () => {
    expect(newPlayerId()).toMatch(/^[a-z0-9]{20}$/)
    expect(newPlayerId()).not.toBe(newPlayerId())
  })

  it('skips bytes that would favour some letters', () => {
    // 252 and above would wrap round to "a"–"d" again; they must be skipped, not used.
    const batches = [
      new Uint8Array(32).fill(255),
      Uint8Array.from({ length: 32 }, (_, i) => (i === 0 ? 37 : i === 1 ? 251 : 0)),
    ]
    let call = 0
    expect(newPlayerId(() => batches[call++]!)).toBe('b9' + 'a'.repeat(18))
    expect(call).toBe(2)
  })
})

describe('playerCookie() and parsePlayerCookie()', () => {
  it('round-trips a name in any script', () => {
    for (const name of ['Riya', 'Mary Ann', 'રિયા', 'आरव']) {
      const cookie = playerCookie({ id: ID, name }, { secure: false, path: '/' })
      const header = `outreach.lang=gu; ${cookie.split(';')[0]}; other=1`
      expect(parsePlayerCookie(header)).toEqual({ id: ID, name })
    }
  })

  it('is long-lived, first-party and limited to the site’s path', () => {
    const cookie = playerCookie({ id: ID, name: 'Riya' }, { secure: true, path: '/ak_outreach/' })
    expect(cookie).toBe(
      `outreach_words_player=${ID}.Riya; Max-Age=${PLAYER_COOKIE_MAX_AGE}; Path=/ak_outreach/; SameSite=Lax; Secure`,
    )
    expect(PLAYER_COOKIE_MAX_AGE).toBe(400 * 86_400)
    expect(playerCookie({ id: ID, name: 'Riya' }, { secure: false, path: '/' })).not.toContain(
      'Secure',
    )
  })

  it('finds nothing when the cookie is missing', () => {
    expect(parsePlayerCookie('')).toBeNull()
    expect(parsePlayerCookie('outreach.lang=en')).toBeNull()
  })

  it('rejects a damaged id or name', () => {
    expect(parsePlayerCookie('outreach_words_player=')).toBeNull()
    expect(parsePlayerCookie('outreach_words_player=Riya')).toBeNull()
    expect(parsePlayerCookie(`outreach_words_player=short.Riya`)).toBeNull()
    expect(parsePlayerCookie(`outreach_words_player=${ID}.%E0%A4`)).toBeNull()
    expect(parsePlayerCookie(`outreach_words_player=${ID}.Riya7`)).toBeNull()
    expect(parsePlayerCookie(`outreach_words_player=${ID}.`)).toBeNull()
  })

  it('applies the same name rules as the name form', () => {
    expect(parsePlayerCookie(`outreach_words_player=${ID}.%20Riya%20%20Shah`)).toEqual({
      id: ID,
      name: 'Riya Shah',
    })
  })
})
