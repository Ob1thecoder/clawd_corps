import type { ClientModule } from 'claude-code'

// An empty region laid over Clawd's Raster: it draws nothing and reports the pointer, by cell, to register.tsx.
// The terminal sends pointer events in the fullscreen layout only; elsewhere the hotkey buttons stand in.
type HitProps = { columns?: number; rows?: number }

const Hit: ClientModule = (props, surface) => {
  if (surface.state === undefined) {
    surface.onPointer(ev => {
      if (ev.type === 'down' || ev.type === 'move') surface.post({ t: ev.type, x: ev.x, y: ev.y })
      if (ev.type === 'leave') surface.post({ t: 'leave' })
    })
    surface.setState(true)
  }
  const { columns = 58, rows = 10 } = (props ?? {}) as HitProps
  const { Box } = surface.elements
  return <Box width={columns} height={rows} />
}

export default Hit
