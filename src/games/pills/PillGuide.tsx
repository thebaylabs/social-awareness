import { useId, useState, type CSSProperties, type ReactNode } from 'react'
import styles from './PillGuide.module.css'

/**
 * The pill game's host: an original cartoon guide, an older man with a touch
 * of grey at the temples and a neat moustache, in a cream kurta and a maroon
 * Nehru jacket. Original drawing made for this project.
 *
 * He nods, holds out two closed hands, then opens them one at a time to show
 * a red pill and a blue pill. When the blue pill is chosen (`offer` turns to
 * "green"), he grins, winks and flicks the blue pill away over his shoulder,
 * and a green pill comes down on a beam of light into his empty hand.
 *
 * Decorative: the pill buttons below carry the choice in text, so the drawing
 * is hidden from assistive technology. For pointer users, the pills in his
 * hands can also be tapped, and `lean` makes him lift the hand of the pill
 * being hovered or focused.
 */

export type GuidePill = 'red' | 'blue' | 'green'

const SKIN = '#bf8152'
const SKIN_SHADE = '#9c6237'
const HAIR = '#231517'
const GREY = '#c9c2bb'
const KURTA = '#efe1c3'
const KURTA_SHADE = '#cdb68e'
const JACKET = '#6e1f2e'
const JACKET_DEEP = '#4f1420'
const GOLD = '#edbd74'
const MOUTH = '#5b2a24'

const PILL_COLOURS: Record<GuidePill, { dark: string; light: string; glow: string }> = {
  red: { dark: '#b3261e', light: '#e8574a', glow: '#ff7a66' },
  blue: { dark: '#1557b0', light: '#4c8ef0', glow: '#7fb3ff' },
  green: { dark: '#1e6b3a', light: '#3fae63', glow: '#7be0a0' },
}

/** Where the pill rests on the open palm, in the drawing's coordinates. */
const PILL_X = 44
const PILL_Y = 167

/** When each hand opens. His right hand (the viewer's left) first, then the other. */
const REVEAL = { left: '1.45s', right: '2s' }

/**
 * How an arm shows its pill: `reveal` opens the hand on arrival; `swap`
 * tosses the blue pill away and brings a green one down into the hand.
 */
type ArmMode = 'reveal' | 'swap'

function Capsule({ pill }: { pill: GuidePill }) {
  const colour = PILL_COLOURS[pill]
  return (
    <g transform={`translate(${PILL_X} ${PILL_Y}) rotate(-14)`}>
      <rect x="-17" y="-7.5" width="34" height="15" rx="7.5" fill={colour.light} />
      <path d="M0 -7.5 H-9.5 A7.5 7.5 0 0 0 -9.5 7.5 H0 Z" fill={colour.dark} />
      <rect x="-12" y="-4.6" width="20" height="2.8" rx="1.4" fill="#fff" opacity="0.55" />
    </g>
  )
}

/** A ring and rays of light, once, when a pill appears in the hand. */
function Burst({ pill, className }: { pill: GuidePill; className: string | undefined }) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315]
    .map((deg) => {
      const rad = (deg * Math.PI) / 180
      const [c, s] = [Math.cos(rad), Math.sin(rad)]
      const x1 = PILL_X + c * 23
      const y1 = PILL_Y + s * 23
      return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${(x1 + c * 7).toFixed(1)} ${(y1 + s * 7).toFixed(1)}`
    })
    .join(' ')
  return (
    <g className={className} stroke={PILL_COLOURS[pill].glow} strokeLinecap="round" fill="none">
      <circle cx={PILL_X} cy={PILL_Y} r="18" strokeWidth="2.5" />
      <path d={rays} strokeWidth="2" />
    </g>
  )
}

/** The soft glow under a pill and the dashed ring shown on hover. */
function Glow({
  pill,
  gid,
  className,
}: {
  pill: GuidePill
  gid: string
  className: string | undefined
}) {
  return (
    <>
      <circle
        className={className}
        cx={PILL_X}
        cy={PILL_Y}
        r="25"
        fill={`url(#${gid}-glow-${pill})`}
      />
      <circle
        className={styles.halo}
        cx={PILL_X}
        cy={PILL_Y}
        r="27"
        fill="none"
        stroke={PILL_COLOURS[pill].glow}
        strokeWidth="2"
        strokeDasharray="4 5"
      />
    </>
  )
}

/** A four-point star. */
function starPath(x: number, y: number, s: number) {
  return `M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z`
}

/**
 * One arm, drawn as his right arm (on the viewer's left). The other side
 * reuses it mirrored, so both arms share the same shoulder pivot.
 */
function Arm({ pill, mode, gid }: { pill: GuidePill; mode: ArmMode; gid: string }) {
  const swapping = mode === 'swap'
  return (
    <g className={styles.arm} data-pill={pill}>
      <g className={styles.lift}>
        <g className={swapping ? `${styles.flickWrap} ${styles.flick}` : styles.flickWrap}>
          <path
            d="M116 140 Q98 166 90 190 L60 182"
            fill="none"
            stroke={KURTA}
            strokeWidth="22"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M101 160 Q94 174 90 186"
            fill="none"
            stroke={KURTA_SHADE}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M67 172.5 L61.5 193.5"
            stroke={KURTA_SHADE}
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* The open palm, facing up. */}
          <path
            d="M64 176 C54 178.5 40 178.5 29 174.5 C27 178.5 30 184 36 187 C46 191 58 190 65 188 Z"
            fill={SKIN}
          />
          <path
            d="M31.5 178.5 q3 3 7.5 3.8 M34 183 q3 2 7 2.2"
            fill="none"
            stroke={SKIN_SHADE}
            strokeWidth="1.4"
            strokeLinecap="round"
          />

          {/* A fresh group per mode, so each mode's animations start from the beginning. */}
          {swapping ? (
            <g key="swap">
              {/* The blue pill, flicked up and away over his shoulder, ending in a twinkle. */}
              <g className={styles.toss}>
                <Capsule pill="blue" />
              </g>
              <path className={styles.ping} d={starPath(24, 22, 9)} fill="#fff6e0" />
              {/* A beam of light, and the green pill coming down it into his hand. */}
              <rect
                className={styles.beam}
                x={PILL_X - 15}
                y="14"
                width="30"
                height={PILL_Y - 10}
                rx="15"
                fill={`url(#${gid}-beam)`}
              />
              <g className={styles.floatLand}>
                <Glow pill="green" gid={gid} className={styles.glowLand} />
                <Burst pill="green" className={styles.burstLand} />
                <g className={styles.descend}>
                  <Capsule pill="green" />
                </g>
              </g>
            </g>
          ) : (
            <g key={`reveal-${pill}`} className={styles.float}>
              <Glow pill={pill} gid={gid} className={styles.glow} />
              <Burst pill={pill} className={styles.burst} />
              <g className={styles.pop}>
                <Capsule pill={pill} />
              </g>
            </g>
          )}

          {/* Curled fingers over the pill. They swing open at the knuckles to show it. */}
          {!swapping && (
            <g className={styles.fingers}>
              <path
                d="M28 177 C25 165 33 156 45 156.5 C56 157 62 163 62.5 171 C63 177 58 179.5 52 179 L30 179.5 Z"
                fill={SKIN}
              />
              <path
                d="M37 158.5 q-2.5 5 0 9.5 M45.5 157.5 q-2.5 5 0 10.5 M54 159.5 q-2.5 5 0 9.5"
                fill="none"
                stroke={SKIN_SHADE}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </g>
          )}
        </g>
      </g>
    </g>
  )
}

/** A small four-point star that twinkles. */
function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: string }) {
  return (
    <path
      className={styles.sparkle}
      style={{ '--delay': delay } as CSSProperties}
      d={starPath(x, y, size)}
      fill="#ffdc9e"
    />
  )
}

/**
 * Where his palms are, as a share of the drawing's width and height, so the
 * real pill buttons can be laid over them.
 */
const VIEW = { x: 0, y: 14, width: 320, height: 222 }
const handStyle = (x: number): CSSProperties => ({
  left: `${(((x - VIEW.x) / VIEW.width) * 100).toFixed(2)}%`,
  top: `${(((PILL_Y - VIEW.y) / VIEW.height) * 100).toFixed(2)}%`,
})

export function PillGuide({
  offer,
  lean,
  left,
  right,
}: {
  /** The pill in his other hand: blue at first, green once the blue one is tossed. */
  offer: 'blue' | 'green'
  lean: GuidePill | null
  /** The controls laid over his hands: the red pill (viewer's left) and the offered pill. */
  left?: ReactNode
  right?: ReactNode
}) {
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  // The toss plays only when blue turns to green while he is on screen. Arriving
  // with green already on offer (Back from a green page), he simply opens his hands.
  const [arrivedWith] = useState(offer)
  const swapping = offer === 'green' && arrivedWith === 'blue'
  const grin = offer === 'green'
  const leanSide = lean === 'red' ? 'left' : lean ? 'right' : undefined

  return (
    <div className={styles.stage}>
      <div className={styles.frame}>
        <svg
          className={styles.guide}
          viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.width} ${VIEW.height}`}
          aria-hidden="true"
          focusable="false"
          data-testid="pill-guide"
          data-offer={offer}
          data-lean={leanSide}
        >
          <defs>
            <radialGradient id={`${gid}-aura`}>
              <stop offset="0" stopColor="#ffd36b" stopOpacity="0.32" />
              <stop offset="0.55" stopColor="#f39b3a" stopOpacity="0.1" />
              <stop offset="1" stopColor="#f39b3a" stopOpacity="0" />
            </radialGradient>
            {(['red', 'blue', 'green'] as const).map((pill) => (
              <radialGradient key={pill} id={`${gid}-glow-${pill}`}>
                <stop offset="0" stopColor={PILL_COLOURS[pill].glow} stopOpacity="0.75" />
                <stop offset="1" stopColor={PILL_COLOURS[pill].glow} stopOpacity="0" />
              </radialGradient>
            ))}
            <linearGradient id={`${gid}-beam`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={PILL_COLOURS.green.glow} stopOpacity="0" />
              <stop offset="1" stopColor={PILL_COLOURS.green.glow} stopOpacity="0.55" />
            </linearGradient>
            <linearGradient id={`${gid}-kurta`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f6ead0" />
              <stop offset="1" stopColor="#dccaa3" />
            </linearGradient>
            <linearGradient id={`${gid}-fade`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0.72" stopColor="#fff" />
              <stop offset="1" stopColor="#000" />
            </linearGradient>
            <mask
              id={`${gid}-mask`}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="320"
              height="236"
            >
              <rect width="320" height="236" fill={`url(#${gid}-fade)`} />
            </mask>
          </defs>

          <circle className={styles.aura} cx="160" cy="128" r="128" fill={`url(#${gid}-aura)`} />
          <Sparkle x={36} y={58} size={5} delay="0s" />
          <Sparkle x={286} y={46} size={6} delay="1.1s" />
          <Sparkle x={270} y={104} size={3.5} delay="2s" />
          <Sparkle x={58} y={112} size={3.5} delay="0.6s" />
          <Sparkle x={222} y={30} size={3} delay="1.6s" />

          <g className={styles.figure}>
            <g className={styles.breathe}>
              {/* Body: neck, kurta and Nehru jacket, fading out at the bottom edge. */}
              <g mask={`url(#${gid}-mask)`}>
                <path d="M149 102 h22 v20 q-11 6 -22 0 Z" fill={SKIN_SHADE} />
                <path
                  d="M92 236 C92 166 110 128 160 121 C210 128 228 166 228 236 Z"
                  fill={`url(#${gid}-kurta)`}
                />
                <path
                  d="M106 236 C106 178 120 140 147 128 L160 133 L173 128 C200 140 214 178 214 236 Z"
                  fill={JACKET}
                />
                <path d="M160 133 V236" stroke={JACKET_DEEP} strokeWidth="2" />
                {[146, 162, 178, 194, 210].map((y) => (
                  <circle key={y} cx="163.5" cy={y} r="2.4" fill={GOLD} />
                ))}
                <path d="M176 158 l18 -2" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" />
                <path d="M179 157.6 l3.5 -6 l3 5 l3 -6 l3 6.2 Z" fill="#ffc05b" />
                <path
                  d="M145 120 Q160 126 175 120 L175 128 Q160 134 145 128 Z"
                  fill={JACKET_DEEP}
                />
                <path
                  d="M145 128 Q160 134 175 128"
                  fill="none"
                  stroke={GOLD}
                  strokeWidth="1.4"
                  opacity="0.8"
                />
              </g>

              {/* Head */}
              <g className={styles.head}>
                <g className={styles.nod}>
                  <ellipse cx="129" cy="80" rx="6" ry="8.5" fill={SKIN_SHADE} />
                  <ellipse cx="191" cy="80" rx="6" ry="8.5" fill={SKIN_SHADE} />
                  <ellipse cx="160" cy="76" rx="31" ry="35" fill={SKIN} />
                  {/* Short, side-parted hair, grey at the temples. */}
                  <path
                    d="M129 82 C124 52 141 37 163 38 C185 39 198 54 191 82 C189 71 186 63 181 59 C172 54 160 53 150 51 C143 56 136 64 133 73 Z"
                    fill={HAIR}
                  />
                  <path d="M129.5 81 C129 75.5 130.5 71 133 68 L133.6 75 Z" fill={GREY} />
                  <path d="M190.5 81 C191 75.5 189.5 71 187 67.5 L186.2 74.5 Z" fill={GREY} />
                  <path
                    d="M146 43 C148 46 149 49 150 51 M158 42 q9 -2 17 3 M170 47 q6 2 10 7"
                    fill="none"
                    stroke={GREY}
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M150 60 q10 -2.5 20 0"
                    fill="none"
                    stroke={SKIN_SHADE}
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                  <g className={`${styles.brow} ${styles.browLeft}`}>
                    <path
                      d="M139.5 68 q8 -5 15 -0.5"
                      fill="none"
                      stroke={HAIR}
                      strokeWidth="3.4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M147 65.6 l3 0.4"
                      stroke={GREY}
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                  </g>
                  <g className={`${styles.brow} ${styles.browRight}`}>
                    <path
                      d="M165.5 67.5 q7 -4.5 15 0.5"
                      fill="none"
                      stroke={HAIR}
                      strokeWidth="3.4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M171 65.4 l3 0.2"
                      stroke={GREY}
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                  </g>
                  <g className={styles.gaze}>
                    <g className={styles.blink}>
                      <g>
                        <ellipse cx="148" cy="78" rx="3.3" ry="4.2" fill={HAIR} />
                        <circle cx="149.2" cy="76.6" r="1.1" fill="#fff" />
                      </g>
                      {/* He winks with this eye as he tosses the blue pill. */}
                      <g className={swapping ? styles.wink : undefined}>
                        <ellipse cx="172" cy="78" rx="3.3" ry="4.2" fill={HAIR} />
                        <circle cx="173.2" cy="76.6" r="1.1" fill="#fff" />
                      </g>
                    </g>
                  </g>
                  {/* Smile lines at the eyes and beside the nose. */}
                  <path
                    d="M139.5 76.5 l-4 -2 M139.5 80 l-4 1.2 M180.5 76.5 l4 -2 M180.5 80 l4 1.2 M143 84.5 q5 2 10 0 M167 84.5 q5 2 10 0"
                    fill="none"
                    stroke={SKIN_SHADE}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M147 90 q-3 7 1 13 M173 90 q3 7 -1 13"
                    fill="none"
                    stroke={SKIN_SHADE}
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    opacity="0.7"
                  />
                  <circle cx="139" cy="92" r="4.5" fill="#d9654f" opacity={grin ? 0.4 : 0.25} />
                  <circle cx="181" cy="92" r="4.5" fill="#d9654f" opacity={grin ? 0.4 : 0.25} />
                  <path
                    d="M160 79 q-4 8 0.5 10.5 q2 0.8 3.5 -0.5"
                    fill="none"
                    stroke={SKIN_SHADE}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  {/* A broad grin once the blue pill is gone; a gentle smile before. */}
                  {grin ? (
                    <g className={styles.grin}>
                      <path d="M150 100.5 Q160 112 170 100.5 Q160 103.5 150 100.5 Z" fill={MOUTH} />
                      <path
                        d="M152.5 101.6 Q160 104.4 167.5 101.6 L167 103.4 Q160 106 153 103.4 Z"
                        fill="#fff"
                      />
                    </g>
                  ) : (
                    <path
                      d="M152 102 Q160 107.5 168 102"
                      fill="none"
                      stroke={MOUTH}
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  )}
                  {/* A neat moustache, with a few grey hairs. */}
                  <path
                    d="M147.5 96 C151 91 157 91.5 160 94 C163 91.5 169 91 172.5 96 C168 98.5 163.5 97.5 160 96.5 C156.5 97.5 152 98.5 147.5 96 Z"
                    fill={HAIR}
                  />
                  <path
                    d="M152.5 95 l3 -1 M166 94.2 l2.6 1"
                    stroke={GREY}
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                </g>
              </g>

              {/* Arms: the red pill on the viewer's left; blue, then green, on the right (mirrored). */}
              <g
                className={`${styles.side} ${styles.sideLeft}`}
                style={{ '--reveal': REVEAL.left } as CSSProperties}
              >
                <Arm pill="red" mode="reveal" gid={gid} />
              </g>
              <g transform="translate(320 0) scale(-1 1)">
                <g
                  className={`${styles.side} ${styles.sideRight}`}
                  style={{ '--reveal': REVEAL.right } as CSSProperties}
                >
                  <Arm pill={offer} mode={swapping ? 'swap' : 'reveal'} gid={gid} />
                </g>
              </g>
            </g>
          </g>
        </svg>
        {left && (
          <div className={styles.hand} data-hand="left" style={handStyle(PILL_X)}>
            {left}
          </div>
        )}
        {right && (
          <div className={styles.hand} data-hand="right" style={handStyle(VIEW.width - PILL_X)}>
            {right}
          </div>
        )}
      </div>
    </div>
  )
}
