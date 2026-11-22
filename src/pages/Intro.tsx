import type { ReactNode } from 'react'
import { useI18n } from '../i18n/context'
import { usePage } from '../components/page-context'
import { GameArt, PrasangArt, StoryArt } from '../components/Art'
import { DiyaLamp } from '../components/DiyaLamp'
import { EventTitle } from '../components/EventTitle'
import { SectionCard } from '../components/SectionCard'
import { AUDIENCE_SECTIONS, HUB_LIST, SECTIONS, paths, type HubId } from '../config/sections'
import { INTRO_COPY_IS_PLACEHOLDER } from '../config/site'
import { PlaceholderNotice } from '../components/Placeholder'
import { partHasPlaceholders } from '../content'
import { gameIsPlaceholder } from '../content/games'
import styles from './pages.module.css'

const HUB_ART: Record<HubId, ReactNode> = {
  activity: <GameArt />,
  scenario: <StoryArt />,
  prasang: <PrasangArt />,
}

const HUB_PATH: Record<HubId, () => string> = {
  activity: paths.activityHub,
  scenario: paths.scenarioHub,
  prasang: paths.prasangHub,
}

function hubIsPlaceholder(id: HubId): boolean {
  if (id === 'activity') {
    return AUDIENCE_SECTIONS.some((section) => SECTIONS[section].games.some(gameIsPlaceholder))
  }
  const part = id === 'scenario' ? 'story' : 'prasang'
  return AUDIENCE_SECTIONS.some((section) => partHasPlaceholders(section, part))
}

/**
 * The home page: the festival welcome and the Explore Annakut hubs. The diya
 * that visitors light together is on its own page (src/pages/Diya.tsx).
 */
export default function Intro() {
  const { t } = useI18n()
  usePage(t('site.event'))
  return (
    <>
      <div className={styles.hero}>
        <DiyaLamp className={styles.heroLamp} />
        <EventTitle />
        <p className={styles.heroValue}>{t('site.value')}</p>
        <p className={styles.heroTheme}>
          {t('site.theme.lead')}
          {t('site.theme.focus')}
        </p>
      </div>
      {INTRO_COPY_IS_PLACEHOLDER && <PlaceholderNotice />}
      <div className={styles.divider}>
        <span aria-hidden="true" />
        <p>{t('intro.lead')}</p>
        <span aria-hidden="true" />
      </div>
      <ul className={styles.sections}>
        {HUB_LIST.map((hub, index) => (
          <li key={hub.id}>
            <SectionCard
              to={HUB_PATH[hub.id]()}
              index={index + 1}
              title={t(hub.nameKey)}
              action={t('intro.explore')}
              art={HUB_ART[hub.id]}
              placeholder={hubIsPlaceholder(hub.id)}
            />
          </li>
        ))}
      </ul>
    </>
  )
}
