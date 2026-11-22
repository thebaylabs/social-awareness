import { useI18n } from '../../i18n/context'
import styles from './TempleRunGame.module.css'

/** Base URL for static files in /public (includes trailing slash). */
const gameSrc = `${import.meta.env.BASE_URL}games/temple-run/index.html`

/**
 * Annakut Temple Run: a plain HTML5 canvas game served from public/games.
 * Embedded in an iframe so its fixed layout and scripts stay self-contained.
 */
export default function TempleRunGame() {
  const { t } = useI18n()
  return (
    <div className={styles.wrap}>
      <iframe
        className={styles.frame}
        src={gameSrc}
        title={t('game.temple.title')}
        allow="fullscreen"
      />
    </div>
  )
}
