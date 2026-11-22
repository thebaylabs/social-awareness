import { Navigate } from 'react-router'
import { useI18n } from '../i18n/context'
import { localizedLang } from '../i18n/localized'
import { usePage } from '../components/page-context'
import { Card, CardItem, CardList } from '../components/Card'
import { PrasangArt, StoryArt } from '../components/Art'
import { SECTIONS, paths, type SectionId } from '../config/sections'
import { lessonScenarios, prasangsFor, scenarioMoral, storiesFor } from '../content'
import { isFinished, reachableEndings, readEndingsFound } from '../features/story/endings'
import { SharedLesson } from '../features/story/SharedLesson'
import styles from './pages.module.css'

/**
 * List of stories or prasangs in a section. With exactly one item the list
 * goes straight to it, so the item stays within three taps of the intro page.
 * Yuvako scenarios show whether each has been finished in this tab, and the
 * lesson they share.
 */
export default function ItemList({
  section,
  kind,
}: {
  section: SectionId
  kind: 'story' | 'prasang'
}) {
  const { t, l, lang } = useI18n()
  const config = SECTIONS[section]
  const items = kind === 'story' ? storiesFor(section) : prasangsFor(section)
  const title = kind === 'story' ? t(config.storyListTitleKey) : t('list.prasang.title')
  const itemPath = (id: string) =>
    kind === 'story' ? paths.story(section, id) : paths.prasang(section, id)
  usePage(title, { to: paths.section(section), label: t(config.nameKey) })

  const only = items.length === 1 ? items[0] : undefined
  if (only) return <Navigate to={itemPath(only.id)} replace />

  const tracksScenarios = kind === 'story' && section === 'yuvako'
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
      <h1>{title}</h1>
      {items.length === 0 ? (
        <p className={styles.empty}>{t('list.empty')}</p>
      ) : (
        <CardList>
          {items.map((item) => (
            <CardItem key={item.id}>
              <Card
                to={itemPath(item.id)}
                title={l(item.title)}
                description={status.get(item.id)}
                lang={localizedLang(item.title, lang)}
                art={kind === 'story' ? <StoryArt /> : <PrasangArt />}
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
