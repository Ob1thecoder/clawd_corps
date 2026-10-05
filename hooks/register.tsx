import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { ClawdThemeName } from '../types'
import { type StoryEvent, createMachine, fire, render, tick } from './machine'
import { COLUMNS, ROWS, encodeCells } from './raster'
import { THEMES, type WordState, isThemeName } from './themes'

const FRAME_MS = 125
const IDLE_MS = 120_000
const LABEL_MIN_COLUMNS = COLUMNS + 14
const BUILD_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit', 'Bash'])

const enabledAtom = atom({ plugin: 'clawd', key: 'enabled' } as const, true)
const themeAtom = atom({ plugin: 'clawd', key: 'theme' } as const, 'classic' as ClawdThemeName)

const m = createMachine()
let bandId: string | null = null
let theme: ClawdThemeName = 'classic'
let enabled = true
let turn = 0
let askedId: string | null = null
let frameTimer: Timer | null = null
let framesOn = false
let idleTimer: Timer | null = null

function send($: EngineInterface, ev: StoryEvent): void {
  if (fire(m, ev)) $.ui.invalidate('ui.render')
}

function poke($: EngineInterface): void {
  idleTimer?.cancel()
  idleTimer = $.clock.after(IDLE_MS, () => send($, 'idle2m'))
}

async function onFrame($: EngineInterface): Promise<void> {
  if (!bandId || !enabled) return
  tick(m)
  const r = await $.ui.blit({ requestId: bandId, key: 'clawd', cells: encodeCells(render(m, THEMES[theme])) })
  if (r.deny) stopFrames()
}

function stopFrames(): void {
  bandId = null
  framesOn = false
  frameTimer?.cancel()
  frameTimer = null
}

function wordState(): WordState {
  return m.state === 'offstage' ? 'idle' : m.state
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await $.command.register({ name: 'clawd', description: 'Clawd above the prompt: /clawd [on|off|lantern|classic]' })
    const savedTheme = await $.store.get('theme')
    const savedEnabled = await $.store.get('enabled')
    if (typeof savedTheme === 'string' && isThemeName(savedTheme)) await update($, themeAtom, () => savedTheme)
    if (typeof savedEnabled === 'boolean') await update($, enabledAtom, () => savedEnabled)
    if (e.isInteractive && e.surface === 'terminal') {
      send($, 'start')
      poke($)
    }
    return r
  })

  on('prompt.submit', async ($, e, next) => {
    turn++
    send($, 'prompt')
    poke($)
    return next(e)
  })

  on('prompt.edit', async ($, e, next) => {
    send($, 'typing')
    poke($)
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    poke($)
    if (e.tool === 'EnterPlanMode') send($, 'planmode')
    if (BUILD_TOOLS.has(e.tool)) send($, 'edit')
    const r = await next(e)
    const failed = r.deny !== undefined || r.isError === true
    if (askedId !== null && e.tool_use_id === askedId) {
      askedId = null
      send($, 'permok')
    }
    if (e.tool === 'ExitPlanMode') send($, failed ? 'reject' : 'approve')
    else if (failed) send($, 'error')
    return r
  })

  on('tool.check', async ($, e, next) => {
    const r = await next(e)
    if (r.decision === 'ask' && e.tool_use_id) {
      if (e.tool === 'ExitPlanMode') send($, 'planshown')
      else {
        askedId = e.tool_use_id
        send($, 'permask')
      }
    }
    return r
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    askedId = null
    send($, e.reason === 'aborted' ? 'esc' : 'turnend')
    poke($)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    enabled = await read($, enabledAtom)
    theme = await read($, themeAtom)
    if (!enabled || e.surface !== 'terminal' || e.props.hasSurvey || e.props.bodyColumns < COLUMNS || e.props.maxRows < ROWS) {
      stopFrames()
      return next(e)
    }
    bandId = e.requestId
    if (!framesOn) {
      framesOn = true
      frameTimer = $.clock.every(FRAME_MS, () => { onFrame($).catch(stopFrames) })
    }
    const { Box, Raster, Text } = $.ui.resolve(e)
    const cells = encodeCells(render(m, THEMES[theme]))
    return (
      <Box flexDirection="row">
        <Raster key="clawd" columns={COLUMNS} rows={ROWS} cells={cells} />
        {e.props.bodyColumns >= LABEL_MIN_COLUMNS && (
          <Box key="clawd-state">
            <Text dimColor>
              {'  '}
              {m.state.toUpperCase()}
            </Text>
          </Box>
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (!(await read($, enabledAtom))) return next(e)
    const words = THEMES[await read($, themeAtom)].words[wordState()]
    const word = words[turn % words.length] ?? e.props.word
    return next({ ...e, props: { ...e.props, word } })
  })

  on('command.run', { command: 'clawd' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (isThemeName(arg)) {
      const before = await read($, themeAtom)
      await update($, themeAtom, () => arg)
      await $.store.set('theme', arg)
      if (arg !== before && (await read($, enabledAtom))) send($, arg === 'lantern' ? 'suitup' : 'powerdown')
      return { text: `Clawd theme: ${THEMES[arg].title}.` }
    }
    if (arg !== '' && arg !== 'on' && arg !== 'off') return { text: 'Usage: /clawd [on|off|lantern|classic]' }
    const turnOn = arg === '' ? !(await read($, enabledAtom)) : arg === 'on'
    await update($, enabledAtom, () => turnOn)
    await $.store.set('enabled', turnOn)
    if (turnOn && m.state === 'offstage') send($, 'start')
    return { text: turnOn ? 'Clawd is on.' : 'Clawd is off.' }
  })
}
