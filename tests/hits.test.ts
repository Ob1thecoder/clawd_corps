import { expect, test } from 'claude-code/testing'

import { actionFor, cellToPixel, lookFrom, regionAt } from '../hooks/hits'

test('clicking Clawd is the p action in every state', () => {
  for (const s of ['idle', 'thinking', 'building', 'planning', 'doze'] as const) expect(regionAt(s, 'classic', 20, 12)).toBe('clawd')
  expect(actionFor('clawd')).toBe('p')
})

test('the ring: a corner icon in orange, the claw in Green Lantern', () => {
  expect(regionAt('idle', 'classic', 54, 1)).toBe('ring')
  expect(regionAt('idle', 'lantern', 54, 1)).toBe(null)
  expect(regionAt('building', 'lantern', 40, 12)).toBe('ring')
  expect(actionFor('ring')).toBe('r')
})

test('the nail while building, the clipboard while planning', () => {
  expect(regionAt('building', 'classic', 45, 15)).toBe('nail')
  expect(regionAt('building', 'lantern', 54, 15)).toBe('nail')
  expect(regionAt('idle', 'classic', 45, 15)).toBe(null)
  expect(regionAt('planning', 'classic', 48, 10)).toBe('plan')
  expect(regionAt('showplan', 'classic', 48, 10)).toBe('plan')
  expect(actionFor('nail')).toBe('w')
  expect(actionFor('plan')).toBe('w')
})

test('empty band is nothing', () => {
  expect(regionAt('idle', 'classic', 50, 15)).toBe(null)
  expect(regionAt('idle', 'classic', 0, 0)).toBe(null)
})

test('cells map to pixels per size', () => {
  expect(cellToPixel('full', 20, 6)).toEqual([20, 12])
  expect(cellToPixel('compact', 10, 3)).toEqual([20, 12])
  expect(cellToPixel('mini', 0, 0)).toEqual([20, 12])
})

test('eyes look toward the pointer', () => {
  expect(lookFrom(50, 11)).toBe('right')
  expect(lookFrom(0, 11)).toBe('left')
  expect(lookFrom(20, 0)).toBe('up')
  expect(lookFrom(21, 19)).toBe('down')
})
