import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useI18n } from '../../i18n/context'
import { localizedLang } from '../../i18n/localized'
import { Icon } from '../../components/Icon'
import { ContentImage } from '../../components/ContentImage'
import { PlaceholderTag } from '../../components/Placeholder'
import { focusElement } from '../../components/focus'
import { paths } from '../../config/sections'
import type { LessonScenario } from '../../content'
import type { ScenarioMoral } from '../../content/schemas'
import { lessonGoal, readMoralRevealed, writeMoralRevealed } from './endings'
import styles from './Story.module.css'

/**
 * The lesson the scenarios share (content/scenario-moral.json). It stays
 * hidden until the visitor has reached an ending in enough of them: any three
 * (see lessonGoal). A row of markers counts up to that; then a button reveals
 * the lesson. On a scenario ending it also lists the scenarios and, until the
 * lesson is unlocked, links to the next one not finished yet.
 */
export function SharedLesson({
  scenarios,
  moral,
  finished,
  current,
}: {
  /** Every scenario, in list order. */
  scenarios: readonly LessonScenario[]
  moral: ScenarioMoral
  /** Ids of the scenarios with an ending found. */
  finished: ReadonlySet<string>
  /** The scenario whose ending is showing. Leave out on the list page. */
  current?: string
}) {
  const { t, l, lang } = useI18n()
  const headingId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [revealed, setRevealed] = useState(readMoralRevealed)
  const [justRevealed, setJustRevealed] = useState(false)
  const total = scenarios.length
  const goal = lessonGoal(total)
  const done = scenarios.filter((s) => finished.has(s.story.id)).length
  /** The counter stops at the goal, even when every scenario is finished. */
  const counted = Math.min(done, goal)
  const unlocked = done >= goal
  const onEnding = current !== undefined
  /** While the lesson is locked: the next scenario after this one not finished yet, wrapping round. */
  const at = scenarios.findIndex((s) => s.story.id === current)
  const next =
    onEnding && !unlocked
      ? [...scenarios.slice(at + 1), ...scenarios.slice(0, at + 1)].find(
          (s) => !finished.has(s.story.id),
        )
      : undefined

  useEffect(() => {
    if (justRevealed) focusElement(titleRef.current)
  }, [justRevealed])

  const reveal = () => {
    writeMoralRevealed()
    setRevealed(true)
    setJustRevealed(true)
  }

  return (
    <section className={styles.shared} aria-labelledby={headingId} data-testid="shared-lesson">
      <h2 id={headingId} className={styles.endingsHeading}>
        {t('moral.title')}
        <span className="visually-hidden">: </span>
        <span className={styles.endingsCount}>
          {t('moral.count', { done: counted, total: goal })}
        </span>
      </h2>

      {/* The same count as markers: one for each scenario needed. */}
      <div className={styles.pips} aria-hidden="true" data-testid="lesson-counter">
        {Array.from({ length: goal }, (_, i) => (
          <span key={i} className={styles.pip} data-filled={i < counted || undefined}>
            {i < counted && <Icon name="check" size={18} />}
          </span>
        ))}
      </div>

      {onEnding && (
        <ul className={styles.badges}>
          {scenarios.map(({ story: s }) => {
            const isDone = finished.has(s.id)
            return (
              <li key={s.id} className={styles.badge} data-found={isDone || undefined}>
                <span className={styles.badgeMark} aria-hidden="true">
                  {isDone && <Icon name="check" size={18} />}
                </span>
                <span className={styles.badgeText}>
                  <span lang={localizedLang(s.title, lang)}>{l(s.title)}</span>
                  <span className="visually-hidden">, </span>
                  <span className={styles.badgeStatus}>
                    {t(isDone ? 'moral.finished' : 'moral.notFinished')}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {!unlocked && <p className={styles.sharedHint}>{t('moral.locked', { goal, total })}</p>}

      {next && (
        <Link
          to={paths.story(next.section, next.story.id)}
          className={`${styles.choice} ${styles.nextLink}`}
        >
          <span className={styles.nextText}>
            <span className={styles.nextLabel}>{t('moral.next')}</span>
            <span className="visually-hidden">: </span>
            <span lang={localizedLang(next.story.title, lang)}>{l(next.story.title)}</span>
          </span>
          <Icon name="arrow-right" size={22} />
        </Link>
      )}

      {unlocked && !revealed && (
        <>
          <p className={styles.sharedHint}>{t('moral.ready', { done })}</p>
          <button type="button" className={styles.primary} onClick={reveal}>
            <Icon name="lightbulb" size={20} />
            {t('moral.reveal')}
          </button>
        </>
      )}

      {unlocked && revealed && (
        <div className={styles.moral} data-just-revealed={justRevealed || undefined}>
          {moral.image ? (
            <ContentImage
              src={moral.image.src}
              alt={l(moral.image.alt)}
              placeholder={moral.placeholder}
            />
          ) : (
            moral.placeholder && (
              <p className={styles.moralTag}>
                <PlaceholderTag />
              </p>
            )
          )}
          <h3 ref={titleRef} className={styles.moralTitle} lang={localizedLang(moral.title, lang)}>
            {l(moral.title)}
          </h3>
          <p className={styles.moralText} lang={localizedLang(moral.text, lang)}>
            {l(moral.text)}
          </p>
          {moral.points.length > 0 && (
            <ul className={styles.moralPoints}>
              {moral.points.map((point) => (
                <li key={point.title.en}>
                  <h4 className={styles.pointTitle} lang={localizedLang(point.title, lang)}>
                    {l(point.title)}
                  </h4>
                  <p lang={localizedLang(point.text, lang)}>{l(point.text)}</p>
                </li>
              ))}
            </ul>
          )}
          {moral.closing && (
            <p className={styles.moralClosing} lang={localizedLang(moral.closing, lang)}>
              {l(moral.closing)}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
