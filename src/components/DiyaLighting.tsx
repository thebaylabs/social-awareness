import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/context'
import { usePrefersReducedMotion } from './motion'
import { focusElement } from './focus'
import { DiyaLamp } from './DiyaLamp'
import { Fuljadi } from './Fuljadi'
import styles from './DiyaLighting.module.css'

/** Visible screen box — prefers visualViewport so mobile chrome doesn’t hide the tip. */
function visibleScreen() {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  if (vv) {
    return {
      left: vv.offsetLeft,
      top: vv.offsetTop,
      width: vv.width,
      height: vv.height,
    }
  }
  return {
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

/** Tip must reach the black vaat (wick); small pad so touch still feels fair. */
function tipNearWick(tipX: number, tipY: number, wick: DOMRect, play: DOMRect): boolean {
  const absX = play.left + tipX
  const absY = play.top + tipY
  const cx = wick.left + wick.width / 2
  const cy = wick.top + wick.height / 2
  const radius = Math.max(wick.width, wick.height) * 0.9 + 22
  const dx = absX - cx
  const dy = absY - cy
  return dx * dx + dy * dy <= radius * radius
}

/**
 * Annakut unveiling: unlit diya, a button that brings out a burning fuljadi
 * above “harmony” to play with, then drag it onto the wick. From the keyboard,
 * Enter or Space on the fuljadi lights the diya and Escape puts it away.
 */
export function DiyaLighting({ onLit }: { onLit?: () => void }) {
  const { t } = useI18n()
  const reducedMotion = usePrefersReducedMotion()
  const playRef = useRef<HTMLDivElement>(null)
  const wickRef = useRef<HTMLSpanElement>(null)
  const lightBtnRef = useRef<HTMLButtonElement>(null)
  const handleRef = useRef<HTMLButtonElement>(null)
  const litNoteRef = useRef<HTMLParagraphElement>(null)
  /** Escape put the fuljadi away: focus goes back to the "Light the diya" button. */
  const returnFocusRef = useRef(false)
  /** The diya was lit from a focused control: focus moves on to the "lit" note. */
  const focusNoteRef = useRef(false)
  // Every visit starts unlit: nothing remembers an earlier lighting.
  const [lit, setLit] = useState(false)
  const [fuljadiOut, setFuljadiOut] = useState(false)
  /** The fuljadi was brought out from the keyboard, so show the key hint. */
  const [byKeyboard, setByKeyboard] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [popping, setPopping] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragOffset = useRef({ x: 0, y: 0 })
  // posRef and litRef are written alongside every setPos / setLit below.
  const posRef = useRef(pos)
  const draggingRef = useRef(false)
  const litRef = useRef(lit)
  const onLitRef = useRef(onLit)
  useEffect(() => {
    onLitRef.current = onLit
  }, [onLit])

  const lightDiya = useCallback(() => {
    if (litRef.current) return
    // The focused control is about to go away; keep focus from falling to <body>.
    const active = document.activeElement
    if (active && (active === handleRef.current || active === lightBtnRef.current)) {
      focusNoteRef.current = true
    }
    litRef.current = true
    setLit(true)
    setLeaving(true)
    draggingRef.current = false
    setDragging(false)
    onLitRef.current?.()
    window.setTimeout(() => {
      setFuljadiOut(false)
      setLeaving(false)
      setPopping(false)
    }, 420)
  }, [])

  /**
   * Tip rests just above the “harmony” word in the theme line, clamped to the
   * visible playfield so it never sits off-screen.
   */
  function restFuljadiAboveHarmony() {
    const mark = document.querySelector<HTMLElement>('[data-harmony]')
    const play = playRef.current
    const playRect = play?.getBoundingClientRect()
    const originX = playRect?.left ?? 0
    const originY = playRect?.top ?? 0
    const maxX = (playRect?.width ?? visibleScreen().width) - 28
    const maxY = (playRect?.height ?? visibleScreen().height) - 28

    if (mark) {
      const r = mark.getBoundingClientRect()
      const gap = Math.min(64, Math.max(40, r.height * 1.6))
      return {
        x: Math.min(Math.max(r.left + r.width / 2 - originX, 28), maxX),
        y: Math.min(Math.max(r.top - gap - originY, 28), maxY),
      }
    }

    // Fallback if the word isn’t in the DOM yet.
    const screen = visibleScreen()
    return {
      x: screen.left + screen.width * 0.62,
      y: screen.top + screen.height * 0.38,
    }
  }

  // Keep the resting tip above harmony if the layout or chrome resizes.
  useEffect(() => {
    if (!fuljadiOut || lit || leaving) return
    const vv = window.visualViewport
    function syncRest() {
      if (draggingRef.current) return
      const next = restFuljadiAboveHarmony()
      posRef.current = next
      setPos(next)
    }
    vv?.addEventListener('resize', syncRest)
    vv?.addEventListener('scroll', syncRest)
    window.addEventListener('resize', syncRest)
    return () => {
      vv?.removeEventListener('resize', syncRest)
      vv?.removeEventListener('scroll', syncRest)
      window.removeEventListener('resize', syncRest)
    }
  }, [fuljadiOut, lit, leaving])

  // Lock page scroll while waving so the fuljadi stays in the visual frame.
  useEffect(() => {
    if (!fuljadiOut || lit) return
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [fuljadiOut, lit])

  // Focus follows the ritual: onto the fuljadi when it comes out, and back to
  // the button if Escape puts it away.
  useEffect(() => {
    if (fuljadiOut) {
      handleRef.current?.focus({ preventScroll: true })
    } else if (returnFocusRef.current) {
      returnFocusRef.current = false
      lightBtnRef.current?.focus({ preventScroll: true })
    }
  }, [fuljadiOut])

  useEffect(() => {
    if (lit && focusNoteRef.current) {
      focusNoteRef.current = false
      focusElement(litNoteRef.current)
    }
  }, [lit])

  // Escape puts the fuljadi away, which also unlocks page scroll.
  useEffect(() => {
    if (!fuljadiOut || lit) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      returnFocusRef.current = true
      draggingRef.current = false
      setDragging(false)
      setPopping(false)
      setFuljadiOut(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fuljadiOut, lit])

  function summonFuljadi(event: ReactMouseEvent<HTMLButtonElement>) {
    if (lit) return
    if (reducedMotion) {
      lightDiya()
      return
    }
    // A click with no pointer behind it (detail 0) came from the keyboard.
    setByKeyboard(event.detail === 0)
    const next = restFuljadiAboveHarmony()
    posRef.current = next
    setPos(next)
    setPopping(true)
    setFuljadiOut(true)
    // Refine once the playfield is mounted (same spot if play is viewport-fixed).
    requestAnimationFrame(() => {
      const refined = restFuljadiAboveHarmony()
      posRef.current = refined
      setPos(refined)
    })
    window.setTimeout(() => setPopping(false), 560)
  }

  function moveTipTo(clientX: number, clientY: number) {
    const play = playRef.current
    const wick = wickRef.current
    if (!play || !wick || litRef.current) return
    const rect = play.getBoundingClientRect()
    const next = {
      x: Math.min(Math.max(clientX - rect.left - dragOffset.current.x, 24), rect.width - 24),
      y: Math.min(Math.max(clientY - rect.top - dragOffset.current.y, 24), rect.height - 24),
    }
    posRef.current = next
    setPos(next)
    if (tipNearWick(next.x, next.y, wick.getBoundingClientRect(), rect)) {
      lightDiya()
    }
  }

  function onFuljadiPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (lit || leaving) return
    event.preventDefault()
    const play = playRef.current
    if (!play) return
    setPopping(false)
    const rect = play.getBoundingClientRect()
    dragOffset.current = {
      x: event.clientX - rect.left - posRef.current.x,
      y: event.clientY - rect.top - posRef.current.y,
    }
    draggingRef.current = true
    setDragging(true)

    const pointerId = event.pointerId
    const target = event.currentTarget
    target.setPointerCapture(pointerId)

    function onMove(ev: PointerEvent) {
      if (!draggingRef.current) return
      moveTipTo(ev.clientX, ev.clientY)
    }

    function onUp() {
      draggingRef.current = false
      setDragging(false)
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      target.removeEventListener('pointercancel', onUp)
      try {
        target.releasePointerCapture(pointerId)
      } catch {
        /* already released */
      }
    }

    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
    target.addEventListener('pointercancel', onUp)
  }

  return (
    <>
      <div className={styles.stage} data-testid="diya-lighting" data-lit={lit ? 'true' : 'false'}>
        <div className={styles.diyaWrap}>
          <DiyaLamp lit={lit} />
          <span ref={wickRef} className={styles.wickHit} data-testid="diya-wick-hit" />
        </div>

        {!lit && !fuljadiOut && (
          <>
            <p className={styles.hint}>{t('intro.diya.hint')}</p>
            <button
              type="button"
              ref={lightBtnRef}
              className={styles.lightBtn}
              onClick={summonFuljadi}
              data-testid="light-diya"
            >
              {t('intro.diya.light')}
            </button>
          </>
        )}

        {!lit && fuljadiOut && !leaving && (
          <p className={styles.dragHint}>{t(byKeyboard ? 'intro.diya.keys' : 'intro.diya.drag')}</p>
        )}

        {lit && (
          <p ref={litNoteRef} className={styles.litNote}>
            {t('intro.diya.lit')}
          </p>
        )}
      </div>

      {fuljadiOut &&
        createPortal(
          <div ref={playRef} className={styles.playfield} data-testid="fuljadi-playfield">
            <Fuljadi
              x={pos.x}
              y={pos.y}
              label={t('intro.diya.fuljadi')}
              dragging={dragging}
              leaving={leaving}
              popping={popping}
              handleRef={handleRef}
              onPointerDown={onFuljadiPointerDown}
              onActivate={lightDiya}
            />
          </div>,
          document.body,
        )}
    </>
  )
}
