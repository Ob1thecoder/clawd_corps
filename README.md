# clawd_corps

An animated **Clawd** (the Claude Code mascot) that lives in the band above your prompt and acts out what Claude is doing. Each session wears its own **Lantern Corps** color, so you can tell your Claude Code sessions apart at a glance.

A [Claude Code](https://claude.com/claude-code) mod, built with the function-hooks plugin API.

## What it does

- **Acts out the session.**
  - Clawd hops in and waves.
  - It thinks with a thought bubble when you send a prompt.
  - In plan mode, it pulls out a clipboard and draws a flowchart.
  - When Claude edits, it puts on a hard hat and hammers nails.
  - It holds up a "?" sign when a permission prompt is waiting on you.
  - At the end of a turn, it wipes its brow and gives a thumbs-up.
  - It dozes when you've been idle for a while.
- **One color per session.**
  - Every new session claims a Lantern Corps color no other open session is wearing: Green, Blue, Red, Yellow, Violet, White, then Black.
  - Clawd hops in orange, then suits up into its corps.
  - In a corps, Clawd's ring projects a glowing construct hammer instead of a steel one.
  - Each corps has its own palette, chest symbol, spinner words, name tag (`◆ BLUE LANTERN`), and a colored line just above the prompt.
- **Corps picker.**
  - Click the `corps` button beside Clawd, or type `/clawd corps`, to choose a color for this session.
  - Colors other sessions are wearing are marked "(in use)".
- **Hotkeys.** Press ctrl+x tab to focus the band, then:
  - `p`: poke Clawd. While it's building, this whips it, and it works at double speed.
  - `r`: switch between your corps and orange.
  - `w`: an extra hammer blow while building, or a peek at the plan while planning.
  - `c`: open the corps picker.
  - `h`: hide Clawd.

  In fullscreen you can click the buttons.
- **Fits the space it has.** Full size is 58 × 10, compact is 29 × 5, and mini is 9 × 3. When even that doesn't fit, Clawd shows in the status line instead.

## Commands

| Command | Effect |
|---|---|
| `/clawd` | toggle Clawd on/off |
| `/clawd on` · `/clawd off` | show / hide |
| `/clawd corps` | open the corps picker |
| `/clawd green` · `blue` · `red` · `yellow` · `violet` · `white` · `black` | wear that corps in this session |
| `/clawd classic` | orange Clawd with the hard hat |

## Install

Requires Claude Code 2.1.289 or later. The function-hooks plugin API is early access and may change.

```bash
git clone https://github.com/Ob1thecoder/clawd_corps.git
claude --plugin-dir ./clawd_corps
```

To load it in every session, add the folder to `CLAUDE_CODE_PLUGIN_DIRS`, either in your environment or in the `env` block of `~/.claude/settings.json`.

## Develop

```bash
claude plugin test .       # the test suite
claude plugin validate .   # what the engine will load and refuse
tsc -p .                   # type-check (after Claude Code has loaded the mod once)
```

Code layout:
- `hooks/` holds the mod.
  - `register.tsx` is the only file that touches the engine.
  - Everything else is pure: pixel drawing, props, animations, the state machine, raster encoding, sizes, themes and color claims.
- `tests/` has a `*.test.ts` file for each module.

## Credits and disclaimer

This is an unofficial fan project. It is **not affiliated with, endorsed by, or sponsored by DC Comics or Anthropic**.

- Green Lantern, the Lantern Corps names and their symbols are trademarks of DC Comics.
- Claude, Claude Code and Clawd are trademarks of Anthropic.

The pixel chest symbols for the Blue, Yellow (Sinestro), Violet (Star Sapphire) and Black corps were traced at 9 × 7 pixels from logo files on Wikimedia Commons that are marked public domain as simple geometric shapes:
- [Blue lantern.png](https://commons.wikimedia.org/wiki/File:Blue_lantern.png)
- [Sinestro corps.png](https://commons.wikimedia.org/wiki/File:Sinestro_corps.png)
- [Star sapphire logo.png](https://commons.wikimedia.org/wiki/File:Star_sapphire_logo.png)
- [Black lantern.png](https://commons.wikimedia.org/wiki/File:Black_lantern.png)

The Green, Red and White symbols are original approximations.

## License

[MIT](LICENSE)
