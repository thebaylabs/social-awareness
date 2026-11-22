import type { MessageKey } from '../i18n/messages'

/**
 * The single place where section slugs, story segment names and the games in
 * each section are defined. Renaming a section's URL (for example "yuvako")
 * is a one-line change to its `slug` here.
 */

export type SectionId = 'darshan' | 'bhulkao' | 'yuvako'
export type GameId = 'doodle' | 'pills' | 'words' | 'temple'
export type PartId = 'activity' | 'story' | 'prasang'

export interface GameConfig {
  id: GameId
  /** URL segment under /<section>/activity/ */
  slug: string
  titleKey: MessageKey
  descKey: MessageKey
}

export interface SectionConfig {
  id: SectionId
  /** URL segment, e.g. /bhulkao */
  slug: string
  /** URL segment for the choose-your-path part: "scenario" for both sections. */
  storySegment: string
  /**
   * An earlier URL segment for the same part. Links that still use it are
   * redirected to storySegment (see src/App.tsx), so shared links keep working.
   */
  formerStorySegment?: string
  nameKey: MessageKey
  leadKey: MessageKey
  /** Locale keys for the scenario (choose-your-path) part. */
  storyTitleKey: MessageKey
  storyDescKey: MessageKey
  storyListTitleKey: MessageKey
  activityDescKey: MessageKey
  /** Heading for the lesson box under a prasang. */
  prasangLessonKey: MessageKey
  games: GameId[]
  /** True while this section has no finished content yet. */
  placeholder?: boolean
}

export const GAMES: Record<GameId, GameConfig> = {
  doodle: {
    id: 'doodle',
    slug: 'doodle',
    titleKey: 'game.doodle.title',
    descKey: 'game.doodle.desc',
  },
  pills: { id: 'pills', slug: 'pills', titleKey: 'game.pills.title', descKey: 'game.pills.desc' },
  words: { id: 'words', slug: 'words', titleKey: 'game.words.title', descKey: 'game.words.desc' },
  temple: {
    id: 'temple',
    slug: 'temple-run',
    titleKey: 'game.temple.title',
    descKey: 'game.temple.desc',
  },
}

export const SECTIONS: Record<SectionId, SectionConfig> = {
  darshan: {
    id: 'darshan',
    slug: 'annakut-darshan',
    storySegment: 'scenario',
    nameKey: 'section.darshan.name',
    leadKey: 'section.darshan.lead',
    storyTitleKey: 'part.scenario.title',
    storyDescKey: 'part.scenario.desc',
    storyListTitleKey: 'list.scenario.title',
    activityDescKey: 'part.activity.desc.darshan',
    prasangLessonKey: 'prasang.lesson.darshan',
    games: [],
    placeholder: true,
  },
  bhulkao: {
    id: 'bhulkao',
    slug: 'bhulkao',
    storySegment: 'scenario',
    formerStorySegment: 'story',
    nameKey: 'section.bhulkao.name',
    leadKey: 'section.bhulkao.lead',
    storyTitleKey: 'part.scenario.title',
    storyDescKey: 'part.scenario.desc',
    storyListTitleKey: 'list.scenario.title',
    activityDescKey: 'part.activity.desc.bhulkao',
    prasangLessonKey: 'prasang.lesson.bhulkao',
    games: ['doodle', 'temple'],
  },
  yuvako: {
    id: 'yuvako',
    slug: 'yuvako',
    storySegment: 'scenario',
    nameKey: 'section.yuvako.name',
    leadKey: 'section.yuvako.lead',
    storyTitleKey: 'part.scenario.title',
    storyDescKey: 'part.scenario.desc',
    storyListTitleKey: 'list.scenario.title',
    activityDescKey: 'part.activity.desc.yuvako',
    prasangLessonKey: 'prasang.lesson.yuvako',
    games: ['pills', 'words'],
  },
}

export const SECTION_LIST: SectionConfig[] = [SECTIONS.darshan, SECTIONS.bhulkao, SECTIONS.yuvako]

/** Audience sections whose games, scenarios and prasangs are merged on the home hubs. */
export const AUDIENCE_SECTIONS: SectionId[] = ['bhulkao', 'yuvako']

export type HubId = 'activity' | 'scenario' | 'prasang'

export interface HubConfig {
  id: HubId
  /** Top-level URL segment, e.g. /activity */
  slug: string
  nameKey: MessageKey
  leadKey: MessageKey
}

/** Merged Games / Activities / Prasang hubs linked from the home page. */
export const HUBS: Record<HubId, HubConfig> = {
  activity: {
    id: 'activity',
    slug: 'activity',
    nameKey: 'part.activity.title',
    leadKey: 'hub.activity.lead',
  },
  scenario: {
    id: 'scenario',
    slug: 'scenario',
    nameKey: 'part.scenario.title',
    leadKey: 'hub.scenario.lead',
  },
  prasang: {
    id: 'prasang',
    slug: 'prasang',
    nameKey: 'part.prasang.title',
    leadKey: 'hub.prasang.lead',
  },
}

export const HUB_LIST: HubConfig[] = [HUBS.activity, HUBS.scenario, HUBS.prasang]

export function isSectionId(value: unknown): value is SectionId {
  return value === 'darshan' || value === 'bhulkao' || value === 'yuvako'
}

/** Find which section a URL path (without the base path) belongs to. */
export function sectionFromPath(pathname: string): SectionId | null {
  const first = pathname.split('/').filter(Boolean)[0]
  return SECTION_LIST.find((s) => s.slug === first)?.id ?? null
}

/** Build in-app paths (React Router adds the base path). */
export const paths = {
  home: () => '/',
  section: (id: SectionId) => `/${SECTIONS[id].slug}`,
  activity: (id: SectionId) => `/${SECTIONS[id].slug}/activity`,
  game: (id: SectionId, game: GameId) => `/${SECTIONS[id].slug}/activity/${GAMES[game].slug}`,
  storyList: (id: SectionId) => `/${SECTIONS[id].slug}/${SECTIONS[id].storySegment}`,
  story: (id: SectionId, storyId: string) =>
    `/${SECTIONS[id].slug}/${SECTIONS[id].storySegment}/${encodeURIComponent(storyId)}`,
  prasangList: (id: SectionId) => `/${SECTIONS[id].slug}/prasang`,
  prasang: (id: SectionId, prasangId: string) =>
    `/${SECTIONS[id].slug}/prasang/${encodeURIComponent(prasangId)}`,
  /** Merged hubs on the home page. */
  activityHub: () => `/${HUBS.activity.slug}`,
  scenarioHub: () => `/${HUBS.scenario.slug}`,
  prasangHub: () => `/${HUBS.prasang.slug}`,
}
