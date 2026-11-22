import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router'
import { Analytics } from '@vercel/analytics/react'
import { I18nProvider } from './i18n/I18nProvider'
import { Layout } from './components/Layout'
import { GAMES, SECTION_LIST, paths, type SectionId } from './config/sections'
import Intro from './pages/Intro'
import SectionHome from './pages/SectionHome'
import HubGames from './pages/HubGames'
import HubItems from './pages/HubItems'
import GamePage from './pages/GamePage'
import AdminControl from './pages/AdminControl'
import NotFound from './pages/NotFound'
import { useI18n } from './i18n/context'

// Story and prasang pages load on demand (the prasang reader brings in the markdown renderer).
const StoryPage = lazy(() => import('./pages/StoryPage'))
const PrasangPage = lazy(() => import('./pages/PrasangPage'))

function Loading() {
  const { t } = useI18n()
  return <p role="status">{t('common.loading')}</p>
}

/** Send a link that uses a section's former story address to the current one. */
function FormerStoryRedirect({ section }: { section: SectionId }) {
  const { id } = useParams()
  return <Navigate to={id ? paths.story(section, id) : paths.scenarioHub()} replace />
}

/** React Router wants the base path without a trailing slash. */
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Intro />} />
            {/* Manual progress control. Not linked from the header or footer. */}
            <Route path="admin" element={<AdminControl />} />
            <Route path="activity" element={<HubGames />} />
            <Route path="scenario" element={<HubItems kind="story" />} />
            <Route path="prasang" element={<HubItems kind="prasang" />} />
            {SECTION_LIST.map((s) => (
              <Route key={s.id} path={s.slug}>
                <Route index element={<SectionHome section={s.id} />} />
                {/* Audience list pages redirect to the merged hubs on the home page. */}
                <Route path="activity" element={<Navigate to={paths.activityHub()} replace />} />
                {s.games.map((g) => (
                  <Route
                    key={g}
                    path={`activity/${GAMES[g].slug}`}
                    element={<GamePage section={s.id} game={g} />}
                  />
                ))}
                <Route
                  path={s.storySegment}
                  element={<Navigate to={paths.scenarioHub()} replace />}
                />
                <Route
                  path={`${s.storySegment}/:id`}
                  element={
                    <Suspense fallback={<Loading />}>
                      <StoryPage section={s.id} />
                    </Suspense>
                  }
                />
                {s.formerStorySegment &&
                  [s.formerStorySegment, `${s.formerStorySegment}/:id`].map((path) => (
                    <Route
                      key={path}
                      path={path}
                      element={<FormerStoryRedirect section={s.id} />}
                    />
                  ))}
                <Route path="prasang" element={<Navigate to={paths.prasangHub()} replace />} />
                <Route
                  path="prasang/:id"
                  element={
                    <Suspense fallback={<Loading />}>
                      <PrasangPage section={s.id} />
                    </Suspense>
                  }
                />
                <Route path="*" element={<NotFound section={s.id} />} />
              </Route>
            ))}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
      {/* Anonymous page-view counts, on the Vercel deployment only (see vite.config.ts). */}
      {__VERCEL_ANALYTICS__ && <Analytics />}
    </I18nProvider>
  )
}
