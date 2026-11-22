import { useId } from 'react'
import { useI18n } from '../i18n/context'
import styles from './CrowdBar.module.css'

interface CrowdBarProps {
  /** Hidden (but keeping its place) until this device's diya is lit. */
  visible: boolean
  /** Shared progress, or null while the first answer is on its way. */
  count: number | null
  goal: number
  complete: boolean
}

/**
 * The bar under the diya: it fills as the shared stage-controlled count
 * rises, and is full when the goal is reached.
 */
export function CrowdBar({ visible, count, goal, complete }: CrowdBarProps) {
  const { t } = useI18n()
  const labelId = useId()
  const shown = Math.min(count ?? 0, goal)
  return (
    <div
      className={styles.crowd}
      data-visible={visible ? 'true' : 'false'}
      data-complete={complete ? 'true' : 'false'}
      data-testid="crowd"
    >
      <p id={labelId} className={styles.label} aria-live="polite">
        {complete ? t('intro.wait.done', { goal }) : t('intro.wait.label')}
      </p>
      <div
        className={styles.track}
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={shown}
      >
        <div className={styles.fill} style={{ width: `${(shown / goal) * 100}%` }} />
      </div>
      <p className={styles.count} data-testid="crowd-count">
        {count === null ? t('intro.wait.counting') : t('intro.wait.count', { count: shown, goal })}
      </p>
    </div>
  )
}
