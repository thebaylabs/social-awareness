import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { useI18n } from '../i18n/context'
import { paths, sectionFromPath } from '../config/sections'
import { Header } from './Header'
import { Footer } from './Footer'
import { Fireworks } from './Fireworks'
import { PageContext, type PageInfo } from './page-context'
import { focusMainHeading } from './focus'
import { introMotionAllowed } from './intro-motion'
import styles from './Layout.module.css'

export function Layout() {
  const { t } = useI18n()
  const location = useLocation()
  const [page, setPage] = useState<PageInfo>({ title: '' })
  const mainRef = useRef<HTMLElement>(null)
  const isFirstRender = useRef(true)
  const section = sectionFromPath(location.pathname)
  const siteTitle = t('site.title')
  const [intro] = useState(introMotionAllowed)
  /** The diya page keeps its fireworks for when the crowd's diyas are lit. */
  const [welcomeShow] = useState(
    () => intro && location.pathname.replace(/\/+$/, '') !== paths.diya(),
  )

  useEffect(() => {
    document.title =
      page.title && page.title !== siteTitle ? `${page.title} · ${siteTitle}` : siteTitle
  }, [page.title, siteTitle])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    window.scrollTo(0, 0)
    const frame = requestAnimationFrame(() => focusMainHeading(mainRef.current))
    return () => cancelAnimationFrame(frame)
  }, [location.pathname])

  return (
    <div
      className={styles.app}
      data-section={section ?? 'home'}
      data-intro={intro ? 'play' : undefined}
    >
      <a href="#main" className={styles.skip}>
        {t('nav.skip')}
      </a>
      <Header back={page.back} />
      <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
        <PageContext.Provider value={setPage}>
          <Outlet />
        </PageContext.Provider>
      </main>
      <Footer />
      {/* A short welcome show, once per page load. */}
      {welcomeShow && <Fireworks rockets={14} />}
    </div>
  )
}
