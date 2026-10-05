import { expect, test } from 'claude-code/testing'

import { A, LOOP } from '../hooks/anims'
import { type StoryEvent, createMachine, current, fire, render, tick } from '../hooks/machine'
import { THEMES } from '../hooks/themes'

const STORY: [StoryEvent, string][] = [
  ['start', 'idle'], ['prompt', 'thinking'], ['planmode', 'planning'], ['planshown', 'showplan'],
  ['reject', 'planning'], ['planshown', 'showplan'], ['approve', 'building'], ['error', 'building'],
  ['permask', 'waiting'], ['permok', 'building'], ['turnend', 'idle'], ['idle2m', 'doze'],
  ['typing', 'idle'], ['prompt', 'thinking'], ['edit', 'building'], ['esc', 'idle'],
]

test('the storyboard script walks through the expected states', () => {
  const m = createMachine()
  expect(m.state).toBe('offstage')
  for (const [ev, state] of STORY) {
    expect(fire(m, ev)).toBe(true)
    expect(m.state).toBe(state)
    for (let i = 0; i < 40; i++) tick(m)
  }
})

test('approve puts the hat on and the clipboard away', () => {
  const m = createMachine()
  for (const ev of ['start', 'prompt', 'planmode', 'planshown', 'approve'] as const) fire(m, ev, true)
  expect(m.props).toEqual({ hat: true, clip: false, prev: null })
})

test('a transition plays to its end, then the loop takes over', () => {
  const m = createMachine()
  fire(m, 'start')
  expect(m.inTransition).toBe(true)
  expect(current(m)).toBe(A.enter)
  for (let i = 0; i < A.enter.n; i++) tick(m)
  expect(m.inTransition).toBe(false)
  expect(current(m)).toBe(LOOP.idle)
})

test('an event that does not fit the state is ignored', () => {
  const m = createMachine()
  fire(m, 'start', true)
  const before = current(m)
  expect(fire(m, 'error')).toBe(false)
  expect(m.state).toBe('idle')
  expect(current(m)).toBe(before)
})

test('before start, every event is ignored (headless runs stay offstage)', () => {
  const m = createMachine()
  for (const ev of ['prompt', 'planmode', 'edit', 'error', 'permask', 'turnend', 'esc', 'idle2m', 'typing'] as const) {
    expect(fire(m, ev)).toBe(false)
  }
  expect(m.state).toBe('offstage')
})

test('an interrupting event starts from the props held when it fired', () => {
  const m = createMachine()
  for (const ev of ['start', 'prompt', 'edit'] as const) fire(m, ev, true)
  expect(m.props.hat).toBe(true)
  fire(m, 'esc')
  expect(current(m)).toBe(A.startle)
  expect(m.tprops.hat).toBe(true)
  expect(m.props.hat).toBe(false)
})

test('a permission prompt returns to the state it interrupted', () => {
  const m = createMachine()
  for (const ev of ['start', 'prompt', 'planmode', 'permask'] as const) fire(m, ev, true)
  expect(m.state).toBe('waiting')
  fire(m, 'permok')
  expect(m.state).toBe('planning')
})

test('a denied permission: sign down first, then the mishap, never stuck waiting', () => {
  const m = createMachine()
  for (const ev of ['start', 'prompt', 'edit', 'permask'] as const) fire(m, ev, true)
  expect(fire(m, 'permok')).toBe(true)
  expect(fire(m, 'error')).toBe(true)
  expect(m.state).toBe('building')
  expect(current(m)).toBe(A.mishap)
})

test('waking from a doze for a prompt plays wake, then perk', () => {
  const m = createMachine()
  for (const ev of ['start', 'idle2m'] as const) fire(m, ev, true)
  fire(m, 'prompt')
  expect(m.seq.slice(0, 2)).toEqual([A.wake, A.perk])
})

test('render returns a full grid for the current frame', () => {
  const m = createMachine()
  fire(m, 'start', true)
  const g = render(m, THEMES.classic)
  expect(g.some(row => row.some(c => c === THEMES.classic.body))).toBe(true)
})

test('a plan shown without EnterPlanMode (Shift+Tab plan mode) still brings out the clipboard', () => {
  const m = createMachine()
  for (const ev of ['start', 'prompt'] as const) fire(m, ev, true)
  expect(fire(m, 'planshown')).toBe(true)
  expect(m.state).toBe('showplan')
  expect(m.seq.slice(0, 2)).toEqual([A.clipIn, A.showIn])
  expect(m.props.clip).toBe(true)
})
