import { useEffect, useId, useRef, type PointerEvent as ReactPointerEvent, type Ref } from 'react'
import { usePrefersReducedMotion } from './motion'
import styles from './Fuljadi.module.css'

interface FuljadiProps {
  x: number
  y: number
  label: string
  dragging: boolean
  leaving?: boolean
  /** Short pop-in when the fuljadi first appears at the bottom of the screen. */
  popping?: boolean
  /** The drag handle, so the parent can move focus onto it. */
  handleRef?: Ref<HTMLButtonElement>
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
  /** Pressed from the keyboard (Enter or Space) instead of dragged. */
  onActivate?: () => void
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  hue: number
}

/** Square particle field — keeps the sparkle perimeter round in 2D. */
const CANVAS = 280
const TIP = CANVAS / 2

/**
 * A burning fuljadi: thin stem with a round 2D sparkler halo.
 * The spark canvas sits in a square wrapper (not clipped by the stick button).
 */
export function Fuljadi({
  x,
  y,
  label,
  dragging,
  leaving,
  popping,
  handleRef,
  onPointerDown,
  onActivate,
}: FuljadiProps) {
  const reducedMotion = usePrefersReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sparksRef = useRef<Spark[]>([])
  const tipGradId = useId().replace(/:/g, '')

  useEffect(() => {
    if (reducedMotion || leaving) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frame = 0
    let raf = 0
    let running = true
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = CANVAS * dpr
    canvas.height = CANVAS * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    function emit(burst: number) {
      for (let i = 0; i < burst; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1.8 + Math.random() * 4.6
        sparksRef.current.push({
          x: TIP + (Math.random() - 0.5) * 2,
          y: TIP + (Math.random() - 0.5) * 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 14 + Math.random() * 20,
          size: 0.9 + Math.random() * 1.8,
          hue: Math.random() < 0.55 ? 42 + Math.random() * 16 : 30 + Math.random() * 12,
        })
      }
      if (sparksRef.current.length > 320) {
        sparksRef.current.splice(0, sparksRef.current.length - 320)
      }
    }

    function tick() {
      if (!running || !ctx) return
      frame += 1
      emit(12)
      if (frame % 3 === 0) emit(10)

      ctx.clearRect(0, 0, CANVAS, CANVAS)

      // Round soft bloom.
      const bloom = ctx.createRadialGradient(TIP, TIP, 0, TIP, TIP, 56)
      bloom.addColorStop(0, 'rgba(255, 250, 220, 1)')
      bloom.addColorStop(0.2, 'rgba(255, 200, 80, 0.65)')
      bloom.addColorStop(0.45, 'rgba(255, 140, 40, 0.22)')
      bloom.addColorStop(1, 'rgba(255, 120, 40, 0)')
      ctx.fillStyle = bloom
      ctx.beginPath()
      ctx.arc(TIP, TIP, 56, 0, Math.PI * 2)
      ctx.fill()

      const next: Spark[] = []
      for (const spark of sparksRef.current) {
        spark.life += 1
        spark.x += spark.vx
        spark.y += spark.vy
        spark.vx *= 0.97
        spark.vy *= 0.97
        if (spark.life >= spark.maxLife) continue
        next.push(spark)

        const t = spark.life / spark.maxLife
        const alpha = t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9
        // Short radial streaks + bright dots → reads as a round spray, not needles.
        const len = 2.5 + (1 - t) * 5
        const speed = Math.hypot(spark.vx, spark.vy) || 1
        const nx = spark.vx / speed
        const ny = spark.vy / speed

        ctx.strokeStyle = `hsla(${spark.hue}, 100%, ${72 + (1 - t) * 20}%, ${alpha})`
        ctx.lineWidth = spark.size * (1 - t * 0.35)
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(spark.x, spark.y)
        ctx.lineTo(spark.x - nx * len, spark.y - ny * len)
        ctx.stroke()

        ctx.fillStyle = `rgba(255, 255, 245, ${alpha})`
        ctx.beginPath()
        ctx.arc(spark.x, spark.y, spark.size * 0.55 * (1 - t * 0.4), 0, Math.PI * 2)
        ctx.fill()
      }
      sparksRef.current = next

      ctx.fillStyle = '#fffef6'
      ctx.beginPath()
      ctx.arc(TIP, TIP, 3.6 + Math.sin(frame / 4) * 0.7, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255, 205, 95, 0.95)'
      ctx.beginPath()
      ctx.arc(TIP, TIP, 6.2 + Math.sin(frame / 5) * 0.9, 0, Math.PI * 2)
      ctx.fill()

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      sparksRef.current = []
    }
  }, [reducedMotion, leaving])

  return (
    <div
      className={`${styles.fuljadi} ${dragging ? styles.dragging : ''} ${leaving ? styles.leaving : ''} ${popping ? styles.popping : ''}`}
      style={{ left: x, top: y }}
      data-testid="fuljadi"
    >
      <canvas
        ref={canvasRef}
        className={styles.sparks}
        width={CANVAS}
        height={CANVAS}
        aria-hidden="true"
      />
      {/* Drag handle = thin stem only; sparks live in the square layer above. */}
      <button
        ref={handleRef}
        type="button"
        className={styles.handle}
        aria-label={label}
        aria-grabbed={dragging}
        onPointerDown={onPointerDown}
        // Keyboard presses arrive as a click with detail 0; a mouse click or
        // tap (detail 1+) must not light the diya without the drag.
        onClick={(event) => {
          if (event.detail === 0) onActivate?.()
        }}
      >
        <svg className={styles.art} viewBox="0 0 52 200" aria-hidden="true" focusable="false">
          <defs>
            <radialGradient id={`fuljadi-tip-${tipGradId}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff8d6" />
              <stop offset="40%" stopColor="#ffd36b" />
              <stop offset="100%" stopColor="#ff8a2a" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`fuljadi-stick-${tipGradId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4a06a" />
              <stop offset="35%" stopColor="#a56a3a" />
              <stop offset="100%" stopColor="#5a3218" />
            </linearGradient>
          </defs>
          <rect
            x="24.5"
            y="34"
            width="3"
            height="158"
            rx="1.5"
            fill={`url(#fuljadi-stick-${tipGradId})`}
          />
          <rect x="25" y="36" width="1" height="150" rx="0.5" fill="rgb(255 220 170 / 30%)" />
          {reducedMotion && (
            <>
              <circle cx="26" cy="30" r="16" fill={`url(#fuljadi-tip-${tipGradId})`} />
              <circle cx="26" cy="30" r="5" fill="#ffe9a8" />
              <circle cx="26" cy="30" r="2.5" fill="#fff" />
            </>
          )}
        </svg>
      </button>
    </div>
  )
}
