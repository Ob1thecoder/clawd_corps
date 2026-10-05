import { CORPS, THEMES, type ThemeName } from './themes'

// Which colour each open session wears, kept in the mod's store so every session can read it.
export type Claim = { theme: ThemeName; n: number; at: number }
export type Claims = Record<string, Claim>

export const STALE_MS = 3 * 60_000     // a claim not refreshed for this long belongs to a session that's gone
export const REFRESH_MS = 60_000

export function prune(claims: Claims, now: number): Claims {
  const out: Claims = {}
  for (const [id, c] of Object.entries(claims)) if (now - c.at <= STALE_MS) out[id] = c
  return out
}

// This session's colour: its own live claim if it has one, else the first corps no other live session holds,
// else the least-used corps with the next number ("GREEN LANTERN 2").
export function claimFor(claims: Claims, self: string, now: number): Claim {
  const live = prune(claims, now)
  const mine = live[self]
  if (mine) return { ...mine, at: now }
  const others = Object.entries(live).filter(([id]) => id !== self).map(([, c]) => c)
  const free = CORPS.find(t => !others.some(c => c.theme === t))
  if (free) return { theme: free, n: 1, at: now }
  let best = CORPS[0]!
  let count = Infinity
  for (const t of CORPS) {
    const k = others.filter(c => c.theme === t).length
    if (k < count) { best = t; count = k }
  }
  const n = Math.max(...others.filter(c => c.theme === best).map(c => c.n)) + 1
  return { theme: best, n, at: now }
}

export function label(theme: ThemeName, n: number): string {
  return THEMES[theme].title.toUpperCase() + (n > 1 ? ` ${n}` : '')
}
