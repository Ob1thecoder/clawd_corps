import { type Grid, glyph, lerp, line, px, rect } from './pixels'
import {
  type Eyes, type Feet, HAND, NX, type Point, STROKES, drawArm, drawClawd, drawClipboard, drawHammer,
  drawHat, drawNail, drawPencil, drawPlank, drawSign, floor, impactPivot, nailHeadY, pencilBehindEar, shoulder,
  sparks, thumbsUp,
} from './props'
import { C, type Paint } from './themes'

export type LoopState = 'offstage' | 'idle' | 'doze' | 'thinking' | 'planning' | 'showplan' | 'building' | 'waiting'
export type Props = { hat: boolean; clip: boolean; prev: LoopState | null }
export type Anim = { name: string; n: number; loop: boolean; draw: (g: Grid, i: number, props: Props, p: Paint) => void }

function once(name: string, n: number, draw: Anim['draw']): Anim {
  return { name, n, loop: false, draw: (g, i, props, p) => { floor(g, p); draw(g, i, props, p) } }
}
function loop(name: string, n: number, draw: Anim['draw']): Anim {
  return { name, n, loop: true, draw: (g, i, props, p) => { floor(g, p); draw(g, i % n, props, p) } }
}

// ---- building frames ----
type Pose = 'windup' | 'raised' | 'swing' | 'impact' | 'hold' | 'lift' | 'rest'
type BuildFrame = { pose: Pose; h: number; hop?: number; happy?: boolean; star?: 1 | 2 }
const BUILD: BuildFrame[] = []
for (let h = 3; h > 0; h--) {
  BUILD.push(
    { pose: 'windup', h }, { pose: 'raised', h }, { pose: 'swing', h },
    { pose: 'impact', h: h - 1 }, { pose: 'hold', h: h - 1 }, { pose: 'lift', h: h - 1 },
  )
}
BUILD.push(
  { pose: 'rest', h: 0 }, { pose: 'rest', h: 0, hop: -1, happy: true }, { pose: 'rest', h: 0, happy: true },
  { pose: 'rest', h: 0, star: 1 }, { pose: 'rest', h: 0, star: 2 }, { pose: 'raised', h: 3 },
)
export const BUILD_FRAMES = BUILD.length

type BuildExtra = { bent?: boolean; eyes?: Eyes; feet?: Feet }
function drawBuildFrame(g: Grid, p: Paint, fr: BuildFrame, extra: BuildExtra = {}): void {
  drawPlank(g)
  drawNail(g, fr.h, 0, extra.bent ?? false)
  const dy = fr.hop ?? 0
  const hy = nailHeadY(fr.h)
  let pivot: Point = HAND
  let deg = -10
  switch (fr.pose) {
    case 'windup': deg = -28; break
    case 'raised': deg = -10; break
    case 'swing': deg = 45; drawHammer(g, HAND, 15, C.trail); drawHammer(g, HAND, 30, C.trail); break
    case 'impact': case 'hold': deg = 90; pivot = impactPivot(fr.h); break
    case 'lift': deg = 60; break
    case 'rest': deg = -10; pivot = [37, 10 + dy]; break
  }
  const hit = fr.pose === 'impact' || fr.pose === 'hold'
  const eyes: Eyes = extra.eyes ?? (hit || fr.happy ? 'closed' : fr.pose === 'rest' ? 'open' : 'right')
  drawClawd(g, p, { dy, eyes, feet: extra.feet })
  drawArm(g, p, shoulder(0, dy), pivot)
  drawHat(g, 0, dy + (fr.pose === 'impact' ? 1 : 0))
  drawHammer(g, pivot, deg)
  if (fr.pose === 'impact' && !extra.bent) sparks(g, hy, true)
  if (fr.pose === 'hold' && !extra.bent) sparks(g, hy, false)
  if (fr.star) {
    const sy = hy - 3
    px(g, NX, sy, C.sparkHi); px(g, NX - 1, sy, C.spark); px(g, NX + 1, sy, C.spark)
    if (fr.star === 2) { px(g, NX, sy - 1, C.spark); px(g, NX, sy + 1, C.spark); px(g, NX - 2, sy, C.spark); px(g, NX + 2, sy, C.spark) }
  }
}

function workbench(g: Grid, props: Props): void {
  if (props.hat) { drawPlank(g); drawNail(g, 3) }
  if (props.clip) drawClipboard(g)
}

const PER = 2
export const PLAN_DRAW = Math.ceil(STROKES.length / PER)
const PLAN_N = 4 + PLAN_DRAW + 6 + 2

export const A = {
  offstage: loop('(off stage)', 1, () => {}),

  enter: once('hop in from the left, wave', 16, (g, i, _props, p) => {
    if (i < 9) {
      drawClawd(g, p, { ox: Math.round(lerp(-38, 0, i / 8)), dy: i % 2 ? -1 : 0, feet: i % 2 ? 'walk' : 'stand', eyes: 'right' })
      return
    }
    drawClawd(g, p, { eyes: 'open' })
    const up = i % 2 === 0
    drawArm(g, p, shoulder(), [39, up ? 5 : 7])
    rect(g, 39, up ? 4 : 6, 2, 2, p.body)
  }),

  idle: loop('idle: blink, glance', 24, (g, i, _props, p) => {
    const eyes: Eyes = i === 14 || i === 15 ? 'closed' : i >= 18 && i <= 21 ? 'right' : 'open'
    drawClawd(g, p, { eyes })
  }),

  dozeIn: once('sits down, eyes droop', 6, (g, i, _props, p) => {
    drawClawd(g, p, { dy: i >= 3 ? 1 : 0, eyes: i < 2 ? 'down' : 'closed' })
  }),

  doze: loop('dozing: Zz', 16, (g, i, _props, p) => {
    drawClawd(g, p, { dy: 1, eyes: 'closed' })
    glyph(g, 'z', 36, 8 - Math.floor(i / 3), C.zz)
    if (i >= 6) glyph(g, 'Z', 40, 6 - Math.floor((i - 6) / 3), C.zz)
  }),

  wake: once('jolts awake', 6, (g, i, _props, p) => {
    const dy = [-3, -2, -1, 0, 0, 0][i] ?? 0
    drawClawd(g, p, { dy, eyes: 'open', feet: i < 2 ? 'wide' : 'stand' })
    if (i < 4) glyph(g, '!', 19, 1 + dy, C.bang)
  }),

  perk: once('perks up, reads your prompt', 6, (g, i, _props, p) => {
    const dy = i < 2 ? -1 : 0
    drawClawd(g, p, { dy, eyes: 'down' })
    if (i < 4) glyph(g, '!', 19, 2 + dy, C.bang)
  }),

  thinking: loop('thinking: . o O', 16, (g, i, props, p) => {
    if (props.hat) { drawPlank(g); drawNail(g, 3) }
    drawClawd(g, p, { eyes: 'up' })
    if (props.hat) drawHat(g)
    if (i >= 2) px(g, 34, 7, C.bubble)
    if (i >= 4) rect(g, 36, 4, 2, 2, C.bubble)
    if (i >= 6) {
      rect(g, 39, 0, 9, 4, C.bubble)
      rect(g, 38, 1, 11, 2, C.bubble)
      const dots = Math.floor((i - 6) / 2) % 4
      for (let j = 0; j < dots; j++) px(g, 41 + 2 * j, 2, C.ink)
    }
  }),

  clipIn: once('clipboard slides in, pencil from behind ear', 9, (g, i, _props, p) => {
    drawClipboard(g, Math.round(lerp(20, 0, i / 4)), 0, 0)
    drawClawd(g, p, { eyes: i < 5 ? 'right' : 'downright' })
    if (i < 5) { pencilBehindEar(g); return }
    const tip: Point = i < 7 ? [36 + (i - 5) * 2, 6 + (i - 5)] : [40, 8]
    const end = drawPencil(g, tip[0], tip[1])
    drawArm(g, p, shoulder(), [end[0] - 1, end[1]])
  }),

  planning: loop('planning: drawing the flowchart', PLAN_N, (g, i, _props, p) => {
    let shown = 0
    let tip: Point = [40, 9]
    let eyes: Eyes = 'downright'
    if (i < 4) { tip = [40, 7 + (i % 2)]; eyes = 'up' }
    else if (i < 4 + PLAN_DRAW) {
      shown = Math.min((i - 4 + 1) * PER, STROKES.length)
      const s = STROKES[shown - 1]
      if (s) tip = [s[0], s[1]]
    } else if (i < 4 + PLAN_DRAW + 6) { shown = STROKES.length; eyes = 'open' }
    else eyes = 'open'
    drawClipboard(g, 0, 0, shown)
    drawClawd(g, p, { eyes })
    const end = drawPencil(g, tip[0], tip[1])
    drawArm(g, p, shoulder(), [end[0] - 1, end[1]])
  }),

  showIn: once('turns the plan around to show you', 5, (g, i, _props, p) => {
    drawClipboard(g, Math.round(lerp(0, -1, i / 4)), Math.round(lerp(0, -2, i / 4)), STROKES.length)
    drawClawd(g, p, { eyes: i < 2 ? 'downright' : 'open' })
    pencilBehindEar(g)
    drawArm(g, p, shoulder(), [39, 12])
  }),

  showplan: loop('waiting for your verdict, tapping its foot', 8, (g, i, _props, p) => {
    drawClipboard(g, -1, -2, STROKES.length)
    drawClawd(g, p, { eyes: 'open', feet: i % 4 < 2 ? 'tap' : 'stand' })
    pencilBehindEar(g)
    drawArm(g, p, shoulder(), [39, 12])
  }),

  clipOut: once('tucks the clipboard away', 5, (g, i, _props, p) => {
    drawClipboard(g, Math.round(lerp(-1, 22, i / 4)), Math.round(lerp(-2, 0, i / 4)), STROKES.length)
    drawClawd(g, p, { eyes: 'right' })
  }),

  crumple: once('crumples the page and tosses it', 12, (g, i, _props, p) => {
    if (i < 4) {
      drawClipboard(g, 0, 0, 0, i + 1)
      drawClawd(g, p, { eyes: 'closed' })
      drawArm(g, p, shoulder(), [40, 11])
      return
    }
    drawClipboard(g)
    rect(g, 41, 5, 15, 13, i >= 10 ? C.paper : C.board)
    if (i < 10) {
      const t = (i - 4) / 5
      const bx = Math.round(lerp(48, 62, t))
      const by = Math.round(11 - 14 * t + 10 * t * t)
      rect(g, bx - 1, by - 1, 3, 3, C.paper)
      px(g, bx, by, C.wrinkle)
    }
    drawClawd(g, p, { eyes: i < 10 ? 'up' : 'open' })
  }),

  hatOn: once('hard hat drops on, hammer out, plank slides in', 11, (g, i, _props, p) => {
    drawPlank(g, Math.round(lerp(18, 0, (i - 5) / 5)))
    if (i >= 8) drawNail(g, 3)
    const squash = i === 5 ? 1 : 0
    drawClawd(g, p, { dy: squash, eyes: i < 5 ? 'up' : i === 5 ? 'closed' : 'right' })
    drawHat(g, 0, i < 5 ? ([-14, -11, -7, -3, 0][i] ?? 0) : squash)
    if (i >= 7) {
      drawArm(g, p, shoulder(), HAND)
      drawHammer(g, HAND, [150, 90, 30, -10][i - 7] ?? -10)
    }
  }),

  building: loop('building: hammering nails', BUILD.length, (g, i, _props, p) => {
    const fr = BUILD[i]
    if (fr) drawBuildFrame(g, p, fr)
  }),

  mishap: once('ouch! bent nail, sore claw, pulls the nail', 13, (g, i, _props, p) => {
    if (i === 0) return drawBuildFrame(g, p, { pose: 'raised', h: 3 })
    if (i === 1) return drawBuildFrame(g, p, { pose: 'swing', h: 3 })
    if (i === 2) return drawBuildFrame(g, p, { pose: 'impact', h: 3 }, { bent: true, eyes: 'closed' })
    drawPlank(g)
    if (i < 9) {
      const dy = i % 2 ? -2 : 0
      drawNail(g, 3, 0, true)
      drawClawd(g, p, { dy, eyes: 'closed', feet: i % 2 ? 'wide' : 'stand' })
      drawHat(g, 0, dy)
      const hand: Point = [39, 7 + dy + (i % 2)]
      drawArm(g, p, shoulder(0, dy), hand)
      rect(g, hand[0], hand[1], 2, 2, C.red)
      ;([[43, 4], [42, 8], [44, 6]] as const).forEach(([x, y], k) => { if ((i + k) % 2) px(g, x, y + dy, C.red) })
      glyph(g, '!', 44, 0, C.red)
      return
    }
    if (i < 11) {
      drawNail(g, 3, 0, true)
      drawClawd(g, p, { eyes: 'right' })
      drawHat(g)
      drawArm(g, p, shoulder(), [44, 12 - (i - 9) * 2])
      return
    }
    drawNail(g, 3)
    drawClawd(g, p, { eyes: 'right' })
    drawHat(g)
    drawArm(g, p, shoulder(), HAND)
    drawHammer(g, HAND, -10)
  }),

  signUp: once('stops and raises a "?" sign to you', 4, (g, i, props, p) => {
    workbench(g, props)
    drawClawd(g, p, { eyes: 'open' })
    if (props.hat) drawHat(g)
    const y = Math.round(lerp(12, 1, i / 3))
    drawSign(g, 38, y)
    drawArm(g, p, shoulder(), [41, y + 10])
  }),

  waiting: loop('waiting on you, tapping its foot', 8, (g, i, props, p) => {
    workbench(g, props)
    drawClawd(g, p, { eyes: i === 6 ? 'closed' : 'open', feet: i % 4 < 2 ? 'tap' : 'stand' })
    if (props.hat) drawHat(g)
    const y = 1 + (i < 4 ? 0 : 1)
    drawSign(g, 38, y)
    drawArm(g, p, shoulder(), [41, y + 10])
  }),

  signDown: once('lowers the sign, back to work', 3, (g, i, props, p) => {
    workbench(g, props)
    drawClawd(g, p, { eyes: 'right' })
    if (props.hat) drawHat(g)
    drawSign(g, 38, Math.round(lerp(1, 14, i / 2)))
  }),

  wrapBuild: once('puts the hammer down, hat off, wipes brow, thumbs up', 17, (g, i, _props, p) => {
    drawPlank(g, Math.round(lerp(0, 20, i / 5)))
    if (i < 4) drawNail(g, 0)
    drawClawd(g, p, { eyes: i >= 12 ? 'closed' : 'open' })
    if (i < 3) { drawArm(g, p, shoulder(), HAND); drawHammer(g, HAND, [-10, 60, 120][i] ?? 120) }
    if (i < 5) drawHat(g)
    else if (i < 9) {
      const hy = [-2, -5, -9, -14][i - 5] ?? -14
      drawHat(g, 0, hy)
      drawArm(g, p, shoulder(), [34, 8 + hy])
    } else if (i < 12) {
      const hx = [28, 20, 11][i - 9] ?? 11
      drawArm(g, p, shoulder(), [36, 7])
      line(g, 36, 7, hx, 7, p.body)
      rect(g, hx, 6, 2, 2, p.body)
      px(g, 7, 8 + (i - 9) * 3, C.sweat)
      px(g, 7, 9 + (i - 9) * 3, C.sweat)
    } else {
      thumbsUp(g, p)
      if (i % 2) px(g, 43, 3, C.sparkHi)
    }
  }),

  wrapLight: once('puts things away, thumbs up', 9, (g, i, props, p) => {
    if (props.clip) drawClipboard(g, Math.round(lerp(0, 22, i / 4)), 0, STROKES.length)
    drawClawd(g, p, { eyes: i >= 4 ? 'closed' : 'open' })
    if (i >= 4) thumbsUp(g, p)
  }),

  startle: once('startled! drops everything', 10, (g, i, props, p) => {
    const dy = [-4, -5, -4, -2, 0, 1, 0, 0, 0, 0][i] ?? 0
    if (props.hat) {
      drawHat(g, Math.round(lerp(0, 14, i / 6)), Math.round(-8 + (3 * i * i) / 2) + dy)
      drawPlank(g, Math.round(lerp(0, 24, i / 7)))
    }
    if (props.clip) drawClipboard(g, 0, Math.round(i * i * 0.6), 0)
    drawClawd(g, p, { dy, eyes: i < 6 ? 'open' : 'closed', feet: i < 4 ? 'wide' : 'stand' })
    if (props.hat && i < 6) drawHammer(g, [37, 10 + i * 3], 30 + i * 40)
    if (i < 6) glyph(g, '!', 38, 0, C.bang)
  }),
}

export const LOOP: Record<LoopState, Anim> = {
  offstage: A.offstage, idle: A.idle, doze: A.doze, thinking: A.thinking,
  planning: A.planning, showplan: A.showplan, building: A.building, waiting: A.waiting,
}
