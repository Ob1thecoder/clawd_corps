import { expect, test } from 'claude-code/testing'

import { H, W, glyph, grid, lerp, line, px, rect, toText } from '../hooks/pixels'

function count(text: string): number {
  return text.split('').filter(ch => ch === '#').length
}

test('grid is W x H and empty', () => {
  const g = grid()
  expect(g.length).toBe(H)
  expect(g[0]?.length).toBe(W)
  expect(count(toText(g))).toBe(0)
})

test('px rounds and clips outside the grid', () => {
  const g = grid()
  px(g, -1, 0, '#ffffff')
  px(g, W, 0, '#ffffff')
  px(g, 0, H, '#ffffff')
  px(g, 2.4, 3.6, '#abcdef')
  expect(g[4]?.[2]).toBe('#abcdef')
  expect(count(toText(g))).toBe(1)
})

test('px ignores a null color', () => {
  const g = grid()
  px(g, 1, 1, '#ffffff')
  px(g, 1, 1, null)
  expect(g[1]?.[1]).toBe('#ffffff')
})

test('rect fills w x h', () => {
  const g = grid()
  rect(g, 1, 1, 3, 2, '#ffffff')
  expect(count(toText(g))).toBe(6)
  expect(g[2]?.[3]).toBe('#ffffff')
})

test('line covers both endpoints of a diagonal', () => {
  const g = grid()
  line(g, 0, 0, 3, 3, '#ffffff')
  for (const k of [0, 1, 2, 3]) expect(g[k]?.[k]).toBe('#ffffff')
  expect(count(toText(g))).toBe(4)
})

test('lerp clamps t to 0..1', () => {
  expect(lerp(0, 10, 0.5)).toBe(5)
  expect(lerp(0, 10, -1)).toBe(0)
  expect(lerp(0, 10, 2)).toBe(10)
})

test('glyph "!" draws 4 pixels', () => {
  const g = grid()
  glyph(g, '!', 0, 0, '#ffffff')
  expect(count(toText(g))).toBe(4)
})
