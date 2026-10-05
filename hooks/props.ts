import { type Grid, H, W, line, px, rect } from './pixels'
import { C, type Paint } from './themes'

export type Point = readonly [number, number]
export type Eyes = 'open' | 'closed' | 'right' | 'downright' | 'up' | 'down'

const CLAWD = ['...############...', '...##.######.##...', '.################.', '...############...']
const FEET = {
  stand: '....#.#....#.#....',
  walk: '...#.#.....#.#....',
  tap: '....#.#.....#.....',
  wide: '...#..#....#..#...',
} as const
export type Feet = keyof typeof FEET
export type ClawdPose = { ox?: number; dy?: number; eyes?: Eyes; feet?: Feet }

export const CX = 2
export const CY = 9
export const HAND: Point = [37, 10]
export const NX = 45
export const PLANK_TOP = 17

export function floor(g: Grid, p: Paint): void {
  rect(g, 0, H - 1, W, 1, p.floor)
}

export function drawClawd(g: Grid, p: Paint, pose: ClawdPose = {}): void {
  const ox = pose.ox ?? 0
  const dy = pose.dy ?? 0
  for (let y = 0; y < 5; y++) {
    const row = y === 4 ? FEET[pose.feet ?? 'stand'] : (CLAWD[y] ?? '')
    for (let x = 0; x < 18; x++) if (row[x] === '#') rect(g, CX + ox + 2 * x, CY + 2 * y + dy, 2, 2, p.body)
  }
  const eyes = pose.eyes ?? 'open'
  const holes: Point[] = [[CX + ox + 10, CY + 2 + dy], [CX + ox + 24, CY + 2 + dy]]
  for (const [x, y] of holes) {
    if (eyes === 'closed') rect(g, x, y, 2, 2, p.body)
    if (eyes === 'right') { px(g, x, y, p.body); px(g, x, y + 1, p.body) }
    if (eyes === 'downright') { px(g, x, y, p.body); px(g, x + 1, y, p.body); px(g, x, y + 1, p.body) }
    if (eyes === 'up') { px(g, x, y + 1, p.body); px(g, x + 1, y + 1, p.body) }
    if (eyes === 'down') { px(g, x, y, p.body); px(g, x + 1, y, p.body) }
  }
}

export function shoulder(ox = 0, dy = 0): Point {
  return [35 + ox, 13 + dy]
}

export function drawArm(g: Grid, p: Paint, from: Point, to: Point): void {
  line(g, from[0], from[1], to[0], to[1], p.body)
  line(g, from[0], from[1] + 1, to[0], to[1] + 1, p.body)
}

export function drawHat(g: Grid, ox = 0, dy = 0): void {
  const b = CY - 1 + dy
  const X = (x: number) => x + ox
  rect(g, X(5), b, 30, 1, C.brim)
  px(g, X(5), b, C.hatShade)
  px(g, X(34), b, C.hatShade)
  rect(g, X(8), b - 1, 24, 1, C.hat)
  rect(g, X(9), b - 2, 22, 1, C.hat)
  rect(g, X(10), b - 3, 20, 1, C.hat)
  rect(g, X(12), b - 4, 16, 1, C.hat)
  rect(g, X(15), b - 5, 10, 1, C.hat)
  rect(g, X(19), b - 5, 2, 5, C.hatHi)
  px(g, X(11), b - 3, C.hatHi)
  px(g, X(12), b - 3, C.hatHi)
  px(g, X(10), b - 2, C.hatHi)
  px(g, X(13), b - 4, C.hatHi)
  rect(g, X(29), b - 2, 2, 1, C.hatShade)
  rect(g, X(30), b - 1, 2, 1, C.hatShade)
  px(g, X(27), b - 3, C.hatShade)
  px(g, X(28), b - 3, C.hatShade)
}

// Upright hammer, pivot at the grip (row 9, col 4). c claw, S steel, s highlight, F face, h/H handle, g grip.
const HAMMER = [
  '..sssssFFF', 'ccSSSSSFFF', 'c...hH.FFF', '....hH....', '....hH....', '....hH....',
  '....hH....', '....hH....', '....gg....', '....gg....', '....gg....',
]
const HPIV: Point = [4, 9]
const HCOL: Record<string, string> = {
  c: C.steelDk, S: C.steel, s: C.steelHi, F: C.face, h: C.handle, H: C.handleHi, g: C.grip,
}

export function drawHammer(g: Grid, pivot: Point, deg: number, tint?: string): void {
  const a = (deg * Math.PI) / 180
  const co = Math.cos(a)
  const si = Math.sin(a)
  for (let dy = -13; dy <= 13; dy++) {
    for (let dx = -13; dx <= 13; dx++) {
      const sx = Math.round(dx * co + dy * si)
      const sy = Math.round(-dx * si + dy * co)
      const ch = HAMMER[HPIV[1] + sy]?.[HPIV[0] + sx]
      if (!ch || ch === '.') continue
      px(g, pivot[0] + dx, pivot[1] + dy, tint ?? HCOL[ch])
    }
  }
}

export function drawPlank(g: Grid, xo = 0): void {
  rect(g, 40 + xo, 17, 15, 2, C.wood)
  rect(g, 40 + xo, 17, 15, 1, C.woodHi)
  for (const x of [42, 47, 51]) px(g, x + xo, 18, C.grain)
}

export function nailHeadY(h: number): number {
  return PLANK_TOP - 1 - h
}

export function drawNail(g: Grid, h: number, xo = 0, bent = false): void {
  const x = NX + xo
  if (bent) {
    px(g, x, 16, C.nail)
    px(g, x + 1, 15, C.nail)
    px(g, x + 2, 14, C.nail)
    rect(g, x + 2, 13, 2, 1, C.nail)
    return
  }
  for (let y = PLANK_TOP - h; y < PLANK_TOP; y++) px(g, x, y, C.nail)
  const hy = nailHeadY(h)
  rect(g, x - 1, hy, 3, 1, C.nail)
  px(g, x - 1, hy, C.nailHi)
}

export function sparks(g: Grid, hy: number, big: boolean): void {
  const near: [number, number, string][] = [
    [-3, 0, C.sparkHi], [3, 0, C.sparkHi], [-4, -1, C.spark], [4, -1, C.spark],
    [-5, -3, C.sparkHi], [5, -3, C.sparkHi], [-6, 0, C.spark], [6, 0, C.spark],
  ]
  const far: [number, number, string][] = [
    [-7, -1, C.spark], [7, -1, C.spark], [-7, -4, C.spark], [7, -4, C.spark], [-5, -5, C.spark], [5, -5, C.spark],
  ]
  for (const [dx, dy, c] of big ? near : far) px(g, NX + dx, hy + dy, c)
}

// At 90° the face's bottom row sits 5 below the pivot and is centred 8 to its right.
export function impactPivot(h: number): Point {
  return [NX - 8, nailHeadY(h) - 6]
}

function buildStrokes(): [number, number, 0 | 1][] {
  const out: [number, number, 0 | 1][] = []
  const box = (x0: number, y0: number, x1: number, y1: number) => {
    for (let x = x0; x <= x1; x++) out.push([x, y0, 0])
    for (let y = y0 + 1; y <= y1; y++) out.push([x1, y, 0])
    for (let x = x1 - 1; x >= x0; x--) out.push([x, y1, 0])
    for (let y = y1 - 1; y > y0; y--) out.push([x0, y, 0])
  }
  box(43, 6, 49, 8)
  for (let y = 9; y <= 11; y++) out.push([46, y, 0])
  out.push([45, 10, 0], [47, 10, 0])
  box(43, 12, 49, 14)
  for (const [x, y] of [[51, 7], [52, 6], [53, 7], [54, 6], [51, 13], [52, 12], [53, 13]] as const) out.push([x, y, 0])
  for (const [x, y] of [[50, 16], [51, 17], [52, 16], [53, 15], [54, 14]] as const) out.push([x, y, 1])
  return out
}
export const STROKES: readonly (readonly [number, number, 0 | 1])[] = buildStrokes()

export function drawClipboard(g: Grid, xo = 0, yo = 0, shown = 0, crumple = 0): void {
  rect(g, 39 + xo, 3 + yo, 19, 16, C.board)
  rect(g, 39 + xo, 3 + yo, 19, 1, C.boardHi)
  if (crumple) {
    const s = Math.max(2, 13 - crumple * 3)
    const cx = 48 + xo
    const cy = 11 + yo
    const left = cx - Math.floor(s / 2)
    const top = cy - Math.floor(s / 2)
    rect(g, left, top, s, s, C.paper)
    for (let k = 0; k < s; k += 2) px(g, left + k, top + ((k * 3) % s), C.wrinkle)
  } else {
    rect(g, 41 + xo, 5 + yo, 15, 13, C.paper)
    for (const y of [8, 11, 14]) for (let x = 42; x < 55; x++) px(g, x + xo, y + yo, C.rule)
    for (const [x, y, kind] of STROKES.slice(0, shown)) px(g, x + xo, y + yo, kind ? C.check : C.ink)
  }
  rect(g, 45 + xo, 2 + yo, 7, 3, C.clip)
  rect(g, 47 + xo, 2 + yo, 3, 1, C.clipDk)
  px(g, 45 + xo, 4 + yo, C.clipDk)
  px(g, 51 + xo, 4 + yo, C.clipDk)
}

export function drawPencil(g: Grid, tx: number, ty: number): Point {
  const parts = [C.pTip, C.pWood, C.pBody, C.pBody, C.pBody, C.pBody, C.pBody, C.pFerrule, C.pEraser, C.pEraser]
  let last: Point = [tx, ty]
  parts.forEach((color, k) => {
    const x = tx - k
    const y = ty + Math.floor((k + 1) / 2)
    last = [x, y]
    px(g, x, y, color)
    if (k >= 2 && k <= 6) px(g, x, y + 1, C.pBodyDk)
    if (k >= 7) px(g, x, y + 1, color)
  })
  return last
}

export function pencilBehindEar(g: Grid, dy = 0): void {
  const y = CY - 1 + dy
  rect(g, 26, y, 7, 1, C.pBody)
  px(g, 33, y, C.pTip)
  px(g, 25, y, C.pEraser)
}

export function drawSign(g: Grid, x: number, y: number): void {
  rect(g, x, y, 9, 8, C.paper)
  rect(g, x, y, 9, 1, C.wrinkle)
  // '?' drawn inline so props.ts needs no glyph import beyond pixels
  for (const [i, j] of [[0, 0], [1, 0], [2, 1], [1, 2], [1, 4]] as const) px(g, x + 3 + i, y + 2 + j, C.ink)
  line(g, x + 4, y + 8, x + 4, y + 11, C.handle)
}

export function thumbsUp(g: Grid, p: Paint): void {
  drawArm(g, p, shoulder(), [39, 7])
  rect(g, 39, 6, 2, 2, p.body)
  px(g, 40, 4, p.body)
  px(g, 40, 5, p.body)
}
