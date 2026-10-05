import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { ClawdThemeName } from '../types'
import { A } from './anims'
import { type Claims, REFRESH_MS, claimAs, claimFor, label as corpsLabel, prune } from './claims'
import { type StoryEvent, createMachine, current, fire, peek, render, tick, whack } from './machine'
import { COLUMNS, ROWS, encodeCells } from './raster'
import type { Grid } from './pixels'
import { type Tier, miniCells, miniProp, pickTier, shrink } from './sizes'
import { CORPS, type Paint, THEMES, type ThemeName, type WordState, corpsOf } from './themes'

const FRAME_MS = 83                // about 12 frames a second
const IDLE_MS = 120_000
// One action per hotkey button: p poke/whip/wake, r ring, w whack/peek, h hide.
type Action = 'p' | 'r' | 'w' | 'h' | 'c'

const PICKER = 'clawd-corps'
const CHOICES: readonly ThemeName[] = [...CORPS, 'classic']

const SIDE_COLUMNS = 14           // room beside Clawd for the state label and the hotkey buttons
const SIZE: Record<Exclude<Tier, 'status'>, { columns: number; rows: number }> = {
  full: { columns: COLUMNS, rows: ROWS }, compact: { columns: COLUMNS / 2, rows: ROWS / 2 }, mini: { columns: 9, rows: 3 },
}
const BUILD_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit', 'Bash'])
const CALM = new Set(['idle', 'doze', 'waiting', 'showplan'])

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
let frameGen = 0                 // bumped whenever the frame timer starts or stops; stale frames check it
let lastCells = ''               // the cells last sent; an identical frame isn't sent again
let calmSkip = false
let lastCorps: ThemeName = 'lantern'   // the corps the ring hotkey goes back to
let sessionId = ''               // this session's id, the key of its colour claim
let corpsN = 1                   // 2, 3... when every colour is taken and this one is shared
let fromTheme: ThemeName = 'lantern'   // the corps being left while powering down
let refreshTimer: Timer | null = null
let promptColor = ''             // the /color last set, so the same colour isn't set twice             // calm loops advance on every other timer tick
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

// Hopping in, a lantern is still orange; powering down, it recolours from the corps it is leaving.
function paintNow(): Paint {
  const a = current(m)
  if (a === A.enter && THEMES[theme].style === 'lantern') return THEMES.classic
  if (a === A.powerDown) return { ...THEMES.classic, from: THEMES[fromTheme] }
  return THEMES[theme]
}

function asClaims(v: unknown): Claims {
  return v && typeof v === 'object' ? (v as Claims) : {}
}

// Records (or refreshes) this session's colour in the shared claims, dropping claims from sessions that are gone.
async function writeClaim($: EngineInterface, name: ThemeName | null): Promise<void> {
  if (!sessionId) return
  const now = await $.clock.now()
  const claims = prune(asClaims(await $.store.get('claims')), now)
  const mine = name === null ? claimFor(claims, sessionId, now) : claimAs(claims, sessionId, name, now)
  claims[sessionId] = mine
  await $.store.set('claims', claims)
  corpsN = mine.n
  if (mine.theme !== theme) { theme = mine.theme; await update($, themeAtom, () => mine.theme) }
}

// Tints Claude Code's prompt bar to this session's colour through /color, queued until the session is idle.
// Only when the colour changes, so a /color the person ran themselves stands until the corps changes.
function applyPromptColor($: EngineInterface): void {
  const want = THEMES[theme].prompt
  if (!sessionId || want === promptColor) return
  promptColor = want
  $.clock.after(0, () => { void $.command.run({ command: 'color', args: want }).catch(() => { promptColor = '' }) })
}

function keepClaim($: EngineInterface): void {
  refreshTimer?.cancel()
  refreshTimer = $.clock.after(REFRESH_MS, () => { void writeClaim($, theme).then(() => keepClaim($)) })
}

function frameCells(t: Tier): string {
  const paint = paintNow()
  if (t === 'mini') return miniCells(m.state, paint, frameCount)
  const g = render(m, paint)
  return encodeCells(t === 'compact' ? shrink(g) : g)
}

function label(): string {
  const word = m.state === 'offstage' ? 'IDLE' : m.state.toUpperCase()
  const prop = tier === 'mini' ? `${miniProp(m.state, 0)} ` : ''
  return `${prop}${word}${m.boost > 0 && m.state === 'building' ? ' ×2' : ''}`
}

async function openPicker($: EngineInterface): Promise<void> {
  await $.ui.open({ id: PICKER, title: 'Choose your corps', focus: true, closeOnEscape: true })
}

async function pick($: EngineInterface, name: ThemeName): Promise<void> {
  await setTheme($, name)
  await $.ui.close({ id: PICKER })
}

// A choice's symbol as 9 x 4 cells: the corps badge in its colours; classic is a plain orange disc.
function symbolCells(name: ThemeName): string {
  const t = THEMES[name]
  const bg = name === 'classic' ? t.body : t.ring.badgeBg
  const fg = name === 'classic' ? t.body : t.ring.badgeFg
  const g: Grid = [...t.badge, '.........'].map(row => [...row].map(ch => (ch === 'W' ? bg : ch === 'D' ? fg : null)))
  return encodeCells(g)
}

// Switches this session's corps (or back to classic): its claim follows, and Clawd transforms.
async function setTheme($: EngineInterface, name: ThemeName): Promise<void> {
  const before = theme
  if (THEMES[before].style === 'lantern') lastCorps = before
  theme = name
  await update($, themeAtom, () => name)
  await writeClaim($, name)
  applyPromptColor($)
  if (name === before || !(await read($, enabledAtom))) return
  if (THEMES[name].style === 'lantern') send($, 'suitup')
  else { fromTheme = before; send($, 'powerdown') }
}

// One action, from a click or its hotkey button.
async function act($: EngineInterface, a: Action): Promise<void> {
  if (a === 'p') send($, m.state === 'doze' ? 'typing' : m.state === 'building' ? 'whip' : 'poke')
  if (a === 'r') await setTheme($, THEMES[theme].style === 'lantern' ? 'classic' : lastCorps)
  if (a === 'w' && (whack(m) || peek(m))) $.ui.invalidate('ui.render')
  if (a === 'c') await openPicker($)
  if (a === 'h') {
    await update($, enabledAtom, () => false)
    await $.store.set('enabled', false)
  }
}

function poke($: EngineInterface): void {
  idleTimer?.cancel()
  idleTimer = $.clock.after(IDLE_MS, () => send($, 'idle2m'))
}

async function onFrame($: EngineInterface, gen: number): Promise<void> {
  if (gen !== frameGen || !bandId || !enabled) return
  // Calm loops (idle, dozing, waiting on you, showing the plan) run at half pace; transitions and work stay at full.
  const calm = current(m).loop && CALM.has(m.state) && m.boost === 0
  calmSkip = calm && !calmSkip
  if (calmSkip) return
  tick(m)
  frameCount++
  const cells = frameCells(tier)
  if (cells === lastCells) return
  lastCells = cells
  const r = await $.ui.blit({ requestId: bandId, key: 'clawd', cells })
  // A refusal for a frame sent before a resize or remount is about a Raster that is gone: ignore it.
  if (r.deny && gen === frameGen) stopFrames()
}

function stopFrames(): void {
  frameGen++
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
    const savedEnabled = await $.store.get('enabled')
    if (typeof savedEnabled === 'boolean') await update($, enabledAtom, () => savedEnabled)
    // Each interactive session wears its own colour: the first corps no other open session holds.
    // A `claude -p` or SDK run draws no Clawd, so it claims nothing.
    if (e.isInteractive && e.surface === 'terminal') {
      sessionId = await $.session.id()
      await writeClaim($, null)
      keepClaim($)
      applyPromptColor($)
    }
    if (e.isInteractive && e.surface === 'terminal') {
      send($, THEMES[theme].style === 'lantern' ? 'startSuited' : 'start')
      poke($)
    }
    return r
  })

  on('session.end', async ($, e, next) => {
    refreshTimer?.cancel()
    if (sessionId) {
      const claims = asClaims(await $.store.get('claims'))
      delete claims[sessionId]
      await $.store.set('claims', claims)
    }
    const r = await next(e)
    // After a /clear or a resume the process goes on under a new session id, with no session.start:
    // keep wearing the same colour under that id.
    if (sessionId && (e.reason === 'clear' || e.reason === 'resume')) {
      sessionId = await $.session.id()
      await writeClaim($, theme)
      keepClaim($)
      promptColor = ''                 // a new session id may start with a plain prompt bar: set it again
      applyPromptColor($)
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
      const gen = ++frameGen
      frameTimer = $.clock.every(FRAME_MS, () => { onFrame($, gen).catch(() => { if (gen === frameGen) stopFrames() }) })
    }
    const { Box, Button, Raster, Text } = $.ui.resolve(e)
    const size = SIZE[t]
    const room = e.props.bodyColumns - size.columns
    const keys = room >= SIDE_COLUMNS && t === 'full'          // state, tag and five buttons fit beside full-size Clawd only
    const corps = THEMES[theme].style === 'lantern' ? THEMES[theme] : null
    const line = corps !== null && e.props.maxRows > size.rows   // a spare row: draw the colour line over the prompt
    const keyLabels: Record<Action, string> = { p: m.state === 'building' ? 'whip' : m.state === 'doze' ? 'wake' : 'poke', r: 'ring', w: m.state === 'planning' ? 'peek' : 'whack', h: 'hide', c: 'corps' }
    return (
      <Box flexDirection="column">
      <Box flexDirection="row">
        <Box key="clawd-stage" width={size.columns} height={size.rows}>
          <Raster key="clawd" columns={size.columns} rows={size.rows} cells={(lastCells = frameCells(t))} />
        </Box>
        {room >= (t === 'mini' ? 7 : SIDE_COLUMNS) && (
          <Box key="clawd-side" flexDirection="column">
            <Box key="clawd-state">
              <Text dimColor>
                {'  '}
                {label()}
              </Text>
            </Box>
            {corps && (
              <Box key="clawd-tag">
                <Text color={corps.ring.text} bold>
                  {'  ◆ '}
                  {corpsLabel(theme, corpsN)}
                </Text>
              </Box>
            )}
            {keys && (['p', 'r', 'w', 'c', 'h'] as const).map(a => (
              <Button key={`clawd-key-${a}`} label={keyLabels[a]} hotkey={a} plain onPress={() => { void act($, a) }} />
            ))}
          </Box>
        )}
      </Box>
      {line && corps && (
        <Box key="clawd-line">
          <Text color={corps.ring.line}>{'─'.repeat(e.props.bodyColumns)}</Text>
        </Box>
      )}
      </Box>
    )
  })

  // The corps picker: each choice is its symbol plus a button you can click, or press its number.
  on('ui.render', { component: 'Pane', requestId: PICKER }, async ($, e, next) => {
    if (e.surface !== 'terminal') return next(e)          // Clawd is terminal-only
    const { Box, Button, Raster, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const claims = prune(asClaims(await $.store.get('claims')), now)
    const worn = new Set(Object.entries(claims).filter(([id]) => id !== sessionId).map(([, c]) => c.theme))
    return (
      <Box flexDirection="column">
        {CHOICES.map((name, i) => (
          <Box key={`row-${name}`} flexDirection="row">
            <Raster key={`sym-${name}`} columns={9} rows={4} cells={symbolCells(name)} />
            <Text> </Text>
            <Button
              key={`pick-${name}`}
              label={`${THEMES[name].title}${name === theme ? ' ✓' : ''}${worn.has(name) ? ' (in use)' : ''}`}
              hotkey={String(i + 1)}
              plain
              onPress={() => { void pick($, name) }}
            />
          </Box>
        ))}
        <Text dimColor>Click a lantern or press its number. Esc closes.</Text>
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
    if (arg === 'corps') {
      await openPicker($)
      return { text: 'Choose your corps in the pane.' }
    }
    const name = corpsOf(arg)
    if (name) {
      await setTheme($, name)
      return { text: `Clawd theme: ${THEMES[name].title}.` }
    }
    if (arg !== '' && arg !== 'on' && arg !== 'off') return { text: 'Usage: /clawd [on|off|corps|green|blue|red|yellow|violet|white|black|classic]' }
    const turnOn = arg === '' ? !(await read($, enabledAtom)) : arg === 'on'
    await update($, enabledAtom, () => turnOn)
    await $.store.set('enabled', turnOn)
    if (turnOn && m.state === 'offstage') send($, 'start')
    return { text: turnOn ? 'Clawd is on.' : 'Clawd is off.' }
  })
}
