import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { useI18n } from '../../i18n/context'
import { localizedLang } from '../../i18n/localized'
import { Icon } from '../../components/Icon'
import { ExternalLink } from '../../components/ExternalLink'
import { ContentError } from '../../components/ContentError'
import { PlaceholderNotice } from '../../components/Placeholder'
import { focusElement } from '../../components/focus'
import { useGameHeading } from '../../components/game-heading'
import { PILLS, pillsArePlaceholder } from '../../content/games'
import type { PillCard, Pills } from '../../content/schemas'
import { BlackoutScreen } from './BlackoutScreen'
import { GreenPillPage } from './GreenPillPage'
import { Loc } from './Loc'
import { RedPillInsight } from './RedPillInsight'
import { START, pillReducer, type PillPath } from './machine'
import styles from './PillGame.module.css'

type PillColour = 'red' | 'blue' | 'green'

function Capsule() {
  return (
    <svg className={styles.capsule} viewBox="0 0 48 24" aria-hidden="true" focusable="false">
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="21"
        rx="10.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path d="M12 1.5h12v21H12a10.5 10.5 0 010-21z" fill="currentColor" />
    </svg>
  )
}

function PillLabel({ colour }: { colour: PillColour }) {
  const { t } = useI18n()
  return (
    <>
      <Capsule />
      <span className={styles.pillText}>
        <span className={styles.pillName}>{t(`pills.${colour}.name`)}</span>
        <span className={styles.pillHint}>{t(`pills.${colour}.hint`)}</span>
      </span>
    </>
  )
}

/** The green pill: an on-site button that opens the green pill pages. */
export function GreenPill({ onChoose }: { onChoose: () => void }) {
  return (
    <button type="button" className={`${styles.pill} ${styles.green}`} onClick={onChoose}>
      <PillLabel colour="green" />
    </button>
  )
}

function CardSource({ card }: { card: PillCard }) {
  const { t } = useI18n()
  if (!card.source) {
    return (
      <p className={styles.sourceNeeded}>
        <Icon name="dash" size={16} />
        {t('pills.sourceNeeded')}
      </p>
    )
  }
  return (
    <p className={styles.source}>
      {t('pills.sourceLabel')}{' '}
      {card.source.url ? (
        <ExternalLink href={card.source.url}>{card.source.citation}</ExternalLink>
      ) : (
        card.source.citation
      )}
    </p>
  )
}

/** Back and a Next-or-finish button. Shown at the top and again at the bottom of each red card and green page. */
function PageNav({
  className,
  nextLabel,
  nextIcon,
  onBack,
  onNext,
}: {
  className: string | undefined
  nextLabel: string
  nextIcon: 'arrow-right' | 'check'
  onBack: () => void
  onNext: () => void
}) {
  const { t } = useI18n()
  return (
    <div className={className}>
      <button type="button" className={styles.navButton} onClick={onBack}>
        <Icon name="arrow-left" size={20} />
        {t('pills.back')}
      </button>
      <button type="button" className={`${styles.navButton} ${styles.navNext}`} onClick={onNext}>
        {nextLabel}
        <Icon name={nextIcon} size={20} />
      </button>
    </div>
  )
}

export function PillGameView({ data }: { data: Pills }) {
  const { t, l, lang } = useI18n()
  const reds = data.cards
  const greens = data.green.pages
  const reducer = useMemo(
    () => pillReducer(reds.length, greens.length),
    [reds.length, greens.length],
  )
  const [state, dispatch] = useReducer(reducer, START)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const isFirst = useRef(true)

  // Move focus to each new screen's heading (a new card, the blackout, a green page...).
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    focusElement(headingRef.current)
    // Every new screen starts at the top of the page, even after pressing Next at the bottom.
    window.scrollTo(0, 0)
  }, [state])

  // The page's main heading names the chosen pill (the default title shows only on the choice screen).
  useGameHeading(
    state.screen === 'red'
      ? t('pills.red.name')
      : state.screen === 'blueBlackout' || state.screen === 'blueReality'
        ? t('pills.blue.name')
        : state.screen === 'green'
          ? t('pills.green.name')
          : undefined,
  )

  const redCard = state.screen === 'red' ? reds[state.index] : undefined
  const greenPage = state.screen === 'green' ? greens[state.index] : undefined
  const blackoutDone = useCallback(() => dispatch({ type: 'blackoutDone' }), [])
  const choose = (path: PillPath) => dispatch({ type: 'choose', path })
  const back = () => dispatch({ type: 'back' })
  const startOver = (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.secondary}
        onClick={() => dispatch({ type: 'startOver' })}
      >
        <Icon name="restart" size={20} />
        {t('pills.startOver')}
      </button>
    </div>
  )

  return (
    <div className={styles.game} data-testid="pill-game" data-screen={state.screen}>
      {pillsArePlaceholder(data) && <PlaceholderNotice />}

      {state.screen === 'start' && (
        <section className={styles.screen}>
          <h2 ref={headingRef}>{t('pills.prompt')}</h2>
          <div className={styles.choices}>
            <button
              type="button"
              className={`${styles.pill} ${styles.red}`}
              onClick={() => choose('red')}
            >
              <PillLabel colour="red" />
            </button>
            <button
              type="button"
              className={`${styles.pill} ${styles.blue}`}
              onClick={() => choose('blue')}
            >
              <PillLabel colour="blue" />
            </button>
          </div>
        </section>
      )}

      {state.screen === 'red' && redCard && (
        <section className={styles.screen}>
          <div className={styles.cardHead}>
            <div>
              <h2 ref={headingRef}>
                {t('pills.progress', { n: state.index + 1, total: reds.length })}
              </h2>
            </div>
            <PageNav
              className={styles.cardNav}
              nextLabel={state.index + 1 >= reds.length ? t('pills.exit') : t('pills.next')}
              nextIcon={state.index + 1 >= reds.length ? 'check' : 'arrow-right'}
              onBack={back}
              onNext={() => dispatch({ type: 'next' })}
            />
          </div>
          <ol className={styles.dots} aria-hidden="true">
            {reds.map((_, i) => (
              <li key={i} className={i <= state.index ? styles.dotDone : undefined} />
            ))}
          </ol>
          {redCard.visual ? (
            <RedPillInsight key={state.index} data={redCard} />
          ) : (
            <article className={styles.card}>
              <p className={styles.cardText} lang={localizedLang(redCard.text, lang)}>
                {l(redCard.text)}
              </p>
              <CardSource card={redCard} />
            </article>
          )}
          <PageNav
            className={`${styles.cardNav} ${styles.cardNavBottom}`}
            nextLabel={state.index + 1 >= reds.length ? t('pills.exit') : t('pills.next')}
            nextIcon={state.index + 1 >= reds.length ? 'check' : 'arrow-right'}
            onBack={back}
            onNext={() => dispatch({ type: 'next' })}
          />
        </section>
      )}

      {state.screen === 'blueBlackout' && (
        <BlackoutScreen
          content={data.blue.blackout}
          headingRef={headingRef}
          onDone={blackoutDone}
        />
      )}

      {state.screen === 'blueReality' && (
        <section className={styles.screen}>
          <h2 ref={headingRef} lang={localizedLang(data.blue.reality.title, lang)}>
            {l(data.blue.reality.title)}
          </h2>
          <Loc field={data.blue.reality.text} as="p" />
          <ul className={styles.points}>
            {data.blue.reality.points.map((point, i) => (
              <li key={i}>
                <Icon name="check" size={20} />
                <Loc field={point} />
              </li>
            ))}
          </ul>
          <div className={styles.greenRow}>
            <GreenPill onChoose={() => dispatch({ type: 'takeGreen' })} />
          </div>
        </section>
      )}

      {state.screen === 'green' && greenPage && (
        <section className={styles.screen}>
          <div className={styles.cardHead}>
            <div>
              <h2 ref={headingRef}>
                {t('pills.green.progress', { n: state.index + 1, total: greens.length })}
              </h2>
            </div>
            <PageNav
              className={styles.cardNav}
              nextLabel={state.index + 1 >= greens.length ? t('pills.exit') : t('pills.next')}
              nextIcon={state.index + 1 >= greens.length ? 'check' : 'arrow-right'}
              onBack={back}
              onNext={() => dispatch({ type: state.index + 1 >= greens.length ? 'exit' : 'next' })}
            />
          </div>
          <ol className={`${styles.dots} ${styles.greenDots}`} aria-hidden="true">
            {greens.map((_, i) => (
              <li key={i} className={i <= state.index ? styles.dotDone : undefined} />
            ))}
          </ol>
          <GreenPillPage key={state.index} data={greenPage} />
          <PageNav
            className={`${styles.cardNav} ${styles.cardNavBottom}`}
            nextLabel={state.index + 1 >= greens.length ? t('pills.exit') : t('pills.next')}
            nextIcon={state.index + 1 >= greens.length ? 'check' : 'arrow-right'}
            onBack={back}
            onNext={() => dispatch({ type: state.index + 1 >= greens.length ? 'exit' : 'next' })}
          />
          {startOver}
        </section>
      )}
    </div>
  )
}

export default function PillGame() {
  if (!PILLS.data)
    return <ContentError titleKey="game.error.title" problems={PILLS.errors} level={2} />
  return <PillGameView data={PILLS.data} />
}
