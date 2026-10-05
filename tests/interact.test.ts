import { expect, test } from 'claude-code/testing'

import { A, LOOP } from '../hooks/anims'
import { BOOST, createMachine, current, fire, peek, render, tick, whack } from '../hooks/machine'
import { CX, CY, NX, STROKES, nailHeadY } from '../hooks/props'
import { C, THEMES } from '../hooks/themes'

const O = THEMES.classic
const G = THEMES.lantern
const at = (ev: Parameters<typeof fire>[1][]) => { const m = createMachine(); fire(m, 'start', true); ev.forEach(e => fire(m, e, true)); return m }
const has = (g: ReturnType<typeof render>, c: string) => g.some(r => r.some(p => p === c))

test('a poke while idle plays the poke, then returns to idle', () => {
  const m = at([])
  expect(fire(m, 'poke')).toBe(true)
  expect(current(m)).toBe(A.poke)
  for (let i = 0; i < A.poke.n; i++) tick(m)
  expect(current(m)).toBe(LOOP.idle)
})

test('a poke while planning only flinches, the animation carries on', () => {
  const m = at(['prompt', 'planmode'])
  expect(fire(m, 'poke')).toBe(true)
  expect(current(m)).toBe(LOOP.planning)
  expect(m.flinch).toBeGreaterThan(0)
  expect(has(render(m, O), C.heart)).toBe(true)
})

test('the whip only works while building, and doubles the pace for BOOST ticks', () => {
  expect(fire(at([]), 'whip')).toBe(false)
  const m = at(['prompt', 'edit'])
  expect(fire(m, 'whip')).toBe(true)
  expect(current(m)).toBe(A.whipHit)
  expect(m.boost).toBe(BOOST)
  tick(m)
  expect(m.f).toBe(2)
  for (let i = 1; i < BOOST; i++) tick(m)
  expect(m.boost).toBe(0)
  const f = m.f
  tick(m)
  expect(m.f).toBe(f + 1)
})

test('under the whip Clawd sweats, keeps normal eyes, and a Green Lantern does not hop', () => {
  for (const p of [O, G]) {
    const m = at(['prompt', 'edit'])
    fire(m, 'whip')
    for (let i = 0; i < A.whipHit.n; i++) {
      const g = render(m, p)
      expect(g[CY + 2]?.[CX + 10]).not.toBe('#ffffff')
      if (p === G) expect(g[CY - 2]?.[CX + 8]).not.toBe(G.body)   // a Green Lantern's head never rises
      expect(has(g, C.sweat)).toBe(true)
      m.f = i + 1
    }
  }
  const m = at(['prompt', 'edit'])
  fire(m, 'whip')
  m.f = 3
  expect(render(m, O)[CY - 2]?.[CX + 8]).toBe(O.body)            // orange Clawd's head has hopped up 2 rows
})

test('a whack jumps the hammering to its next impact', () => {
  const m = at(['prompt', 'edit'])
  expect(whack(m)).toBe(true)
  expect(render(m, O)[nailHeadY(2) - 1]?.[NX]).toBe(C.face)
  expect(whack(at([]))).toBe(false)
})

test('a peek shows the finished plan', () => {
  const m = at(['prompt', 'planmode'])
  expect(peek(m)).toBe(true)
  const last = STROKES[STROKES.length - 1]!
  expect(render(m, O)[last[1]]?.[last[0]]).toBe(C.check)
})

test('eyes follow the pointer while idle', () => {
  const m = at([])
  m.look = 'right'
  const g = render(m, O)
  expect(g[CY + 2]?.[CX + 10]).toBe(O.body)
  expect(g[CY + 2]?.[CX + 11]).toBe(null)
  m.look = 'up'
  const u = render(m, O)
  expect(u[CY + 3]?.[CX + 10]).toBe(O.body)
  expect(u[CY + 2]?.[CX + 10]).toBe(null)
})

test('orange Clawd has a ring to click in the corner, a Green Lantern wears it', () => {
  expect(render(at([]), O)[0]?.[54]).toBe(C.energyHi)
  expect(render(at([]), G)[0]?.[54]).toBe(null)
})
