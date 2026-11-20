import { useEffect, useId, useMemo, useReducer, useRef, useState } from 'react'
import { useI18n } from '../../i18n/context'
import { localizedLang } from '../../i18n/localized'
import { Icon } from '../../components/Icon'
import { LessonBox } from '../../components/LessonBox'
import { ContentImage } from '../../components/ContentImage'
import { PlaceholderNotice } from '../../components/Placeholder'
import { focusElement } from '../../components/focus'
import { usePrefersReducedMotion } from '../../components/motion'
import type { Story, StoryNode } from '../../content/schemas'
import type { SectionId } from '../../config/sections'
import { followedExpectedPath } from './expected'
import { choicesTaken, reachableEndings, readEndingsFound, writeEndingsFound } from './endings'
import { FirecrackerReward } from './firecrackers/FirecrackerReward'
import { EndingsFound, PathRecap } from './ScenarioEnding'
import { storyReducer } from './state'
import styles from './Story.module.css'

function NodeMedia({ node, placeholder }: { node: StoryNode; placeholder: boolean }) {
  const { l } = useI18n()
  if (node.image) {
    return (
      <ContentImage src={node.image.src} alt={l(node.image.alt)} placeholder={placeholder} eager />
    )
  }
  if (node.video) {
    return (
      <video
        className={styles.video}
        controls
        playsInline
        preload="metadata"
        poster={node.video.poster}
        aria-label={l(node.video.alt)}
      >
        <source src={node.video.src} />
        {node.video.captions && <track kind="captions" src={node.video.captions} default />}
      </video>
    )
  }
  return null
}

/**
 * Plays a validated story. Bhulkao leads with the picture; Yuvako leads with
 * the text, and its endings show the choices taken and which endings have been
 * found in this browser tab.
 */
export function StoryPlayer({ story, section }: { story: Story; section: SectionId }) {
  const { t, l, lang } = useI18n()
  const [history, dispatch] = useReducer(storyReducer, [story.startNode])
  const nodes = useMemo(() => new Map(story.nodes.map((n) => [n.id, n])), [story])
  const node = nodes.get(history[history.length - 1] ?? story.startNode) as StoryNode
  const headingRef = useRef<HTMLHeadingElement>(null)
  const isFirst = useRef(true)
  const headingId = useId()
  const pictureFirst = section === 'bhulkao'
  const tracksEndings = section === 'yuvako'
  const reducedMotion = usePrefersReducedMotion()
  const endings = useMemo(() => reachableEndings(story), [story])
  const [found, setFound] = useState<readonly string[]>(() =>
    tracksEndings ? readEndingsFound(story.id) : [],
  )

  const choose = (next: string) => {
    dispatch({ type: 'choose', next })
    if (tracksEndings && nodes.get(next)?.ending && !found.includes(next)) {
      const updated = [...found, next]
      setFound(updated)
      writeEndingsFound(story.id, updated)
    }
  }

  // Move focus to the new step's heading whenever the step changes (not on first load).
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    focusElement(headingRef.current)
    headingRef.current?.scrollIntoView({
      block: 'start',
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }, [history, reducedMotion])

  const media = <NodeMedia node={node} placeholder={story.placeholder} />

  return (
    <div className={styles.story} data-audience={section}>
      {story.placeholder && <PlaceholderNotice />}
      <h1 lang={localizedLang(story.title, lang)}>{l(story.title)}</h1>
      <section className={styles.node} aria-labelledby={headingId} data-testid="story-node">
        <h2 id={headingId} ref={headingRef} className={styles.step}>
          {node.ending ? t('story.ending') : t('story.step', { n: history.length })}
          {node.ending?.title && (
            <>
              <span className="visually-hidden">: </span>
              <span className={styles.endingTitle} lang={localizedLang(node.ending.title, lang)}>
                {l(node.ending.title)}
              </span>
            </>
          )}
        </h2>
        {pictureFirst && media}
        <p className={styles.text} lang={localizedLang(node.text, lang)}>
          {l(node.text)}
        </p>
        {!pictureFirst && media}

        {node.choices && (
          <>
            <p className={styles.prompt}>{t('story.choose')}</p>
            <ul className={styles.choices}>
              {node.choices.map((choice) => (
                <li key={`${choice.next}-${choice.label.en}`}>
                  <button
                    type="button"
                    className={styles.choice}
                    onClick={() => choose(choice.next)}
                    lang={localizedLang(choice.label, lang)}
                  >
                    <span>{l(choice.label)}</span>
                    <Icon name="arrow-right" size={22} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {node.ending && (
          <>
            <p className={styles.outcome} lang={localizedLang(node.ending.outcome, lang)}>
              {l(node.ending.outcome)}
            </p>
            {tracksEndings && <PathRecap labels={choicesTaken(story, history)} />}
            <LessonBox
              heading={t(section === 'bhulkao' ? 'story.lesson.bhulkao' : 'story.lesson.yuvako')}
            >
              <p lang={localizedLang(node.ending.lesson, lang)}>{l(node.ending.lesson)}</p>
            </LessonBox>
            {section === 'bhulkao' && followedExpectedPath(story, history) && <FirecrackerReward />}
            {tracksEndings && endings.length > 1 && (
              <EndingsFound endings={endings} found={found} current={node.id} />
            )}
          </>
        )}
      </section>

      <div className={styles.controls} data-story-controls="">
        {history.length > 1 && (
          <button
            type="button"
            className={styles.secondary}
            onClick={() => dispatch({ type: 'back' })}
          >
            <Icon name="back" size={20} />
            {t('story.back')}
          </button>
        )}
        {node.ending && (
          <button
            type="button"
            className={styles.primary}
            onClick={() => dispatch({ type: 'restart', start: story.startNode })}
          >
            <Icon name="restart" size={20} />
            {t('story.restart')}
          </button>
        )}
      </div>
    </div>
  )
}
