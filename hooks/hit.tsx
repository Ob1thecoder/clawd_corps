import type { ClientModule } from 'claude-code'

// An empty region laid over Clawd's Raster: it draws nothing and reports the pointer, by cell, to register.tsx.
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
      if (ev.type === 'down') { downs++; dx = ev.x; dy = ev.y }
      if (ev.type === 'down' || ev.type === 'move') surface.post({ t: ev.type, x: ev.x, y: ev.y, downs, dx, dy })
      if (ev.type === 'leave') surface.post({ t: 'leave', downs, dx, dy })
    })
    surface.setState(true)
  }
  const { columns = 58, rows = 10 } = (props ?? {}) as HitProps
  const { Box } = surface.elements
  return <Box width={columns} height={rows} />
}

export default Hit
