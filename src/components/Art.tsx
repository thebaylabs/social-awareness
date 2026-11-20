/**
 * Decorative illustrations for menu cards. Original drawings made for this
 * project. They carry no meaning of their own (the card text does), so they
 * are hidden from assistive technology.
 */
const common = {
  viewBox: '0 0 120 80',
  'aria-hidden': true,
  focusable: false,
} as const

/** A parent and a small child holding hands, with a ball to play with. */
export function FamilyArt() {
  return (
    <svg {...common}>
      <path d="M58 24 C49 18 51 9 58 13 C65 9 67 18 58 24 Z" fill="#e88aa8" />
      <path d="M16 74 H108" stroke="#f5d49b" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <circle cx="38" cy="18" r="8" fill="#f5d49b" />
      <path d="M30 30 Q38 26 46 30 L53 73 H23 Z" fill="#b5651d" />
      <path
        d="M45 34 C52 41 58 48 63 55"
        stroke="#b5651d"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="77" cy="41" r="6" fill="#f5d49b" />
      <path d="M71 50 Q77 48 83 50 L86 73 H68 Z" fill="#e4572e" />
      <path d="M72 53 L64 56" stroke="#e4572e" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="63.5" cy="55.5" r="2.8" fill="#f5d49b" />
      <circle cx="100" cy="66" r="7" fill="#f4c552" />
      <path
        d="M93.5 64 Q100 69 106.5 64 M100 59 Q97 66 100 73"
        stroke="#e4572e"
        strokeWidth="1.8"
        fill="none"
      />
    </svg>
  )
}

/** Two young adults talking over chai, a phone left face down on the table. */
export function YouthArt() {
  return (
    <svg {...common}>
      <rect x="40" y="6" width="20" height="13" rx="6.5" fill="#fff6e5" />
      <path d="M45 18 l-5 6 9-4z" fill="#fff6e5" />
      <path d="M45 12.5 h10" stroke="#b5651d" strokeWidth="2" strokeLinecap="round" />
      <rect x="60" y="20" width="20" height="13" rx="6.5" fill="#f4c552" />
      <path d="M75 32 l5 6-9-4z" fill="#f4c552" />
      <path d="M65 26.5 h10" stroke="#b5651d" strokeWidth="2" strokeLinecap="round" />
      <circle cx="28" cy="30" r="8.5" fill="#f5d49b" />
      <path d="M12 62 Q12 44 28 42 Q44 44 44 62 Z" fill="#e4572e" />
      <circle cx="92" cy="30" r="8.5" fill="#f5d49b" />
      <path d="M76 62 Q76 44 92 42 Q108 44 108 62 Z" fill="#b5651d" />
      <path d="M43 53 h8 l-1.2 9 h-5.6 Z M69 53 h8 l-1.2 9 h-5.6 Z" fill="#fff6e5" />
      <rect
        x="53"
        y="57.5"
        width="14"
        height="4.5"
        rx="1.5"
        fill="#3b1f2b"
        stroke="#fff6e5"
        strokeWidth="1"
      />
      <rect x="8" y="62" width="104" height="6" rx="2" fill="#f4c552" />
      <path d="M20 68 v8 M100 68 v8" stroke="#f4c552" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function GameArt() {
  return (
    <svg {...common}>
      <rect x="22" y="26" width="76" height="36" rx="18" fill="currentColor" />
      <path d="M40 36 v16 M32 44 h16" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx="78" cy="38" r="5" fill="#f4c552" />
      <circle cx="88" cy="48" r="5" fill="#e4572e" />
      <path d="M96 10 l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#f4c552" />
    </svg>
  )
}

/**
 * A capsule centred on (cx, cy), tilted by `angle` degrees: one half in the
 * pill's colour (on the `side` given), the other cream, with a shine on top.
 */
function Capsule({
  cx,
  cy,
  angle,
  side,
  colour,
  shade,
}: {
  cx: number
  cy: number
  angle: number
  side: 'left' | 'right'
  colour: string
  shade: string
}) {
  const left = side === 'left'
  const shine = left ? cx - 17 : cx + 8
  return (
    <g transform={`rotate(${angle} ${cx} ${cy})`}>
      <path
        d={`M${cx} ${cy - 11} h-14 a11 11 0 0 0 0 22 h14 z`}
        fill={left ? colour : '#fff1d2'}
        stroke={left ? shade : '#e2c99c'}
        strokeWidth="1.5"
      />
      <path
        d={`M${cx} ${cy - 11} h14 a11 11 0 0 1 0 22 h-14 z`}
        fill={left ? '#fff1d2' : colour}
        stroke={left ? '#e2c99c' : shade}
        strokeWidth="1.5"
      />
      <path
        d={`M${shine} ${cy - 5} h9`}
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.55"
      />
    </g>
  )
}

/** The pill game: a red pill and a blue pill leaning together, with a sparkle above them. */
export function PillsArt() {
  return (
    <svg {...common}>
      <Capsule cx={33} cy={52} angle={-28} side="left" colour="#e8574a" shade="#b3261e" />
      <Capsule cx={87} cy={52} angle={28} side="right" colour="#4c8ef0" shade="#1557b0" />
      <path d="M60 10 l3.5 8.5 8.5 3.5-8.5 3.5-3.5 8.5-3.5-8.5-8.5-3.5 8.5-3.5z" fill="#f4c552" />
    </svg>
  )
}

/** The word game: a row of marked letter tiles, with a magnifying glass searching the last one. */
export function WordsArt() {
  const tiles = [
    { x: 4, letter: 'S', fill: '#1d5f7a', ink: '#fff' },
    { x: 34, letter: 'E', fill: '#f4c552', ink: '#1c2230' },
    { x: 64, letter: 'V', fill: '#d5d9e0', ink: '#1c2230' },
  ]
  return (
    <svg {...common}>
      {tiles.map((tile) => (
        <g key={tile.letter}>
          <rect x={tile.x} y="18" width="26" height="26" rx="5" fill={tile.fill} />
          <text
            x={tile.x + 13}
            y="31.5"
            fill={tile.ink}
            fontFamily="inherit"
            fontSize="17"
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {tile.letter}
          </text>
        </g>
      ))}
      <circle
        cx="93"
        cy="50"
        r="12"
        fill="#fff"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="4.5"
      />
      <path d="M102 59 L112 69" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    </svg>
  )
}

export function StoryArt() {
  return (
    <svg {...common}>
      <path d="M60 20 C48 12 32 12 20 16 V66 C32 62 48 62 60 70 Z" fill="currentColor" />
      <path d="M60 20 C72 12 88 12 100 16 V66 C88 62 72 62 60 70 Z" fill="#f4c552" />
      <path
        d="M30 30 h20 M30 40 h20 M30 50 h14"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M70 30 h20 M70 40 h20 M70 50 h14"
        stroke="#1c2230"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function PrasangArt() {
  return (
    <svg {...common}>
      <path d="M60 12 C70 26 70 36 60 44 C50 36 50 26 60 12 Z" fill="#f4c552" />
      <path d="M60 44 C46 30 30 34 26 44 C36 54 50 54 60 44 Z" fill="#e88aa8" />
      <path d="M60 44 C74 30 90 34 94 44 C84 54 70 54 60 44 Z" fill="#e88aa8" />
      <path
        d="M24 60 C40 54 80 54 96 60"
        stroke="currentColor"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M34 70 C48 66 72 66 86 70"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
