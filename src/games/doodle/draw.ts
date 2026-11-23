import { DOODLE, ITEM_RADIUS, WORLD, doodleBox, type FallingItem, type SimState } from './sim'
import type { DoodleIconName } from './icon-names'

/** Icon outlines on a 24x24 grid, drawn as strokes. */
const ICON_PATHS: Record<DoodleIconName | 'generic', string> = {
  book: 'M4 5.5C6 4.5 9 4.5 12 6c3-1.5 6-1.5 8-.5V19c-2-1-5-1-8 .5-3-1.5-6-1.5-8-.5zM12 6v13.5',
  moon: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
  family:
    'M8 8a3 3 0 100-6 3 3 0 000 6zM17 10a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM2 21v-2a6 6 0 0112 0v2M14 21v-2a4 4 0 018 0v2',
  ball: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3.5 9.5c5 2 12 2 17 0M3.5 14.5c5-2 12-2 17 0',
  hands: 'M12 3v17M12 3c-2 2-5 6-5 10l3 7M12 3c2 2 5 6 5 10l-3 7',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z',
  pencil: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  tree: 'M12 21v-6M12 3l6 8h-4l4 5H6l4-5H6z',
  sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  phone: 'M8 2h8a1 1 0 011 1v18a1 1 0 01-1 1H8a1 1 0 01-1-1V3a1 1 0 011-1zM11 18h2',
  bell: 'M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0',
  loop: 'M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3M18 3v4h-4M6 21v-4h4',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  screen: 'M3 5h18v11H3zM8 20h8M12 16v4',
  controller:
    'M6 9h12a3 3 0 013 3v2a3 3 0 01-5.2 2L14 14h-4l-1.8 2A3 3 0 013 14v-2a3 3 0 013-3zM8 11v3M6.5 12.5h3',
  generic: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
}

const pathCache = new Map<string, Path2D>()
function iconPath(name: string): Path2D {
  const key = name in ICON_PATHS ? name : 'generic'
  let p = pathCache.get(key)
  if (!p) {
    p = new Path2D(ICON_PATHS[key as keyof typeof ICON_PATHS])
    pathCache.set(key, p)
  }
  return p
}

export interface Palette {
  /** One fill for every falling item; good habits and distractions differ by shape. */
  item: string
}

export interface DrawInput {
  state: SimState
  icons: string[]
  labels: string[]
  font: string
  palette: Palette
}

function drawIcon(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, size: number) {
  ctx.save()
  ctx.translate(x - size / 2, y - size / 2)
  ctx.scale(size / 24, size / 24)
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#ffffff'
  ctx.stroke(iconPath(name))
  ctx.restore()
}

/** Good items: smooth circles. Distractions: jagged stars. Same colour, so the shape and label tell them apart. */
function drawItem(ctx: CanvasRenderingContext2D, it: FallingItem, input: DrawInput) {
  const r = ITEM_RADIUS
  ctx.save()
  ctx.beginPath()
  if (it.kind === 'positive') {
    ctx.arc(it.x, it.y, r, 0, Math.PI * 2)
  } else {
    const spikes = 10
    for (let i = 0; i <= spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes - Math.PI / 2
      const radius = i % 2 === 0 ? r + 3 : r - 7
      const px = it.x + Math.cos(angle) * radius
      const py = it.y + Math.sin(angle) * radius
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
  }
  ctx.fillStyle = input.palette.item
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()
  ctx.restore()
  drawIcon(ctx, input.icons[it.item] ?? 'generic', it.x, it.y, 26)

  // Label under the item, in the chosen language, with a light halo for contrast.
  const label = input.labels[it.item] ?? ''
  ctx.save()
  ctx.font = input.font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const half = ctx.measureText(label).width / 2
  const lx = Math.max(half + 2, Math.min(WORLD.width - half - 2, it.x))
  ctx.lineJoin = 'round'
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'
  ctx.strokeText(label, lx, it.y + r + 4)
  ctx.fillStyle = '#1c2230'
  ctx.fillText(label, lx, it.y + r + 4)
  ctx.restore()
}

/** The doodle: an original character for this project, a round purple blob holding up a basket. */
function drawDoodle(ctx: CanvasRenderingContext2D, x: number) {
  const box = doodleBox(x)
  const top = box.top
  ctx.save()
  // Feet
  ctx.fillStyle = '#3f2a6b'
  ctx.beginPath()
  ctx.ellipse(x - 13, box.bottom - 3, 9, 5, 0, 0, Math.PI * 2)
  ctx.ellipse(x + 13, box.bottom - 3, 9, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  // Arms up to the basket
  ctx.strokeStyle = '#5b3a9b'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x - 24, top + 32)
  ctx.lineTo(x - 30, top + 14)
  ctx.moveTo(x + 24, top + 32)
  ctx.lineTo(x + 30, top + 14)
  ctx.stroke()
  // Body
  ctx.fillStyle = '#7a52c7'
  ctx.beginPath()
  ctx.ellipse(x, top + 36, 27, 19, 0, 0, Math.PI * 2)
  ctx.fill()
  // Eyes looking up
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x - 9, top + 32, 6.5, 0, Math.PI * 2)
  ctx.arc(x + 9, top + 32, 6.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1c2230'
  ctx.beginPath()
  ctx.arc(x - 9, top + 30, 3.2, 0, Math.PI * 2)
  ctx.arc(x + 9, top + 30, 3.2, 0, Math.PI * 2)
  ctx.fill()
  // Smile
  ctx.strokeStyle = '#1c2230'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(x, top + 40, 7, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.stroke()
  // Basket
  ctx.fillStyle = '#c98a3d'
  ctx.strokeStyle = '#7a4a1c'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x - DOODLE.width / 2, top)
  ctx.lineTo(x + DOODLE.width / 2, top)
  ctx.lineTo(x + DOODLE.width / 2 - 8, top + 16)
  ctx.lineTo(x - DOODLE.width / 2 + 8, top + 16)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 22, top + 3)
  ctx.lineTo(x - 18, top + 14)
  ctx.moveTo(x, top + 3)
  ctx.lineTo(x, top + 14)
  ctx.moveTo(x + 22, top + 3)
  ctx.lineTo(x + 18, top + 14)
  ctx.stroke()
  ctx.restore()
}

/** Draw one frame. The context is already scaled so that 1 unit = 1 logical pixel. */
export function drawFrame(ctx: CanvasRenderingContext2D, input: DrawInput) {
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height)
  sky.addColorStop(0, '#e3f1ff')
  sky.addColorStop(1, '#fff6e5')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, WORLD.width, WORLD.height)
  ctx.fillStyle = '#cfe8c8'
  ctx.fillRect(0, WORLD.height - 12, WORLD.width, 12)
  for (const it of input.state.items) drawItem(ctx, it, input)
  drawDoodle(ctx, input.state.doodleX)
}
