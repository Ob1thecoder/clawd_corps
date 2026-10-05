import type { LoopState } from './anims'
import { type Grid } from './pixels'
import { DEFAULT_COLOR, base64, hexColor } from './raster'
import type { Paint } from './themes'

export type Tier = 'full' | 'compact' | 'mini' | 'status'

export function pickTier(columns: number, rows: number): Tier {
  if (columns >= 58 && rows >= 10) return 'full'
  if (columns >= 29 && rows >= 5) return 'compact'
  if (columns >= 16 && rows >= 3) return 'mini'
  return 'status'
}

// Half size: each 2x2 block of pixels becomes one, taking its most common colour.
// A block that is partly empty but walled in by colour on both sides is a hole inside the body (an eye), so it stays empty.
export function shrink(g: Grid): Grid {
  const out: Grid = []
  const at = (x: number, y: number) => g[y]?.[x] ?? null
  for (let y = 0; y < Math.floor(g.length / 2); y++) {
    const row: (string | null)[] = []
    for (let x = 0; x < Math.floor((g[0]?.length ?? 0) / 2); x++) {
      const block = [at(2 * x, 2 * y), at(2 * x + 1, 2 * y), at(2 * x, 2 * y + 1), at(2 * x + 1, 2 * y + 1)]
      const filled = block.filter((c): c is string => c !== null)
      const walled = at(2 * x - 1, 2 * y) && at(2 * x + 2, 2 * y) && at(2 * x - 1, 2 * y + 1) && at(2 * x + 2, 2 * y + 1)
      if (filled.length < 2 || (filled.length < 4 && walled)) { row.push(null); continue }
      const count = new Map<string, number>()
      for (const c of filled) count.set(c, (count.get(c) ?? 0) + 1)
      row.push([...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null)
    }
    out.push(row)
  }
  return out
}

export const MINI = {
  open: [' ▐▛███▜▌ ', '▝▜█████▛▘', '  ▘▘ ▝▝  '],
  shut: [' ▐█████▌ ', '▝▜█████▛▘', '  ▘▘ ▝▝  '],
}

const PROPS: Record<LoopState, readonly string[]> = {
  offstage: [''], idle: [''], doze: ['z', 'Z'], thinking: ['.', 'o', 'O'], planning: ['✎', '·'],
  showplan: ['?', ' '], building: ['╱', '━'], waiting: ['?', ' '],
}

export function miniProp(state: LoopState, t: number): string {
  const frames = PROPS[state]
  return frames[t % frames.length] ?? ''
}

// The welcome-screen Clawd as 9 x 3 cells in the theme's colour; it blinks every 20 frames and sleeps shut.
export function miniCells(state: LoopState, p: Paint, t: number): string {
  const rows = state === 'doze' || t % 20 >= 18 ? MINI.shut : MINI.open
  const fg = hexColor(p.body)
  const view = new DataView(new ArrayBuffer(9 * 3 * 12))
  rows.forEach((row, r) => {
    ;[...row].forEach((ch, x) => {
      const at = (r * 9 + x) * 12
      const blank = ch === ' '
      view.setUint32(at, ch.codePointAt(0) ?? 0x20, true)
      view.setUint32(at + 4, blank ? DEFAULT_COLOR : fg, true)
      view.setUint32(at + 8, DEFAULT_COLOR, true)
    })
  })
  return base64(new Uint8Array(view.buffer))
}
