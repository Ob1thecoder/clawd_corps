import { expect, test } from 'claude-code/testing'

import { CORPS, THEMES, C, corpsOf } from '../hooks/themes'
import { createMachine, fire, render } from '../hooks/machine'

const has = (g: ReturnType<typeof render>, c: string) => g.some(r => r.some(p => p === c))
function building(theme: keyof typeof THEMES) {
  const m = createMachine()
  for (const ev of ['start', 'prompt', 'edit'] as const) fire(m, ev, true)
  return render(m, THEMES[theme])
}

test('seven corps, each with its own colour, symbol, emblem and words', () => {
  expect(CORPS).toEqual(['lantern', 'blue', 'red', 'yellow', 'violet', 'white', 'black'])
  const bodies = new Set(CORPS.map(n => THEMES[n].body))
  expect(bodies.size).toBe(7)
  const symbols = new Set(CORPS.map(n => THEMES[n].badge.join('|')))
  expect(symbols.size).toBe(7)
  for (const n of CORPS) {
    expect(THEMES[n].badge.length).toBe(7)
    expect(THEMES[n].badge.every(r => r.length === 9)).toBe(true)
    expect(THEMES[n].emblem.length).toBeGreaterThan(0)
    expect(THEMES[n].style).toBe('lantern')
  }
  expect(THEMES.classic.style).toBe('classic')
})

test('a Blue Lantern frame is blue all through: no green ring energy left', () => {
  const g = building('blue')
  expect(has(g, THEMES.blue.body)).toBe(true)
  expect(has(g, THEMES.blue.ring.energy)).toBe(true)
  expect(has(g, C.energy)).toBe(false)
  expect(has(g, THEMES.lantern.body)).toBe(false)
})

test('each corps wears its own symbol on the badge', () => {
  const m = createMachine()
  fire(m, 'start', true)
  for (const n of CORPS) {
    const g = render(m, THEMES[n])
    const t = THEMES[n]
    // badge top-left is at (16, 10); row 3 differs between symbols
    const row = THEMES[n].badge[3]!
    for (let i = 0; i < 9; i++) {
      const want = row[i] === 'W' ? t.ring.badgeBg : row[i] === 'D' ? t.ring.badgeFg : null
      if (want) expect(g[13]?.[16 + i]).toBe(want)
    }
  }
})

test('Black Lantern has a rim so it shows on a dark terminal', () => {
  const g = building('black')
  expect(has(g, THEMES.black.ring.rim ?? 'none')).toBe(true)
  expect(has(g, THEMES.lantern.ring.rim ?? 'none')).toBe(false)
})

test('corps names and aliases resolve', () => {
  expect(corpsOf('green')).toBe('lantern')
  expect(corpsOf('lantern')).toBe('lantern')
  expect(corpsOf('Violet')).toBe('violet')
  expect(corpsOf('classic')).toBe('classic')
  expect(corpsOf('purple')).toBe(null)
})
