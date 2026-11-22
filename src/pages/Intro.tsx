import { useState, type ReactNode } from 'react'
import { useI18n } from '../i18n/context'
import { usePage } from '../components/page-context'
import { DarshanArt, GameArt, PrasangArt, StoryArt } from '../components/Art'
import { DiyaLighting } from '../components/DiyaLighting'
import { EventTitle } from '../components/EventTitle'
import { Fireworks } from '../components/Fireworks'
import { SectionCard } from '../components/SectionCard'
import { introMotionAllowed } from '../components/intro-motion'
import { AUDIENCE_SECTIONS, HUB_LIST, SECTIONS, paths, type HubId } from '../config/sections'
import { INTRO_COPY_IS_PLACEHOLDER } from '../config/site'
import { PlaceholderNotice } from '../components/Placeholder'
import { partHasPlaceholders } from '../content'
import { gameIsPlaceholder } from '../content/games'
import { CrowdBar } from '../crowd/CrowdBar'
import { useDiyaCrowd } from '../crowd/useDiyaCrowd'
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
 * Light the diya, wait for the shared crowd count from `/admin`, then the
 * welcome and Explore Annakut hubs appear (with fireworks when motion allows).
 */
export default function Intro() {
  const { t } = useI18n()
  usePage(t('site.event'))
  const [lit, setLit] = useState(false)
  const [motion] = useState(introMotionAllowed)
  const crowd = useDiyaCrowd(lit)
  const revealed = lit && crowd.complete
  const darshan = SECTIONS.darshan

  return (
    <>
      {revealed && motion && <Fireworks />}
      <div className={styles.hero}>
        <DiyaLighting onLit={() => setLit(true)} />
        {crowd.enabled && (
          <CrowdBar visible={lit} count={crowd.count} goal={crowd.goal} complete={crowd.complete} />
        )}
        <div
          className={styles.welcome}
          data-revealed={revealed ? 'true' : 'false'}
          data-testid="welcome"
        >
          <EventTitle />
          <p className={styles.heroValue} data-testid="atmiyata">
            {t('site.value')}
          </p>
          <p className={styles.heroTheme}>
            {t('site.theme.lead')}
            <span data-harmony data-testid="harmony">
              {t('site.theme.focus')}
            </span>
          </p>
        </div>
      </div>
      <div
        className={styles.afterWelcome}
        data-revealed={revealed ? 'true' : 'false'}
        data-testid="explore"
      >
        {INTRO_COPY_IS_PLACEHOLDER && <PlaceholderNotice />}
        <div className={styles.divider}>
          <span aria-hidden="true" />
          <p>{t('intro.lead')}</p>
          <span aria-hidden="true" />
        </div>
        <ul className={styles.sections}>
          <li>
            <SectionCard
              to={paths.section('darshan')}
              index={1}
              title={t(darshan.nameKey)}
              action={t('intro.explore')}
              art={<DarshanArt />}
              placeholder={darshan.placeholder}
            />
          </li>
          {HUB_LIST.map((hub, index) => (
            <li key={hub.id}>
              <SectionCard
                to={HUB_PATH[hub.id]()}
                index={index + 2}
                title={t(hub.nameKey)}
                action={t('intro.explore')}
                art={HUB_ART[hub.id]}
                placeholder={hubIsPlaceholder(hub.id)}
              />
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
