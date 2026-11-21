import { useState } from 'react'
import { useI18n } from '../i18n/context'
import { usePage } from '../components/page-context'
import { DiyaLighting } from '../components/DiyaLighting'
import { Fireworks } from '../components/Fireworks'
import { introMotionAllowed } from '../components/intro-motion'
import { EventTitle } from '../components/EventTitle'
import { CrowdBar } from '../crowd/CrowdBar'
import { useDiyaCrowd } from '../crowd/useDiyaCrowd'
import styles from './pages.module.css'

/**
 * The whole site. Each visitor lights their own diya; a bar then shows the
 * shared progress set from `/admin`. When that reaches the goal, the
 * fireworks begin and the welcome appears.
 */
export default function Intro() {
  const { t } = useI18n()
  usePage(t('site.event'))
  /** Every visit starts unlit. */
  const [lit, setLit] = useState(false)
  const [motion] = useState(introMotionAllowed)
  const crowd = useDiyaCrowd(lit)
  /** The welcome lines and the fireworks wait for the whole crowd. */
  const revealed = lit && crowd.complete

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
    </>
  )
}
