import type { LoopState } from './anims'
import type { Look } from './machine'
import type { Point } from './props'
import type { Tier } from './sizes'
import type { Style } from './themes'

export type Region = 'clawd' | 'ring' | 'nail' | 'plan'
export type Action = 'p' | 'r' | 'w' | 'h'

// What a click at pixel (x, y) of the full-size scene lands on.
export function regionAt(state: LoopState, style: Style, x: number, y: number): Region | null {
  if (style === 'classic' && x >= 52 && y <= 3) return 'ring'
  if ((state === 'planning' || state === 'showplan') && x >= 39 && y >= 2) return 'plan'
  // A Green Lantern's ring: on the outstretched fist while building, else the glint at the claw tip.
  if (style === 'lantern') {
    const onRing = state === 'building' ? x >= 38 && x <= 44 && y >= 9 && y <= 15 : x >= 35 && x <= 37 && y >= 12 && y <= 15
    if (onRing) return 'ring'
  }
  if (state === 'building' && y >= 11 && x >= (style === 'lantern' ? 46 : 40)) return 'nail'
  if (x >= 2 && x <= 37 && y >= 3 && y <= 18) return 'clawd'
  return null
}

export function actionFor(region: Region): Action {
  return region === 'clawd' ? 'p' : region === 'ring' ? 'r' : 'w'
}

// A terminal cell of the drawn size, as a pixel of the full-size scene. In mini, every click is on Clawd.
export function cellToPixel(tier: Tier, col: number, row: number): Point {
  if (tier === 'compact') return [col * 2, row * 4]
  if (tier === 'mini' || tier === 'status') return [20, 12]
  return [col, row * 2]
}

// Which way Clawd's eyes turn toward a pixel, from the middle of its face.
export function lookFrom(x: number, y: number): Look {
  const dx = x - 20
  const dy = (y - 11) * 2
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}
