import { expect, test } from 'claude-code/testing'

import { grid } from '../hooks/pixels'
import {
  CX, CY, HAND, NX, STROKES, drawClawd, drawClipboard, drawHammer, drawHat, drawNail, drawPencil,
  impactPivot, nailHeadY,
} from '../hooks/props'
import { C, THEMES, isThemeName } from '../hooks/themes'

const P = THEMES.lantern

test('every theme has spinner words for every state', () => {
  for (const theme of Object.values(THEMES)) {
    for (const words of Object.values(theme.words)) expect(words.length).toBeGreaterThan(0)
  }
  expect(isThemeName('lantern')).toBe(true)
  expect(isThemeName('purple')).toBe(false)
})

test('Clawd open eyes are empty notches, closed eyes are filled', () => {
  const open = grid()
  drawClawd(open, P, { eyes: 'open' })
  expect(open[CY + 2]?.[CX + 10]).toBe(null)
  expect(open[CY]?.[CX + 6]).toBe(P.body)
  const shut = grid()
  drawClawd(shut, P, { eyes: 'closed' })
  expect(shut[CY + 2]?.[CX + 10]).toBe(P.body)
})

test('Clawd shifted fully off the left edge draws nothing', () => {
  const g = grid()
  drawClawd(g, P, { ox: -38 })
  expect(g.every(row => row.every(c => c === null))).toBe(true)
})

test('hat brim sits on the row above the head', () => {
  const g = grid()
  drawHat(g)
  expect(g[CY - 1]?.[20]).toBe(C.brim)
  expect(g[CY]?.[20]).toBe(null)
})

test('hammer at 90 degrees lands its face right above the nail head', () => {
  for (const h of [3, 2, 1, 0]) {
    const g = grid()
    drawNail(g, h)
    drawHammer(g, impactPivot(h), 90)
    expect(g[nailHeadY(h) - 1]?.[NX]).toBe(C.face)
    expect(g[nailHeadY(h)]?.[NX]).toBe(C.nail)
  }
})

test('raised hammer puts its grip at the hand', () => {
  const g = grid()
  drawHammer(g, HAND, 0)
  expect(g[HAND[1]]?.[HAND[0]]).toBe(C.grip)
})

test('clipboard shows exactly the strokes drawn so far', () => {
  const g = grid()
  drawClipboard(g, 0, 0, 3)
  const first = STROKES[0]
  const fourth = STROKES[3]
  if (!first || !fourth) throw new Error('strokes missing')
  expect(g[first[1]]?.[first[0]]).toBe(C.ink)
  expect(g[fourth[1]]?.[fourth[0]]).not.toBe(C.ink)
})

test('pencil tip is graphite and its far end is the eraser', () => {
  const g = grid()
  const end = drawPencil(g, 45, 8)
  expect(g[8]?.[45]).toBe(C.pTip)
  expect(g[end[1]]?.[end[0]]).toBe(C.pEraser)
})
