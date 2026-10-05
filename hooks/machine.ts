import { A, type Anim, IMPACT_FRAMES, LOOP, type LoopState, PLAN_PEEK, type Props } from './anims'
import { CX, CY, drawHeart, drawRingIcon, drawSpeedLines, drawSweat } from './props'
import { glyph } from './pixels'
import { C, type Paint, THEMES } from './themes'
import { type Grid, grid } from './pixels'

export type StoryEvent =
  | 'start' | 'prompt' | 'planmode' | 'planshown' | 'approve' | 'reject' | 'edit'
  | 'error' | 'permask' | 'permok' | 'turnend' | 'esc' | 'idle2m' | 'typing'
  | 'suitup' | 'powerdown' | 'poke' | 'whip'

export type Machine = {
  state: LoopState
  seq: Anim[]
  si: number
  f: number
  props: Props
  tprops: Props
  inTransition: boolean
  boost: number                 // frames left at double speed after the whip
  flinch: number                // frames left of the poke-while-busy "!"
  look: Look | null             // where the pointer is, for the eyes to follow
}

export type Look = 'left' | 'right' | 'up' | 'down'
export const BOOST = 32
const FLINCH = 6

type Plan = { seq: Anim[]; to: LoopState; set: Partial<Props> }

export function createMachine(): Machine {
  const props: Props = { hat: false, clip: false, prev: null }
  return { state: 'offstage', seq: [LOOP.offstage], si: 0, f: 0, props, tprops: { ...props }, inTransition: false, boost: 0, flinch: 0, look: null }
}

const WORKING: LoopState[] = ['thinking', 'planning', 'showplan', 'building', 'waiting']

function plan(m: Machine, ev: StoryEvent): Plan | null {
  const s = m.state
  const c = m.props
  switch (ev) {
    case 'start':
      return { seq: [A.enter], to: 'idle', set: { hat: false, clip: false, prev: null } }
    case 'prompt':
      if (s === 'idle') return { seq: [A.perk], to: 'thinking', set: {} }
      if (s === 'doze') return { seq: [A.wake, A.perk], to: 'thinking', set: {} }
      return null
    case 'planmode':
      if (s === 'idle' || s === 'thinking' || s === 'building') return { seq: [A.clipIn], to: 'planning', set: { clip: true } }
      return null
    case 'planshown':
      if (s === 'planning') return { seq: [A.showIn], to: 'showplan', set: {} }
      // Plan mode entered with Shift+Tab never calls EnterPlanMode: bring the clipboard out first.
      if (s === 'idle' || s === 'thinking' || s === 'building') return { seq: [A.clipIn, A.showIn], to: 'showplan', set: { clip: true } }
      return null
    case 'approve':
      return s === 'showplan' ? { seq: [A.clipOut, A.hatOn], to: 'building', set: { clip: false, hat: true } } : null
    case 'reject':
      return s === 'showplan' ? { seq: [A.crumple], to: 'planning', set: {} } : null
    case 'edit':
      if (s === 'idle' || s === 'thinking' || s === 'planning') {
        return { seq: c.clip ? [A.clipOut, A.hatOn] : [A.hatOn], to: 'building', set: { clip: false, hat: true } }
      }
      return null
    case 'error':
      return s === 'building' ? { seq: [A.mishap], to: 'building', set: {} } : null
    case 'permask':
      if (s === 'thinking' || s === 'planning' || s === 'building') return { seq: [A.signUp], to: 'waiting', set: { prev: s } }
      return null
    case 'permok':
      return s === 'waiting' ? { seq: [A.signDown], to: c.prev ?? 'thinking', set: { prev: null } } : null
    case 'turnend':
      if (s === 'building') return { seq: [A.wrapBuild], to: 'idle', set: { hat: false, clip: false, prev: null } }
      if (WORKING.includes(s)) return { seq: [A.wrapLight], to: 'idle', set: { hat: false, clip: false, prev: null } }
      return null
    case 'esc':
      return WORKING.includes(s) ? { seq: [A.startle], to: 'idle', set: { hat: false, clip: false, prev: null } } : null
    case 'idle2m':
      return s === 'idle' ? { seq: [A.dozeIn], to: 'doze', set: {} } : null
    case 'typing':
      return s === 'doze' ? { seq: [A.wake], to: 'idle', set: {} } : null
    // A transformation plays over whatever Clawd is doing, then returns to it with its props.
    case 'suitup':
      return s === 'offstage' ? null : { seq: [A.suitUp], to: s, set: {} }
    case 'powerdown':
      return s === 'offstage' ? null : { seq: [A.powerDown], to: s, set: {} }
    case 'poke':
      return s === 'idle' || s === 'thinking' ? { seq: [A.poke], to: s, set: {} } : null
    case 'whip':
      return s === 'building' ? { seq: [A.whipHit], to: s, set: {} } : null
  }
}

// Interruptible: a new event replaces whatever transition is playing, drawn from the props held now.
export function fire(m: Machine, ev: StoryEvent, instant = false): boolean {
  // A poke while Clawd is busy doesn't interrupt the work: just a "!" and a heart over it.
  if (ev === 'poke' && (m.state === 'planning' || m.state === 'showplan' || m.state === 'waiting')) {
    m.flinch = FLINCH
    return true
  }
  const p = plan(m, ev)
  if (!p) return false
  m.tprops = { ...m.props }
  m.props = { ...m.props, ...p.set }
  m.state = p.to
  m.seq = instant ? [LOOP[p.to]] : [...p.seq, LOOP[p.to]]
  m.si = 0
  m.f = 0
  m.inTransition = !instant
  if (ev === 'whip') m.boost = BOOST
  return true
}

function inLoop(m: Machine, state: LoopState): boolean {
  return m.state === state && current(m).loop
}

// Click on the nail: the hammering jumps straight to its next blow.
export function whack(m: Machine): boolean {
  if (!inLoop(m, 'building')) return false
  const at = m.f % A.building.n
  m.f = IMPACT_FRAMES.find(f => f > at) ?? IMPACT_FRAMES[0] ?? 0
  return true
}

// Click on the clipboard: show the finished plan.
export function peek(m: Machine): boolean {
  if (!inLoop(m, 'planning')) return false
  m.f = PLAN_PEEK
  return true
}

export function current(m: Machine): Anim {
  return m.seq[m.si] ?? LOOP[m.state]
}

export function tick(m: Machine): void {
  step(m)
  if (m.boost > 0) {
    step(m)
    m.boost--
  }
  if (m.flinch > 0) m.flinch--
}

function step(m: Machine): void {
  const a = current(m)
  m.f++
  if (!a.loop && m.f >= a.n) {
    m.si = Math.min(m.si + 1, m.seq.length - 1)
    m.f = 0
    if (m.si >= m.seq.length - 1) m.inTransition = false
  }
}

export function render(m: Machine, p: Paint): Grid {
  const g = grid()
  const a = current(m)
  a.draw(g, m.f, a.loop ? m.props : m.tprops, p)
  if (m.look && inLoop(m, 'idle')) lookAt(g, m.look, p.body)
  if (m.flinch > 0) {
    glyph(g, '!', 38, 0, C.bang)
    drawHeart(g, 44, Math.max(0, 3 - (FLINCH - m.flinch)))
  }
  if (m.boost > 0 && m.state === 'building') {
    drawSweat(g, m.boost)
    drawSpeedLines(g, m.boost)
  }
  if (p.style === 'classic' && m.state !== 'offstage') drawRingIcon(g)
  recolor(g, p)
  return g
}

// The art is drawn in Green's ring colours; other corps swap them for their own, and a dark body gets a rim.
function recolor(g: Grid, p: Paint): void {
  const lantern = p.style === 'lantern' ? p : p.from
  const ring = lantern?.ring
  if (!ring || ring === THEMES.lantern.ring) return
  const map = new Map<string, string>([
    [C.energy, ring.energy], [C.energyHi, ring.energyHi], [C.core, ring.core], [C.coreHi, ring.coreHi],
    [C.halo, ring.halo], [C.haloHi, ring.haloHi], [C.gSpark, ring.gSpark], [C.badgeW, ring.badgeBg], [C.badgeD, ring.badgeFg],
  ])
  for (const row of g) for (let x = 0; x < row.length; x++) { const c = row[x]; if (c) row[x] = map.get(c) ?? c }
  if (!ring.rim || p.style !== 'lantern') return
  const body = p.body
  const at = (x: number, y: number) => g[y]?.[x]
  const rim: [number, number][] = []
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < (g[y]?.length ?? 0); x++) {
      if (at(x, y) === null && (at(x + 1, y) === body || at(x - 1, y) === body || at(x, y + 1) === body || at(x, y - 1) === body)) rim.push([x, y])
    }
  }
  for (const [x, y] of rim) { const row = g[y]; if (row) row[x] = ring.rim }
}

// Fills part of each open eye notch so the pupils point toward the pointer.
function lookAt(g: Grid, look: Look, body: string): void {
  for (const ex of [CX + 10, CX + 24]) {
    const ey = CY + 2
    if (g[ey]?.[ex] !== null || g[ey]?.[ex + 1] !== null) continue
    const fill: [number, number][] = look === 'right' ? [[ex, ey], [ex, ey + 1]]
      : look === 'left' ? [[ex + 1, ey], [ex + 1, ey + 1]]
      : look === 'up' ? [[ex, ey + 1], [ex + 1, ey + 1]]
      : [[ex, ey], [ex + 1, ey]]
    for (const [x, y] of fill) { const row = g[y]; if (row) row[x] = body }
  }
}
