import type { Lang } from '../i18n/languages'

/**
 * Site-wide settings. The working title and all interface text live in
 * locales/*.json; this file holds only values that are not translated.
 */

/** The organisation's name, used in the footer. Not translated; shown in capitals. */
export const BRAND_NAME = 'Harisumiran SF'

/**
 * The header logo (src/assets/brand/harisumiran-sf-logo.webp) reads
 * "HARISUMIRAN"; this suffix is set after it in matching type. The alt text
 * is the logo's accessible name.
 */
export const BRAND_LOGO_SUFFIX = 'SF'
export const BRAND_LOGO_ALT = 'Harisumiran SF — A Hariprabodham Parivar Event'

/** The copyright holder named at the foot of every page. Not translated. */
export const COPYRIGHT_HOLDER = 'The Bay Labs'

/**
 * Organisation name and contact for the footer. Left empty until branding is
 * confirmed by the owner (open question 8). Each is a localized text object,
 * for example { "en": "...", "gu": "..." }.
 */
export const ORGANISATION: {
  name: { en: string; gu?: string } | null
  contact: { en: string; gu?: string } | null
} = {
  name: null,
  contact: null,
}

/**
 * Whether a language's text has been reviewed by a fluent reviewer. While a
 * language is false, the footer shows a short "draft translation" note in it.
 * (Open question 4: Gujarati is a draft written by the builder.)
 */
export const TRANSLATION_REVIEWED: Record<Lang, boolean> = {
  en: true,
  gu: false,
}

/** The only keys this site ever writes to localStorage. */
export const STORAGE_KEYS = {
  lang: 'outreach.lang',
  wordsDaily: 'outreach.words.daily',
  doodleBest: 'outreach.doodle.best',
  doodleName: 'outreach.doodle.name',
} as const

/**
 * The only cookie this site sets: a Shabd Khoj player's random id and name,
 * saved when they join the streak leaderboard (src/games/words/player.ts).
 */
export const COOKIES = {
  wordsPlayer: 'outreach_words_player',
} as const

/**
 * Whether the intro page's welcome text (in locales/*.json, keys "site.*" and
 * "intro.*") is placeholder copy. While true, the intro page shows the
 * placeholder banner.
 */
export const INTRO_COPY_IS_PLACEHOLDER = false
