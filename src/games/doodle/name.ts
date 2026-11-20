/**
 * Player names for the doodle leaderboard and the Shabd Khoj streak
 * leaderboard. Bhulkao players are young children, so a name is a first name
 * or nickname only: letters in any script, single spaces, at most
 * MAX_NAME_LENGTH letters, and not on the blocked list.
 */

export const MAX_NAME_LENGTH = 12

export type NameProblem = 'empty' | 'tooLong' | 'characters' | 'blocked'
export type NameCheck = { ok: true; name: string } | { ok: false; problem: NameProblem }

/**
 * A basic filter, not a complete one. Short words are matched as whole words
 * only, so that ordinary names that happen to contain them still pass.
 */
const BLOCKED_WORDS = new Set([
  'ass',
  'butt',
  'cock',
  'cum',
  'dick',
  'fag',
  'fuk',
  'hoe',
  'jerk',
  'nazi',
  'piss',
  'poop',
  'porn',
  'rape',
  'sex',
  'shit',
  'tit',
  'tits',
  'kutta',
  'kutti',
  'kutto',
  'gadha',
  'chod',
  'lund',
  'gand',
  'gaand',
  'randi',
  'saala',
])
const BLOCKED_PARTS = [
  'bitch',
  'bastard',
  'boob',
  'fuck',
  'idiot',
  'nigg',
  'penis',
  'pussy',
  'slut',
  'stupid',
  'vagina',
  'whore',
  'chutiya',
  'chutia',
  'madarchod',
  'bhenchod',
  'behenchod',
  'harami',
  'haraami',
  'kamina',
  'bhosd',
  'gaandu',
  'gandu',
  'चूतिया',
  'मादरचोद',
  'बहनचोद',
  'हरामी',
  'कमीना',
  'रंडी',
  'कुत्ता',
  'गांडू',
  'भोसड',
  'હરામી',
  'ચુતિયા',
  'ગાંડુ',
  'કૂતરો',
  'રંડી',
]

function letterCount(text: string): number {
  return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].filter(
    (s) => s.segment !== ' ',
  ).length
}

function isBlocked(name: string): boolean {
  const lower = name.toLowerCase()
  const joined = lower.replace(/ /g, '')
  if (lower.split(' ').some((word) => BLOCKED_WORDS.has(word)) || BLOCKED_WORDS.has(joined)) {
    return true
  }
  return BLOCKED_PARTS.some((part) => joined.includes(part))
}

export function checkName(raw: string): NameCheck {
  const name = raw.normalize('NFC').trim().replace(/\s+/g, ' ')
  if (!name) return { ok: false, problem: 'empty' }
  if (!/^[\p{L}\p{M}]+( [\p{L}\p{M}]+)*$/u.test(name)) return { ok: false, problem: 'characters' }
  if (letterCount(name) > MAX_NAME_LENGTH) return { ok: false, problem: 'tooLong' }
  if (isBlocked(name)) return { ok: false, problem: 'blocked' }
  return { ok: true, name }
}

/** One leaderboard entry per name per day: "Riya" and "riya" are the same player. */
export function nameKey(name: string): string {
  return name.toLowerCase()
}
