import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/context'
import { usePage } from '../components/page-context'
import { Icon } from '../components/Icon'
import { SECTIONS, paths } from '../config/sections'
import pageStyles from './pages.module.css'
import styles from './DarshanPage.module.css'

/**
 * Annakut Darshan: the Annakut display as a 3D scene that the visitor can turn,
 * zoom into and walk along.
 *
 * The 3D viewer is a plain static page in public/darshan-3d (see its
 * README.md), shown here in an iframe so its scripts, styles and full-window
 * layout stay self-contained, the same way Temple Run is embedded. The scene is
 * about 34 MB, so nothing of it is fetched until the visitor asks for it.
 */

/** Base URL for static files in /public (includes trailing slash). */
const VIEWER_DIR = `${import.meta.env.BASE_URL}darshan-3d/`

/** Messages between this page and the viewer. Both sides check the origin. */
const MESSAGE = 'annakut-darshan:'

type ViewerState = 'idle' | 'loading' | 'ready' | 'error'

export default function DarshanPage() {
  const { t, lang } = useI18n()
  const config = SECTIONS.darshan
  usePage(t(config.nameKey), { to: paths.home(), label: t('nav.home') })

  const [state, setState] = useState<ViewerState>('idle')
  const [expanded, setExpanded] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  /** The viewer's address, fixed when it is loaded so a later language change does not reload it. */
  const [viewerSrc, setViewerSrc] = useState<string>()

  const load = () => {
    setViewerSrc(`${VIEWER_DIR}index.html?embed&lang=${lang}`)
    setState('loading')
  }

  // The viewer is taller than the picture it replaces, and its buttons are at
  // its bottom edge, so bring the whole of it onto the screen once it is there.
  useEffect(() => {
    if (viewerSrc) stageRef.current?.scrollIntoView({ block: 'nearest' })
  }, [viewerSrc])

  // The viewer says when the scene is on screen, or that it could not start.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.source !== frameRef.current?.contentWindow) return
      const type: unknown = (event.data as { type?: unknown } | null)?.type
      if (type === `${MESSAGE}ready`) setState('ready')
      if (type === `${MESSAGE}error`) setState('error')
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // The header's language switch also changes the language inside the viewer.
  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage(
      { type: `${MESSAGE}lang`, lang },
      window.location.origin,
    )
  }, [lang, state])

  // "Fill the screen" covers the page with the viewer. Escape closes it, and
  // the page behind does not scroll meanwhile.
  useEffect(() => {
    if (!expanded) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [expanded])

  const status =
    state === 'loading'
      ? t('darshan.loading')
      : state === 'ready'
        ? t('darshan.ready')
        : state === 'error'
          ? t('darshan.error')
          : ''

  return (
    <>
      <h1>{t(config.nameKey)}</h1>
      <p className={pageStyles.lead}>{t(config.leadKey)}</p>

      <div
        ref={stageRef}
        className={styles.stage}
        data-expanded={expanded}
        data-state={state}
        data-testid="darshan-stage"
      >
        {viewerSrc ? (
          <iframe
            ref={frameRef}
            className={styles.frame}
            src={viewerSrc}
            title={t('darshan.frameTitle')}
            allow="fullscreen"
          />
        ) : (
          <div>
            <img
              className={styles.posterImage}
              src={`${VIEWER_DIR}poster.webp`}
              alt={t('darshan.posterAlt')}
              width={1600}
              height={1000}
            />
            <div className={styles.posterAction}>
              <button type="button" className={styles.load} onClick={load}>
                <Icon name="play" size={20} />
                {t('darshan.load')}
              </button>
              <p className={styles.note}>{t('darshan.loadNote')}</p>
            </div>
          </div>
        )}
        {viewerSrc && (
          <button
            type="button"
            className={styles.expand}
            aria-pressed={expanded}
            onClick={() => setExpanded((on) => !on)}
          >
            {expanded ? t('darshan.collapse') : t('darshan.expand')}
          </button>
        )}
      </div>
      <p className="visually-hidden" role="status">
        {status}
      </p>

      <h2 className={styles.howTitle}>{t('darshan.how.title')}</h2>
      <ul className={styles.how}>
        <li>{t('darshan.how.full')}</li>
        <li>{t('darshan.how.walk')}</li>
        <li>{t('darshan.how.reset')}</li>
      </ul>
    </>
  )
}
