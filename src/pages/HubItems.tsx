import { useI18n } from '../i18n/context'
import { localizedLang } from '../i18n/localized'
import { usePage } from '../components/page-context'
import { Card, CardItem, CardList } from '../components/Card'
import { PrasangArt, StoryArt } from '../components/Art'
import { AUDIENCE_SECTIONS, HUBS, paths } from '../config/sections'
import { lessonScenarios, prasangsFor, scenarioMoral, storiesFor } from '../content'
import { isFinished, reachableEndings, readEndingsFound } from '../features/story/endings'
import { SharedLesson } from '../features/story/SharedLesson'
import styles from './pages.module.css'

type Kind = 'story' | 'prasang'

/**
 * Merged scenario or prasang list for Bhulkao and Yuvako. Each card still
 * opens the item under its own audience path.
 */
export default function HubItems({ kind }: { kind: Kind }) {
  const { t, l, lang } = useI18n()
  const hub = kind === 'story' ? HUBS.scenario : HUBS.prasang
  usePage(t(hub.nameKey), { to: paths.home(), label: t('nav.home') })

  const items = AUDIENCE_SECTIONS.flatMap((section) => {
    const list = kind === 'story' ? storiesFor(section) : prasangsFor(section)
    return list.map((item) => ({ section, item }))
  })

  const tracksScenarios = kind === 'story'
  const scenarios = tracksScenarios ? lessonScenarios() : []
  const moral = tracksScenarios ? scenarioMoral() : null
  const finished = new Set<string>()
  const status = new Map<string, string>()
  for (const { story } of scenarios) {
    const found = readEndingsFound(story.id)
    const endings = reachableEndings(story)
    if (isFinished(story, found)) {
      finished.add(story.id)
      const count = endings.filter((e) => found.includes(e.id)).length
      status.set(story.id, t('list.scenario.finished', { found: count, total: endings.length }))
    } else {
      status.set(story.id, t('moral.notFinished'))
    }
  }

  return (
    <>
      <h1>{t(hub.nameKey)}</h1>
      <p>{t(hub.leadKey)}</p>
      {items.length === 0 ? (
        <p className={styles.empty}>{t('list.empty')}</p>
      ) : (
        <CardList>
          {items.map(({ section, item }) => (
            <CardItem key={`${section}-${item.id}`}>
              <Card
                to={
                  kind === 'story' ? paths.story(section, item.id) : paths.prasang(section, item.id)
                }
                title={l(item.title)}
                description={status.get(item.id)}
                lang={localizedLang(item.title, lang)}
                art={kind === 'story' ? <StoryArt /> : <PrasangArt />}
                curatedKids={section === 'bhulkao'}
                placeholder={item.placeholder}
              />
            </CardItem>
          ))}
        </CardList>
      )}
      {moral && scenarios.length > 0 && (
        <SharedLesson scenarios={scenarios} moral={moral} finished={finished} />
      )}
    </>
  )
}
