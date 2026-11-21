import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useI18n } from '../../i18n/context'
import { localizedLang } from '../../i18n/localized'
import { Icon } from '../../components/Icon'
import { ContentImage } from '../../components/ContentImage'
import { PlaceholderTag } from '../../components/Placeholder'
import { focusElement } from '../../components/focus'
import { paths, type SectionId } from '../../config/sections'
import type { ScenarioMoral, Story } from '../../content/schemas'
import { readMoralRevealed, writeMoralRevealed } from './endings'
import styles from './Story.module.css'

/**
 * The lesson every Yuvako scenario shares (content/scenario-moral.json). It
 * stays hidden until the visitor has reached an ending in each scenario; then
 * a button reveals it. On a scenario ending it also lists the scenarios and
 * links to the next one not finished yet.
 */
export function SharedLesson({
  section,
  stories,
  moral,
  finished,
  current,
}: {
  section: SectionId
  /** Every scenario of the section, in list order. */
  stories: readonly Story[]
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
  const done = stories.filter((s) => finished.has(s.id)).length
  const total = stories.length
  const allDone = done === total
  const onEnding = current !== undefined
  const next = onEnding ? stories.find((s) => !finished.has(s.id)) : undefined

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
        <span className={styles.endingsCount}>{t('moral.count', { done, total })}</span>
      </h2>

      {onEnding && (
        <ul className={styles.badges}>
          {stories.map((s) => {
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

      {!allDone && <p className={styles.sharedHint}>{t('moral.locked')}</p>}

      {next && (
        <Link to={paths.story(section, next.id)} className={`${styles.choice} ${styles.nextLink}`}>
          <span className={styles.nextText}>
            <span className={styles.nextLabel}>{t('moral.next')}</span>
            <span className="visually-hidden">: </span>
            <span lang={localizedLang(next.title, lang)}>{l(next.title)}</span>
          </span>
          <Icon name="arrow-right" size={22} />
        </Link>
      )}

      {allDone && !revealed && (
        <>
          <p className={styles.sharedHint}>{t('moral.ready')}</p>
          <button type="button" className={styles.primary} onClick={reveal}>
            <Icon name="lightbulb" size={20} />
            {t('moral.reveal')}
          </button>
        </>
      )}

      {allDone && revealed && (
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
