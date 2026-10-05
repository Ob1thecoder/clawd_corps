import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { ClawdThemeName } from '../types'
import { type Action, actionFor, cellToPixel, lookFrom, regionAt } from './hits'
import { type StoryEvent, createMachine, fire, peek, render, tick, whack } from './machine'
import { COLUMNS, ROWS, encodeCells } from './raster'
import { type Tier, miniCells, miniProp, pickTier, shrink } from './sizes'
import { THEMES, type ThemeName, type WordState, isThemeName } from './themes'

const FRAME_MS = 125
const IDLE_MS = 120_000
const SIDE_COLUMNS = 14           // room beside Clawd for the state label and the hotkey buttons
const SIZE: Record<Exclude<Tier, 'status'>, { columns: number; rows: number }> = {
  full: { columns: COLUMNS, rows: ROWS }, compact: { columns: COLUMNS / 2, rows: ROWS / 2 }, mini: { columns: 9, rows: 3 },
}
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
let tier: Tier = 'full'
let frameCount = 0
let statusShown = false
let idleTimer: Timer | null = null

function send($: EngineInterface, ev: StoryEvent): void {
  if (!fire(m, ev)) return
  $.ui.invalidate('ui.render')
  if (tier === 'status') showStatus($)
}

// The smallest size: no band at all, just Clawd and its state in the status line.
function showStatus($: EngineInterface): void {
  $.ui.status(`▐▛███▜▌ ${m.state === 'offstage' ? 'idle' : m.state}`)
  statusShown = true
}

function clearStatus($: EngineInterface): void {
  if (!statusShown) return
  $.ui.status(undefined)
  statusShown = false
}

function frameCells(t: Tier): string {
  const paint = THEMES[theme]
  if (t === 'mini') return miniCells(m.state, paint, frameCount)
  const g = render(m, paint)
  return encodeCells(t === 'compact' ? shrink(g) : g)
}

function label(): string {
  const word = m.state === 'offstage' ? 'IDLE' : m.state.toUpperCase()
  const prop = tier === 'mini' ? `${miniProp(m.state, 0)} ` : ''
  return `${prop}${word}${m.boost > 0 && m.state === 'building' ? ' ×2' : ''}`
}

async function setTheme($: EngineInterface, name: ThemeName): Promise<void> {
  const before = await read($, themeAtom)
  await update($, themeAtom, () => name)
  await $.store.set('theme', name)
  if (name !== before && (await read($, enabledAtom))) send($, name === 'lantern' ? 'suitup' : 'powerdown')
}

// One action, from a click or its hotkey button.
async function act($: EngineInterface, a: Action): Promise<void> {
  if (a === 'p') send($, m.state === 'doze' ? 'typing' : m.state === 'building' ? 'whip' : 'poke')
  if (a === 'r') await setTheme($, theme === 'lantern' ? 'classic' : 'lantern')
  if (a === 'w' && (whack(m) || peek(m))) $.ui.invalidate('ui.render')
  if (a === 'h') {
    await update($, enabledAtom, () => false)
    await $.store.set('enabled', false)
  }
}

function poke($: EngineInterface): void {
  idleTimer?.cancel()
  idleTimer = $.clock.after(IDLE_MS, () => send($, 'idle2m'))
}

async function onFrame($: EngineInterface): Promise<void> {
  if (!bandId || !enabled) return
  tick(m)
  frameCount++
  const r = await $.ui.blit({ requestId: bandId, key: 'clawd', cells: frameCells(tier) })
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
    if (!enabled || e.surface !== 'terminal' || e.props.hasSurvey) {
      stopFrames()
      clearStatus($)
      return next(e)
    }
    const t = pickTier(e.props.bodyColumns, e.props.maxRows)
    if (t !== tier) framesOn = false
    tier = t
    if (t === 'status') {
      stopFrames()
      showStatus($)
      return next(e)
    }
    clearStatus($)
    bandId = e.requestId
    if (!framesOn) {
      frameTimer?.cancel()
      framesOn = true
      frameTimer = $.clock.every(FRAME_MS, () => { onFrame($).catch(stopFrames) })
    }
    const { Box, Button, Client, Raster, Text } = $.ui.resolve(e)
    const size = SIZE[t]
    const room = e.props.bodyColumns - size.columns
    const keys = room >= SIDE_COLUMNS && t !== 'mini'
    const keyLabels: Record<Action, string> = { p: m.state === 'building' ? 'whip' : m.state === 'doze' ? 'wake' : 'poke', r: 'ring', w: m.state === 'planning' ? 'peek' : 'whack', h: 'hide' }
    return (
      <Box flexDirection="row">
        <Box key="clawd-stage" width={size.columns} height={size.rows}>
          <Raster key="clawd" columns={size.columns} rows={size.rows} cells={frameCells(t)} />
          <Box key="clawd-hit-layer" position="absolute" top={0} left={0}>
            <Client key="clawd-hit" module="./hit.tsx" props={size} width={size.columns} height={size.rows} />
          </Box>
        </Box>
        {room >= (t === 'mini' ? 7 : SIDE_COLUMNS) && (
          <Box key="clawd-side" flexDirection="column">
            <Box key="clawd-state">
              <Text dimColor>
                {'  '}
                {label()}
              </Text>
            </Box>
            {keys && (['p', 'r', 'w', 'h'] as const).map(a => (
              <Button key={`clawd-key-${a}`} label={keyLabels[a]} hotkey={a} plain onPress={() => { void act($, a) }} />
            ))}
          </Box>
        )}
      </Box>
    )
  })

  // Clicks and pointer moves from the overlay over Clawd (fullscreen layout only).
  on('ui.message', async ($, e, next) => {
    if (e.element !== 'clawd-hit') return next(e)
    const d = (e.data ?? {}) as { t?: string; x?: number; y?: number }
    if (d.t === 'leave') { m.look = null; return {} }
    if (typeof d.x !== 'number' || typeof d.y !== 'number') return {}
    const [px, py] = cellToPixel(tier, d.x, d.y)
    if (d.t === 'move') { m.look = lookFrom(px, py); return {} }
    const region = d.t === 'down' ? regionAt(m.state, THEMES[theme].style, px, py) : null
    if (region) await act($, actionFor(region))
    return {}
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
      await setTheme($, arg)
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
