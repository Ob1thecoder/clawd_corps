export const W = 58
export const H = 20

export type Color = string
export type Grid = (Color | null)[][]

export function grid(): Grid {
  const g: Grid = []
  for (let y = 0; y < H; y++) g.push(new Array<Color | null>(W).fill(null))
  return g
}

export function px(g: Grid, x: number, y: number, c: Color | null | undefined): void {
  const rx = Math.round(x)
  const ry = Math.round(y)
  const row = g[ry]
  if (c && row && rx >= 0 && rx < W) row[rx] = c
}

// A null colour clears the pixels instead of painting them.
export function rect(g: Grid, x: number, y: number, w: number, h: number, c: Color | null): void {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (c) px(g, x + i, y + j, c)
      else { const row = g[Math.round(y + j)]; const cx = Math.round(x + i); if (row && cx >= 0 && cx < W) row[cx] = null }
    }
  }
}

export function line(g: Grid, x0: number, y0: number, x1: number, y1: number, c: Color): void {
  let x = Math.round(x0)
  let y = Math.round(y0)
  const tx = Math.round(x1)
  const ty = Math.round(y1)
  const dx = Math.abs(tx - x)
  const sx = x < tx ? 1 : -1
  const dy = -Math.abs(ty - y)
  const sy = y < ty ? 1 : -1
  let err = dx + dy
  for (let k = 0; k < 200; k++) {
    px(g, x, y, c)
    if (x === tx && y === ty) break
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; x += sx }
    if (e2 <= dx) { err += dx; y += sy }
  }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

const GLYPHS = {
  '!': ['.#.', '.#.', '.#.', '...', '.#.'],
  '?': ['##.', '..#', '.#.', '...', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  z: ['##', '.#', '#.', '##'],
} as const

export type GlyphName = keyof typeof GLYPHS

export function glyph(g: Grid, ch: GlyphName, x: number, y: number, c: Color): void {
  const rows: readonly string[] = GLYPHS[ch]
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === '#') px(g, x + i, y + j, c)
  })
}

export function toText(g: Grid): string {
  return g.map(row => row.map(c => (c ? '#' : '.')).join('')).join('\n')
}
