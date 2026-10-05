import type { ClientModule } from 'claude-code'

// An empty region laid over Clawd's Raster: it draws nothing and reports clicks only, by cell, to register.tsx.
// Pointer moves are deliberately not reported: they would stream a message every frame for nothing.
// The terminal sends pointer events in the fullscreen layout only; elsewhere the hotkey buttons stand in.
type HitProps = { columns?: number; rows?: number }

const Hit: ClientModule = (props, surface) => {
  if (surface.state === undefined) {
    // Only the last post of a frame is delivered, so every post carries a running count of clicks and where
    // the latest one was: a move that replaces a click in the same frame still delivers it.
    let downs = 0
    let dx = 0
    let dy = 0
    surface.onPointer(ev => {
      if (ev.type !== 'down') return
      downs++
      dx = ev.x
      dy = ev.y
      surface.post({ t: 'down', x: ev.x, y: ev.y, downs, dx, dy })
    })
    surface.setState(true)
  }
  const { columns = 58, rows = 10 } = (props ?? {}) as HitProps
  const { Box } = surface.elements
  return <Box width={columns} height={rows} />
}

export default Hit
