import { expect, test } from 'claude-code/testing'

import { A, LOOP, type Props } from '../hooks/anims'
import { grid } from '../hooks/pixels'
import { CX, CY, NX, STROKES, nailHeadY } from '../hooks/props'
import { C, THEMES } from '../hooks/themes'

const P = THEMES.classic
const PROPS: Props[] = [
  { hat: false, clip: false, prev: null },
  { hat: true, clip: false, prev: 'building' },
  { hat: false, clip: true, prev: 'planning' },
  { hat: true, clip: true, prev: 'thinking' },
]

function frame(name: keyof typeof A, i: number, props: Props = PROPS[0]!) {
  const g = grid()
  A[name].draw(g, i, props, P)
  return g
}

test('every frame of every animation draws without throwing, with any props', () => {
  for (const anim of Object.values(A)) {
    for (const props of PROPS) {
      for (let i = 0; i < anim.n * (anim.loop ? 2 : 1); i++) {
        const g = grid()
        anim.draw(g, i, props, P)
        expect(g.some(row => row.some(c => c !== null))).toBe(true)
      }
    }
  }
})

test('every loop state has a looping animation', () => {
  for (const anim of Object.values(LOOP)) expect(anim.loop).toBe(true)
})

test('enter starts with Clawd fully off stage', () => {
  const g = frame('enter', 0)
  expect(g.some(row => row.some(c => c === P.body))).toBe(false)
})

test('idle blinks on frame 14', () => {
  expect(frame('idle', 0)[CY + 2]?.[CX + 10]).toBe(null)
  expect(frame('idle', 14)[CY + 2]?.[CX + 10]).toBe(P.body)
})

test('hatOn ends with the hat on and the hammer raised', () => {
  const g = frame('hatOn', A.hatOn.n - 1)
  expect(g[CY - 1]?.[20]).toBe(C.brim)
  expect(g.some(row => row.some(c => c === C.face))).toBe(true)
})

test('building impact frame puts the hammer face on the nail', () => {
  const g = frame('building', 3)
  expect(g[nailHeadY(2) - 1]?.[NX]).toBe(C.face)
})

test('planning ends its drawing phase with every stroke on the page', () => {
  const g = frame('planning', A.planning.n - 3)
  const last = STROKES[STROKES.length - 1]
  if (!last) throw new Error('no strokes')
  expect(g[last[1]]?.[last[0]]).toBe(C.check)
})

test('waiting draws the hat only when the props say so', () => {
  const bare = frame('waiting', 0, PROPS[0])
  const hatted = frame('waiting', 0, PROPS[1])
  expect(bare[CY - 1]?.[20]).not.toBe(C.brim)
  expect(hatted[CY - 1]?.[20]).toBe(C.brim)
})

// ---- Green Lantern style ----
const L = THEMES.lantern

function lframe(name: keyof typeof A, i: number, props: Props = PROPS[1]!) {
  const g = grid()
  A[name].draw(g, i, props, L)
  return g
}
const has = (g: ReturnType<typeof grid>, c: string) => g.some(row => row.some(px => px === c))

test('every frame of every animation draws in both themes', () => {
  for (const theme of Object.values(THEMES)) {
    for (const anim of Object.values(A)) {
      for (const props of PROPS) {
        for (let i = 0; i < anim.n; i++) {
          const g = grid()
          anim.draw(g, i, props, theme)
          expect(g.some(row => row.some(c => c !== null))).toBe(true)
        }
      }
    }
  }
})

test('lantern Clawd wears the white chest badge', () => {
  expect(lframe('idle', 0, PROPS[0])[10]?.[20]).toBe(C.badgeW)
  expect(frame('idle', 0)[10]?.[20]).not.toBe(C.badgeW)
})

test('lantern building never wears a hat and always shows ring energy', () => {
  for (let i = 0; i < A.building.n; i++) {
    const g = lframe('building', i)
    expect(has(g, C.brim) || has(g, C.hat)).toBe(false)
    expect(has(g, C.energy)).toBe(true)
  }
  const on = lframe('hatOn', A.hatOn.n - 1)
  expect(has(on, C.brim)).toBe(false)
})

test('lantern claw stays put while the construct does the hammering', () => {
  for (let i = 0; i < A.building.n; i++) {
    const g = lframe('building', i)
    const fist = g[12]?.[38] ?? g[11]?.[38]
    expect(fist).toBe(L.body)
    expect(has(g, C.steel)).toBe(false)
  }
})

test('suit up turns orange Clawd green from the feet up, badge at the end', () => {
  const O = THEMES.classic.body
  const first = frame('suitUp', 0)
  expect(has(first, O)).toBe(true)
  expect(has(first, L.body)).toBe(false)
  const mid = frame('suitUp', 14)
  expect(mid[17]?.[10]).toBe(L.body)
  expect(mid[10]?.[10]).toBe(O)
  const last = frame('suitUp', A.suitUp.n - 1)
  expect(has(last, O)).toBe(false)
  expect(last[10]?.[20]).toBe(C.badgeW)
})

test('power down ends orange with no badge', () => {
  const last = frame('powerDown', A.powerDown.n - 1)
  expect(has(last, THEMES.lantern.body)).toBe(false)
  expect(has(last, C.badgeW)).toBe(false)
  expect(has(last, THEMES.classic.body)).toBe(true)
})
