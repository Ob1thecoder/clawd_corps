import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

import { decodeCells } from '../hooks/raster'

const BAND = (bodyColumns = 80, maxRows = 12) =>
  ({
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows, bodyColumns, scroll: { offset: 0, bodyRows: maxRows }, view: {} },
  }) as const

async function start($: Engine, on: On, opts: { clock?: boolean } = {}) {
  on('session.start', () => ({ cwd: '/' }))
  on('command.register', () => ({ value: { command: 'clawd' } }))
  mock.store(on)
  const clock = opts.clock === false ? null : mock.clock(on)
  on('ui.render', ($e, e) => {
    const { Box } = $e.ui.resolve(e)
    return <Box key="engine" />
  })
  on('tool.call', () => ({ result: 'ok' }))
  on('command.run', () => ({ text: '' }))
  on('turn.complete', () => ({ text: '' }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  return clock
}

function clawd($: Engine, args: string) {
  return $.command.run({
    command: 'clawd', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 },
  })
}

test('the band draws a 58x10 Raster and a state label on the terminal', async ($, on) => {
  await start($, on)
  const ui = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND() })
  const raster = await ui.find({ key: 'clawd' })
  expect(raster?.type).toBe('Raster')
  expect(raster?.props.columns).toBe(58)
  expect(raster?.props.rows).toBe(10)
  expect((await ui.find({ key: 'clawd-state' }))?.text).toMatch(/IDLE/)
  await ui.unmount()
})

test('the band yields when there is no room even for mini, and on other surfaces', async ($, on) => {
  on('ui.status', () => ({ value: undefined }))
  await start($, on)
  for (const band of [BAND(15), BAND(80, 2)]) {
    const ui = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...band })
    expect(await ui.find({ key: 'clawd' })).toBeUndefined()
    await ui.unmount()
  }
  const desk = await $.ui.mount({ plugin: 'clawd', surface: 'desktop', ...BAND() })
  expect(await desk.find({ key: 'clawd' })).toBeUndefined()
  await desk.unmount()
})

test('an edit puts Clawd to work', async ($, on) => {
  await start($, on)
  await $.tool.call({ tool: 'Edit', file_path: '/tmp/a.txt', old_string: 'a', new_string: 'b' })
  const ui = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND() })
  expect((await ui.find({ key: 'clawd-state' }))?.text).toMatch(/BUILDING/)
  await ui.unmount()
})

test('turned off, Clawd still follows along and is right when turned back on', async ($, on) => {
  await start($, on)
  await clawd($, 'off')
  const hidden = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND() })
  expect(await hidden.find({ key: 'clawd' })).toBeUndefined()
  await hidden.unmount()
  await $.tool.call({ tool: 'Edit', file_path: '/tmp/a.txt', old_string: 'a', new_string: 'b' })
  await clawd($, 'on')
  const shown = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND() })
  expect((await shown.find({ key: 'clawd-state' }))?.text).toMatch(/BUILDING/)
  await shown.unmount()
})

test('/clawd switches theme, and rejects unknown arguments', async ($, on) => {
  await start($, on)
  expect((await clawd($, 'classic')).text).toMatch(/Classic/)
  expect((await clawd($, 'purple')).text).toMatch(/Usage/)
  expect((await clawd($, 'lantern')).text).toMatch(/Green Lantern/)
})

test("a subagent's turn ending does not wrap Clawd up mid-turn", async ($, on) => {
  await start($, on)
  await $.tool.call({ tool: 'Edit', file_path: '/tmp/a.txt', old_string: 'a', new_string: 'b' })
  await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1, isAborted: false, turnId: 't1', agentId: 'sub-1' })
  const ui = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND() })
  expect((await ui.find({ key: 'clawd-state' }))?.text).toMatch(/BUILDING/)
  await ui.unmount()
})

test('no frame timer runs until the band is drawn', async ($, on) => {
  let everies = 0
  on('clock.every', () => { everies++; return { value: undefined } })
  on('clock.after', () => ({ value: undefined }))
  await start($, on, { clock: false })
  expect(everies).toBe(0)
  const ui = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND() })
  // clock.every is dispatched once per period, so this counts ticks: any count means the timer is running.
  expect(everies).toBeGreaterThan(0)
  await ui.unmount()
})

test('frames are pushed to the band on the timer', async ($, on) => {
  let blits = 0
  on('ui.blit', () => { blits++; return { value: {} } })
  const clock = await start($, on)
  const ui = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND() })
  await clock?.advance(500)
  expect(blits).toBeGreaterThan(0)
  await ui.unmount()
})

async function bodyColors($: Engine) {
  const ui = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND() })
  const cells = String((await ui.find({ key: 'clawd' }))?.props.cells ?? '')
  await ui.unmount()
  return new Set(decodeCells(cells).flatMap(([, fg, bg]) => [fg, bg]))
}

test('Clawd is orange by default', async ($, on) => {
  await start($, on)
  // Clawd is still hopping in off-screen on the first frame, so read the theme from the floor every frame draws.
  const colors = await bodyColors($)
  expect(colors.has(0x3a2c25)).toBe(true)
  expect(colors.has(0x123a22)).toBe(false)
})

test('/clawd lantern while hammering transforms Clawd and keeps it hammering', async ($, on) => {
  await start($, on)
  await $.tool.call({ tool: 'Edit', file_path: '/tmp/a.txt', old_string: 'a', new_string: 'b' })
  expect((await clawd($, 'lantern')).text).toMatch(/Green Lantern/)
  const ui = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND() })
  expect((await ui.find({ key: 'clawd-state' }))?.text).toMatch(/BUILDING/)
  await ui.unmount()
})

// ---- clicks, hotkeys and sizes ----

async function rasterSize($: Engine, cols: number, rows: number) {
  const ui = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND(cols, rows) })
  const r = await ui.find({ key: 'clawd' })
  await ui.unmount()
  return r ? [r.props.columns, r.props.rows] : null
}

test('the band picks full, compact or mini by its room, else yields to the status line', async ($, on) => {
  on('ui.status', () => ({ value: undefined }))
  await start($, on)
  expect(await rasterSize($, 80, 12)).toEqual([58, 10])
  expect(await rasterSize($, 40, 6)).toEqual([29, 5])
  expect(await rasterSize($, 20, 3)).toEqual([9, 3])
  expect(await rasterSize($, 12, 2)).toBe(null)
})

test('a click on Clawd while hammering cracks the whip: double speed', async ($, on) => {
  await start($, on)
  await $.tool.call({ tool: 'Edit', file_path: '/tmp/a.txt', old_string: 'a', new_string: 'b' })
  const ui = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND() })
  await ui.post({ t: 'down', x: 20, y: 6 }, { in: 'clawd-hit' })
  expect((await ui.find({ key: 'clawd-state' }))?.text).toMatch(/BUILDING ×2/)
  await ui.unmount()
})

test('a click on the ring transforms orange Clawd into a Green Lantern', async ($, on) => {
  on('ui.blit', () => ({ value: {} }))
  const clock = await start($, on)
  const ui = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND() })
  await ui.post({ t: 'down', x: 54, y: 0 }, { in: 'clawd-hit' })
  await clock?.advance(40 * 125)          // let the hop-in and the 20-frame suit-up play out
  await ui.unmount()
  expect((await bodyColors($)).has(0x123a22)).toBe(true)
})

test('the hide hotkey button turns Clawd off', async ($, on) => {
  await start($, on)
  const ui = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND() })
  expect(await ui.find({ key: 'clawd-key-p' })).toBeDefined()
  await ui.press({ key: 'clawd-key-h' })
  expect(await ui.find({ key: 'clawd' })).toBeUndefined()
  await ui.unmount()
})

test('a frame refused from before a resize does not stop the new animation', async ($, on) => {
  let release: () => void = () => {}
  const held = new Promise<void>(r => { release = r })
  let blits = 0
  on('ui.blit', async () => {
    blits++
    if (blits === 1) { await held; return { deny: 'another size' } }
    return { value: {} }
  })
  const clock = await start($, on)
  const full = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND() })
  await clock?.advance(125)                       // first frame's blit is now in flight
  const compact = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND(40, 6) })
  release()                                       // ...and comes back refused, after the resize
  await clock?.advance(125 * 4)
  expect(blits).toBeGreaterThan(2)
  await compact.unmount()
  await full.unmount()
})

test('a click is not lost to a pointer move in the same frame', async ($, on) => {
  await start($, on)
  await $.tool.call({ tool: 'Edit', file_path: '/tmp/a.txt', old_string: 'a', new_string: 'b' })
  const ui = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND() })
  void ui.pointer({ type: 'down', x: 20, y: 6, button: 'left', in: 'clawd-hit' })
  await ui.pointer({ type: 'move', x: 21, y: 6, in: 'clawd-hit' })
  await ui.advance(125)
  expect((await ui.find({ key: 'clawd-state' }))?.text).toMatch(/BUILDING ×2/)
  await ui.unmount()
})

test('frames come at 12 a second', async ($, on) => {
  let blits = 0
  on('ui.blit', () => { blits++; return { value: {} } })
  const clock = await start($, on)
  const ui = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND() })
  await clock?.advance(1000)
  expect(blits).toBeGreaterThanOrEqual(11)
  await ui.unmount()
})

test('a calm Clawd sends few frames: identical frames are skipped and the pace halves', async ($, on) => {
  let blits = 0
  on('ui.blit', () => { blits++; return { value: {} } })
  const clock = await start($, on)
  const ui = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND() })
  await clock?.advance(3000)                 // the hop-in finishes; Clawd is idle
  blits = 0
  await clock?.advance(2000)
  expect(blits).toBeLessThanOrEqual(4)
  await ui.unmount()
})

test('while working, frames still come at full pace', async ($, on) => {
  let blits = 0
  on('ui.blit', () => { blits++; return { value: {} } })
  const clock = await start($, on)
  await $.tool.call({ tool: 'Edit', file_path: '/tmp/a.txt', old_string: 'a', new_string: 'b' })
  const ui = await $.ui.mount({ plugin: 'clawd', surface: 'terminal', ...BAND() })
  await clock?.advance(3000)
  blits = 0
  await clock?.advance(1000)
  expect(blits).toBeGreaterThanOrEqual(11)
  await ui.unmount()
})
