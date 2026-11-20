import { useEffect, useMemo, useReducer, useRef, useState, type HTMLAttributes } from 'react'
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
import { GreenPillPage } from './GreenPillPage'
import { PillGuide, type GuidePill } from './PillGuide'
import { RedPillInsight } from './RedPillInsight'
import { START, pillReducer } from './machine'
import styles from './PillGame.module.css'

type PillColour = GuidePill

/** The pill's name and hint: shown beside the pill on hover or focus, and always on touch screens. */
function PillLabel({ colour }: { colour: PillColour }) {
  const { t } = useI18n()
  return (
    <span className={styles.tip}>
      <span className={styles.pillName}>{t(`pills.${colour}.name`)}</span>
      <span className={styles.pillHint}>{t(`pills.${colour}.hint`)}</span>
    </span>
  )
}

/**
 * A pill in the guide's hand, as a button. Its label opens towards the middle
 * of the screen. The landing screen keeps the same right-hand button when the
 * blue pill becomes the green one, so its colour changes instead of the button
 * being replaced.
 */
function PillButton({
  colour,
  side = 'right',
  onChoose,
  ...rest
}: { colour: PillColour; side?: 'left' | 'right'; onChoose: () => void } & Omit<
  HTMLAttributes<HTMLButtonElement>,
  'onClick' | 'className' | 'type'
>) {
  return (
    <button
      type="button"
      className={`${styles.pill} ${styles[colour]}`}
      onClick={onChoose}
      data-pill={colour}
      data-side={side}
      {...rest}
    >
      <PillLabel colour={colour} />
    </button>
  )
}

/** The green pill: an on-site button that opens the green pill pages. */
export function GreenPill({ onChoose }: { onChoose: () => void }) {
  return <PillButton colour="green" onChoose={onChoose} />
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

  // Move focus to each new screen's heading (a new card, the guide's new line, a green page...).
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    focusElement(headingRef.current)
    // Every new screen starts at the top of the page, even after pressing Next at the bottom.
    window.scrollTo(0, 0)
  }, [state])

  // The page's main heading names the chosen pill. The default title stays on the
  // landing screen, including after the blue pill is tossed, as there is still a choice to make.
  useGameHeading(
    state.screen === 'red'
      ? t('pills.red.name')
      : state.screen === 'green'
        ? t('pills.green.name')
        : undefined,
  )

  const redCard = state.screen === 'red' ? reds[state.index] : undefined
  const greenPage = state.screen === 'green' ? greens[state.index] : undefined
  // On the landing screen after the blue pill: the guide has tossed it and offers green instead.
  const swapped = state.screen === 'blueSwap'
  const offer = swapped ? 'green' : 'blue'
  // The pill being hovered or focused on the landing screen; the guide lifts that hand.
  const [lean, setLean] = useState<GuidePill | null>(null)
  const take = (pill: GuidePill) => {
    setLean(null)
    dispatch(pill === 'green' ? { type: 'takeGreen' } : { type: 'choose', path: pill })
  }
  const leanOn = (pill: GuidePill) => ({
    onPointerEnter: () => setLean(pill),
    onPointerLeave: () => setLean(null),
    onFocus: () => setLean(pill),
    onBlur: () => setLean(null),
  })
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

      {/* One landing section for both the first choice and the swap, so the guide
          stays on screen and plays the swap where he stands. */}
      {(state.screen === 'start' || swapped) && (
        <section className={`${styles.screen} ${styles.landing}`}>
          {swapped ? (
            <h2
              key="swap"
              ref={headingRef}
              className={`${styles.bubble} ${styles.bubbleLong}`}
              lang={localizedLang(data.blue.message, lang)}
            >
              {l(data.blue.message)}
            </h2>
          ) : (
            <h2 key="prompt" ref={headingRef} className={styles.bubble}>
              {t('pills.prompt')}
            </h2>
          )}
          <PillGuide
            offer={offer}
            lean={lean}
            left={
              <PillButton
                colour="red"
                side="left"
                onChoose={() => take('red')}
                {...leanOn('red')}
              />
            }
            right={<PillButton colour={offer} onChoose={() => take(offer)} {...leanOn(offer)} />}
          />
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
