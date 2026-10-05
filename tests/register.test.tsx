import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

const BAND = (bodyColumns = 80, maxRows = 12) =>
  ({
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows, bodyColumns, scroll: { offset: 0, bodyRows: maxRows }, view: {} },
  }) as const

async function start($: Engine, on: On) {
  on('session.start', () => ({ cwd: '/' }))
  on('command.register', () => ({ value: { command: 'clawd' } }))
  mock.store(on)
  mock.clock(on)
  on('ui.render', ($e, e) => {
    const { Box } = $e.ui.resolve(e)
    return <Box key="engine" />
  })
  on('tool.call', () => ({ result: 'ok' }))
  on('command.run', () => ({ text: '' }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
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

test('the band yields when too narrow or too short, and on other surfaces', async ($, on) => {
  await start($, on)
  for (const band of [BAND(57), BAND(80, 9)]) {
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
