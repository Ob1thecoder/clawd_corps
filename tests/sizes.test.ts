import { expect, test } from 'claude-code/testing'

import { createMachine, fire, render } from '../hooks/machine'
import { decodeCells, encodeCells, hexColor } from '../hooks/raster'
import { MINI, miniCells, miniProp, pickTier, shrink } from '../hooks/sizes'
import { THEMES } from '../hooks/themes'

test('the size is picked at each boundary', () => {
  expect(pickTier(58, 10)).toBe('full')
  expect(pickTier(57, 10)).toBe('compact')
  expect(pickTier(58, 9)).toBe('compact')
  expect(pickTier(29, 5)).toBe('compact')
  expect(pickTier(28, 5)).toBe('mini')
  expect(pickTier(29, 4)).toBe('mini')
  expect(pickTier(16, 3)).toBe('mini')
  expect(pickTier(15, 3)).toBe('status')
  expect(pickTier(80, 2)).toBe('status')
})

test('shrink halves the grid and keeps both eyes open', () => {
  const m = createMachine()
  fire(m, 'start', true)
  const small = shrink(render(m, THEMES.classic))
  expect(small.length).toBe(10)
  expect(small[0]?.length).toBe(29)
  for (const x of [6, 13]) {
    expect(small[5]?.[x]).toBe(null)
    expect(small[5]?.[x - 1]).toBe(THEMES.classic.body)
  }
  expect(small[7]?.[8]).toBe(THEMES.classic.body)
})

test('a shrunk frame encodes as 29 x 5 cells', () => {
  const m = createMachine()
  fire(m, 'start', true)
  expect(decodeCells(encodeCells(shrink(render(m, THEMES.classic)))).length).toBe(29 * 5)
})

test('mini is the welcome-screen Clawd in the theme colour, and it blinks', () => {
  const open = decodeCells(miniCells('idle', THEMES.lantern, 0))
  expect(open.length).toBe(27)
  expect(open[1]?.[0]).toBe('▐'.codePointAt(0))
  expect(open[2]?.[0]).toBe('▛'.codePointAt(0))
  expect(open[1]?.[1]).toBe(hexColor(THEMES.lantern.body))
  const blink = decodeCells(miniCells('idle', THEMES.lantern, 18))
  expect(blink[2]?.[0]).toBe('█'.codePointAt(0))
  expect(MINI.open.every(row => [...row].length === 9)).toBe(true)
})

test('mini has a prop character for each working state', () => {
  expect(miniProp('building', 0)).not.toBe(miniProp('building', 1))
  expect(miniProp('idle', 0)).toBe('')
  expect(miniProp('doze', 0).length).toBeGreaterThan(0)
})
