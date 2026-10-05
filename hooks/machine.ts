import { A, type Anim, LOOP, type LoopState, type Props } from './anims'
import { type Grid, grid } from './pixels'
import type { Paint } from './themes'

export type StoryEvent =
  | 'start' | 'prompt' | 'planmode' | 'planshown' | 'approve' | 'reject' | 'edit'
  | 'error' | 'permask' | 'permok' | 'turnend' | 'esc' | 'idle2m' | 'typing'
  | 'suitup' | 'powerdown'

export type Machine = {
  state: LoopState
  seq: Anim[]
  si: number
  f: number
  props: Props
  tprops: Props
  inTransition: boolean
}

type Plan = { seq: Anim[]; to: LoopState; set: Partial<Props> }

export function createMachine(): Machine {
  const props: Props = { hat: false, clip: false, prev: null }
  return { state: 'offstage', seq: [LOOP.offstage], si: 0, f: 0, props, tprops: { ...props }, inTransition: false }
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
  }
}

// Interruptible: a new event replaces whatever transition is playing, drawn from the props held now.
export function fire(m: Machine, ev: StoryEvent, instant = false): boolean {
  const p = plan(m, ev)
  if (!p) return false
  m.tprops = { ...m.props }
  m.props = { ...m.props, ...p.set }
  m.state = p.to
  m.seq = instant ? [LOOP[p.to]] : [...p.seq, LOOP[p.to]]
  m.si = 0
  m.f = 0
  m.inTransition = !instant
  return true
}

export function current(m: Machine): Anim {
  return m.seq[m.si] ?? LOOP[m.state]
}

export function tick(m: Machine): void {
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
  return g
}
