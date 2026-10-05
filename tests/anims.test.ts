import { expect, test } from 'claude-code/testing'

import { A, LOOP, type Props } from '../hooks/anims'
import { grid } from '../hooks/pixels'
import { CX, CY, NX, STROKES, nailHeadY } from '../hooks/props'
import { C, THEMES } from '../hooks/themes'

const P = THEMES.lantern
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
