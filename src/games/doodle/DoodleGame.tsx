import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useI18n } from '../../i18n/context'
import type { MessageKey } from '../../i18n/messages'
import { localizedLang } from '../../i18n/localized'
import { FONT_STACK, fontReady } from '../../i18n/fonts'
import { readStored, writeStored } from '../../i18n/storage'
import type { Lang } from '../../i18n/languages'
import { STORAGE_KEYS } from '../../config/site'
import { Icon } from '../../components/Icon'
import { ContentError } from '../../components/ContentError'
import { PlaceholderNotice } from '../../components/Placeholder'
import { focusElement } from '../../components/focus'
import { DOODLE } from '../../content/games'
import type { DoodleContent } from '../../content/schemas'
import { drawFrame } from './draw'
import { NO_INPUT, WORLD, createState, step, type SimInput, type SimState } from './sim'
import { MAX_NAME_LENGTH, checkName, type NameProblem } from './name'
import { LeaderboardPanel } from './LeaderboardPanel'
import styles from './DoodleGame.module.css'

type Phase = 'name' | 'playing' | 'paused' | 'over'

const NAME_PROBLEMS: Record<NameProblem, MessageKey> = {
  empty: 'doodle.name.error.empty',
  tooLong: 'doodle.name.error.tooLong',
  characters: 'doodle.name.error.characters',
  blocked: 'doodle.name.error.blocked',
}

function readName(): string {
  const check = checkName(readStored(STORAGE_KEYS.doodleName) ?? '')
  return check.ok ? check.name : ''
}

interface PointerHold {
  id: number
  startX: number
  x: number
  dragging: boolean
}

/** How far (in logical pixels) a finger must move before a press becomes a drag. */
const DRAG_THRESHOLD = 10
/** How long the caught word stays on screen, in seconds. */
const CATCH_FLASH = 1.2

/** Combine the pointer and keys into the simulation's input. A drag wins over holding a side. */
function readInput(pointer: PointerHold | null, keys: { left: boolean; right: boolean }): SimInput {
  if (pointer) {
    return pointer.dragging
      ? { targetX: pointer.x, dir: 0 }
      : { targetX: null, dir: pointer.x < WORLD.width / 2 ? -1 : 1 }
  }
  return keys.left === keys.right ? NO_INPUT : { targetX: null, dir: keys.left ? -1 : 1 }
}

function readBest(): number {
  const n = Number(readStored(STORAGE_KEYS.doodleBest))
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

function cssColour(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

export function DoodleGameView({ content }: { content: DoodleContent }) {
  const { t, l, lang } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const playAgainRef = useRef<HTMLButtonElement>(null)
  const resumeRef = useRef<HTMLButtonElement>(null)
  const simRef = useRef<SimState>(
    createState(
      content.config,
      content.items.map((i) => i.kind),
    ),
  )
  const keysRef = useRef({ left: false, right: false })
  const pointerRef = useRef<PointerHold | null>(null)

  const nameInputRef = useRef<HTMLInputElement>(null)
  const nameId = useId()
  const [phase, setPhase] = useState<Phase>('name')
  const [playerName, setPlayerName] = useState(readName)
  const [nameDraft, setNameDraft] = useState(playerName)
  const [nameProblem, setNameProblem] = useState<NameProblem | null>(null)
  const [runId, setRunId] = useState(0)
  const [score, setScore] = useState(0)
  const [caught, setCaught] = useState<number | null>(null)
  const [hit, setHit] = useState<number | null>(null)
  const [best, setBest] = useState(readBest)
  const [isNewBest, setIsNewBest] = useState(false)
  const [fontLang, setFontLang] = useState<Lang | null>(null)

  const labels = useMemo(() => content.items.map((i) => l(i.label)), [content, l])
  const icons = useMemo(() => content.items.map((i) => i.icon), [content])
  const fontsReady = fontLang === lang

  // Labels are drawn on the canvas, which does not wait for web fonts: load the
  // active script's font before the first frame.
  useEffect(() => {
    let alive = true
    void fontReady(lang, 13).then(() => {
      if (alive) setFontLang(lang)
    })
    return () => {
      alive = false
    }
  }, [lang])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const scale = canvas.width / WORLD.width
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    drawFrame(ctx, {
      state: simRef.current,
      icons,
      labels,
      font: `700 13px ${FONT_STACK[lang]}`,
      palette: { item: cssColour('--doodle-good', '#ff8a3d') },
    })
  }, [icons, labels, lang])

  // Fixed logical size, scaled to the container width and the device pixel ratio.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const width = canvas.clientWidth
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(((width * WORLD.height) / WORLD.width) * dpr)
      render()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [render])

  useEffect(() => {
    if (fontsReady) render()
  }, [fontsReady, render])

  // The game loop. Motion uses the time between frames (clamped inside step()).
  useEffect(() => {
    if (phase !== 'playing' || !fontsReady) return
    let frame = 0
    let last = performance.now()
    let shownScore = simRef.current.score
    let shownCatch = simRef.current.lastCatch
    const tick = (now: number) => {
      const s = step(
        simRef.current,
        readInput(pointerRef.current, keysRef.current),
        (now - last) / 1000,
        Math.random,
      )
      last = now
      simRef.current = s
      render()
      if (s.score !== shownScore) {
        shownScore = s.score
        setScore(s.score)
      }
      if (s.lastCatch !== shownCatch) {
        shownCatch = s.lastCatch
        setCaught(s.lastCatch?.item ?? null)
      } else if (s.lastCatch && s.time - s.lastCatch.at > CATCH_FLASH) {
        setCaught(null)
      }
      if (s.phase === 'over') {
        setHit(s.hit)
        setPhase('over')
        if (s.score > readBest()) {
          writeStored(STORAGE_KEYS.doodleBest, String(s.score))
          setBest(s.score)
          setIsNewBest(true)
        }
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [phase, fontsReady, render])

  // Pause when the tab is hidden.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setPhase((p) => (p === 'playing' ? 'paused' : p))
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Arrow keys and A / D.
  useEffect(() => {
    const set = (event: KeyboardEvent, down: boolean) => {
      const key = event.key.toLowerCase()
      const side =
        key === 'arrowleft' || key === 'a'
          ? 'left'
          : key === 'arrowright' || key === 'd'
            ? 'right'
            : null
      if (!side) {
        if (down && key === 'escape') setPhase((p) => (p === 'playing' ? 'paused' : p))
        return
      }
      keysRef.current[side] = down
      if (phase === 'playing' && key.startsWith('arrow')) event.preventDefault()
    }
    const onDown = (e: KeyboardEvent) => set(e, true)
    const onUp = (e: KeyboardEvent) => set(e, false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [phase])

  // Focus the main button of each overlay as it appears.
  useEffect(() => {
    if (phase === 'over') focusElement(playAgainRef.current)
    if (phase === 'paused') focusElement(resumeRef.current)
  }, [phase])

  const toWorldX = (event: ReactPointerEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    return ((event.clientX - rect.left) / rect.width) * WORLD.width
  }
  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (phase !== 'playing') return
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Capture is a nicety; the drag still works without it.
    }
    const x = toWorldX(event)
    // Pressing on the doodle itself starts a drag straight away.
    const onDoodle = Math.abs(x - simRef.current.doodleX) < 44
    pointerRef.current = { id: event.pointerId, startX: x, x, dragging: onDoodle }
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = pointerRef.current
    if (!p || p.id !== event.pointerId) return
    p.x = toWorldX(event)
    if (Math.abs(p.x - p.startX) > DRAG_THRESHOLD) p.dragging = true
  }
  const onPointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointerRef.current?.id === event.pointerId) pointerRef.current = null
  }

  const start = () => {
    simRef.current = createState(
      content.config,
      content.items.map((i) => i.kind),
    )
    keysRef.current = { left: false, right: false }
    pointerRef.current = null
    setScore(0)
    setCaught(null)
    setHit(null)
    setIsNewBest(false)
    setRunId((n) => n + 1)
    setPhase('playing')
    areaRef.current?.scrollIntoView({ block: 'nearest' })
    focusElement(areaRef.current)
  }
  const submitName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const check = checkName(nameDraft)
    if (!check.ok) {
      setNameProblem(check.problem)
      nameInputRef.current?.focus()
      return
    }
    setNameProblem(null)
    setNameDraft(check.name)
    setPlayerName(check.name)
    writeStored(STORAGE_KEYS.doodleName, check.name)
    start()
  }
  const changeName = () => {
    setPhase('name')
    // Wait for the name form to render before moving focus into it.
    requestAnimationFrame(() => nameInputRef.current?.focus())
  }
  const resume = () => {
    setPhase('playing')
    focusElement(areaRef.current)
  }

  const hitItem = hit !== null ? content.items[hit] : undefined
  const isPlaceholder = content.items.some((i) => i.placeholder)

  return (
    <div className={styles.game} data-testid="doodle-game" data-phase={phase}>
      {isPlaceholder && <PlaceholderNotice />}
      <p className={styles.howTo}>{t('doodle.howTo')}</p>
      <ul className={styles.legend}>
        <li>
          <span className={`${styles.shape} ${styles.round}`} aria-hidden="true" />
          {t('doodle.legend.good')}
        </li>
        <li>
          <span className={`${styles.shape} ${styles.round}`} aria-hidden="true" />
          {t('doodle.legend.bad')}
        </li>
      </ul>
      <p className={styles.controls}>
        {t('doodle.controls.touch')} {t('doodle.controls.keys')}
      </p>

      <div className={styles.hud}>
        <p className={styles.score} data-testid="doodle-score">
          {t('doodle.score', { n: score })}
        </p>
        <p className={styles.best}>{t('doodle.best', { n: best })}</p>
        {playerName && phase !== 'name' && (
          <p className={styles.player}>{t('doodle.player', { name: playerName })}</p>
        )}
        <p className={styles.caught} aria-live="polite">
          {caught !== null && phase === 'playing'
            ? t('doodle.caught', { label: labels[caught] ?? '' })
            : ''}
        </p>
        {phase === 'playing' && (
          <button type="button" className={styles.pause} onClick={() => setPhase('paused')}>
            <Icon name="pause" size={20} />
            {t('doodle.pause')}
          </button>
        )}
      </div>

      <div className={styles.area} ref={areaRef} tabIndex={-1}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          role="img"
          aria-label={t('doodle.area')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onContextMenu={(e) => e.preventDefault()}
          data-testid="doodle-canvas"
        />

        {phase === 'name' && (
          <form
            className={`${styles.overlay} ${styles.nameForm}`}
            onSubmit={submitName}
            noValidate
            data-testid="doodle-name"
          >
            <label htmlFor={nameId} className={styles.nameLabel}>
              {t('doodle.name.label')}
            </label>
            <input
              id={nameId}
              ref={nameInputRef}
              className={styles.nameInput}
              type="text"
              value={nameDraft}
              onChange={(e) => {
                setNameDraft(e.target.value)
                setNameProblem(null)
              }}
              maxLength={MAX_NAME_LENGTH * 4}
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              enterKeyHint="go"
              aria-invalid={nameProblem !== null}
              aria-describedby={`${nameId}-hint${nameProblem ? ` ${nameId}-error` : ''}`}
            />
            <p id={`${nameId}-hint`} className={styles.nameHint}>
              {t('doodle.name.hint')}
            </p>
            {nameProblem && (
              <p id={`${nameId}-error`} className={styles.nameError} role="alert">
                {t(NAME_PROBLEMS[nameProblem])}
              </p>
            )}
            <button type="submit" className={styles.primary} disabled={!fontsReady}>
              <Icon name="play" size={24} />
              {t('doodle.start')}
            </button>
          </form>
        )}

        {phase === 'paused' && (
          <div className={styles.overlay}>
            <h2 className={styles.overlayTitle}>{t('doodle.paused')}</h2>
            <button type="button" ref={resumeRef} className={styles.primary} onClick={resume}>
              <Icon name="play" size={24} />
              {t('doodle.resume')}
            </button>
          </div>
        )}

        {phase === 'over' && (
          <div className={`${styles.overlay} ${styles.overPanel}`} data-testid="doodle-over">
            <h2 className={styles.overlayTitle}>{t('doodle.over')}</h2>
            <p className={styles.result}>
              {score === 1 ? t('doodle.result.one') : t('doodle.result', { n: score })}
            </p>
            {isNewBest && <p>{t('doodle.newBest')}</p>}
            {hitItem && (
              <div className={styles.hit}>
                <span className={`${styles.shape} ${styles.round}`} aria-hidden="true" />
                <div>
                  <p className={styles.hitLabel} lang={localizedLang(hitItem.label, lang)}>
                    {t('doodle.hit', { label: l(hitItem.label) })}
                  </p>
                  {hitItem.explanation && (
                    <p lang={localizedLang(hitItem.explanation, lang)}>{l(hitItem.explanation)}</p>
                  )}
                </div>
              </div>
            )}
            <LeaderboardPanel key={runId} name={playerName} score={score} />
            <div className={styles.actions}>
              <button type="button" ref={playAgainRef} className={styles.primary} onClick={start}>
                <Icon name="restart" size={24} />
                {t('doodle.playAgain')}
              </button>
              <button type="button" className={styles.secondary} onClick={changeName}>
                {t('doodle.changeName')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DoodleGame() {
  if (!DOODLE.data)
    return <ContentError titleKey="game.error.title" problems={DOODLE.errors} level={2} />
  return <DoodleGameView content={DOODLE.data} />
}
