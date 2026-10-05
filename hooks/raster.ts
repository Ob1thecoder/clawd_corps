import { type Grid, H, W } from './pixels'

export const COLUMNS = W
export const ROWS = H / 2
export const DEFAULT_COLOR = 0x01000000

const UPPER = 0x2580
const LOWER = 0x2584
const SPACE = 0x20
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function hexColor(c: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(c)
  return m?.[1] ? parseInt(m[1], 16) : DEFAULT_COLOR
}

function cellOf(top: string | null, bottom: string | null): [number, number, number] {
  if (top && bottom) return [UPPER, hexColor(top), hexColor(bottom)]
  if (top) return [UPPER, hexColor(top), DEFAULT_COLOR]
  if (bottom) return [LOWER, hexColor(bottom), DEFAULT_COLOR]
  return [SPACE, DEFAULT_COLOR, DEFAULT_COLOR]
}

export function base64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1] ?? 0
    const c = bytes[i + 2] ?? 0
    const n = (a << 16) | (b << 8) | c
    out += ALPHABET[(n >> 18) & 63]
    out += ALPHABET[(n >> 12) & 63]
    out += i + 1 < bytes.length ? ALPHABET[(n >> 6) & 63] : '='
    out += i + 2 < bytes.length ? ALPHABET[n & 63] : '='
  }
  return out
}

function unbase64(s: string): Uint8Array {
  const clean = s.replace(/=+$/, '')
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4))
  let o = 0
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (ALPHABET.indexOf(clean[i] ?? 'A') << 18) |
      (ALPHABET.indexOf(clean[i + 1] ?? 'A') << 12) |
      (Math.max(0, ALPHABET.indexOf(clean[i + 2] ?? 'A')) << 6) |
      Math.max(0, ALPHABET.indexOf(clean[i + 3] ?? 'A'))
    if (o < out.length) out[o++] = (n >> 16) & 255
    if (o < out.length) out[o++] = (n >> 8) & 255
    if (o < out.length) out[o++] = n & 255
  }
  return out
}

export function encodeCells(g: Grid): string {
  const view = new DataView(new ArrayBuffer(COLUMNS * ROWS * 12))
  for (let r = 0; r < ROWS; r++) {
    for (let x = 0; x < COLUMNS; x++) {
      const [cp, fg, bg] = cellOf(g[2 * r]?.[x] ?? null, g[2 * r + 1]?.[x] ?? null)
      const at = (r * COLUMNS + x) * 12
      view.setUint32(at, cp, true)
      view.setUint32(at + 4, fg, true)
      view.setUint32(at + 8, bg, true)
    }
  }
  return base64(new Uint8Array(view.buffer))
}

export function decodeCells(s: string): [number, number, number][] {
  const bytes = unbase64(s)
  const view = new DataView(bytes.buffer)
  const cells: [number, number, number][] = []
  for (let at = 0; at + 12 <= bytes.length; at += 12) {
    cells.push([view.getUint32(at, true), view.getUint32(at + 4, true), view.getUint32(at + 8, true)])
  }
  return cells
}
