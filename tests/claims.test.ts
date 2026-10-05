import { expect, test } from 'claude-code/testing'

import { STALE_MS, type Claims, claimAs, claimFor, label, prune } from '../hooks/claims'

const at = 1_000_000

test('the first session takes Green', () => {
  expect(claimFor({}, 'me', at)).toEqual({ theme: 'lantern', n: 1, at })
})

test('a new session skips colours other live sessions hold', () => {
  const claims: Claims = { a: { theme: 'lantern', n: 1, at }, b: { theme: 'blue', n: 1, at } }
  expect(claimFor(claims, 'me', at).theme).toBe('red')
})

test('a session keeps its own claim when it refreshes', () => {
  const claims: Claims = { me: { theme: 'violet', n: 1, at: at - 1000 } }
  expect(claimFor(claims, 'me', at)).toEqual({ theme: 'violet', n: 1, at })
})

test('stale claims (crashed sessions) are dropped', () => {
  const claims: Claims = { dead: { theme: 'lantern', n: 1, at: at - STALE_MS - 1 }, live: { theme: 'blue', n: 1, at } }
  expect(Object.keys(prune(claims, at))).toEqual(['live'])
  expect(claimFor(claims, 'me', at).theme).toBe('lantern')
})

test('with all seven taken, the least-used colour comes back numbered', () => {
  const claims: Claims = {}
  for (const [i, t] of (['lantern', 'blue', 'red', 'yellow', 'violet', 'white', 'black'] as const).entries()) claims[`s${i}`] = { theme: t, n: 1, at }
  const c = claimFor(claims, 'me', at)
  expect(c).toEqual({ theme: 'lantern', n: 2, at })
  expect(label(c.theme, c.n)).toBe('GREEN LANTERN 2')
  expect(label('blue', 1)).toBe('BLUE LANTERN')
})

test('a shared colour keeps its number across refreshes', () => {
  const first = claimAs({ a: { theme: 'blue', n: 1, at } }, 'me', 'blue', at)
  expect(first.n).toBe(2)
  const again = claimAs({ a: { theme: 'blue', n: 1, at }, me: first }, 'me', 'blue', at + 60_000)
  expect(again.n).toBe(2)
  const third = claimAs({ a: { theme: 'blue', n: 1, at }, me: again }, 'me', 'blue', at + 120_000)
  expect(third.n).toBe(2)
  expect(claimAs({ a: { theme: 'blue', n: 1, at } }, 'me', 'red', at).n).toBe(1)
})
