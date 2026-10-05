#!/usr/bin/env bash
# Installs clawd_corps for every Claude Code session:
#   curl -fsSL https://raw.githubusercontent.com/Ob1thecoder/clawd_corps/main/install.sh | bash
# Uninstall (leaves the files; prints where they are):
#   curl -fsSL https://raw.githubusercontent.com/Ob1thecoder/clawd_corps/main/install.sh | bash -s -- --uninstall
#
# It clones (or updates) the mod into CLAWD_DIR and adds that folder to CLAUDE_CODE_PLUGIN_DIRS in
# ~/.claude/settings.json, keeping every other setting and any other plugin folders already listed.
# Running it again updates the mod and changes nothing else.
set -euo pipefail

REPO="${CLAWD_REPO:-https://github.com/Ob1thecoder/clawd_corps.git}"
DIR="${CLAWD_DIR:-$HOME/.claude/mods/clawd_corps}"
SETTINGS="${CLAUDE_SETTINGS:-$HOME/.claude/settings.json}"
MODE=install
[ "${1:-}" = "--uninstall" ] && MODE=uninstall

say() { printf 'clawd_corps: %s\n' "$*"; }
die() { printf 'clawd_corps: %s\n' "$*" >&2; exit 1; }

# The settings edit needs a JSON-aware tool: python3, else node.
edit_settings() {
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$SETTINGS" "$DIR" "$MODE" <<'PY'
import json, os, sys
path, folder, mode = sys.argv[1:]
data = {}
if os.path.exists(path):
    text = open(path).read()
    if text.strip():
        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            sys.exit(f"clawd_corps: {path} is not valid JSON ({e}); fix it first, nothing was changed")
    open(path + ".bak-clawd", "w").write(text)
env = data.setdefault("env", {})
norm = lambda p: os.path.realpath(os.path.expanduser(p))
dirs = [p for p in env.get("CLAUDE_CODE_PLUGIN_DIRS", "").split(os.pathsep) if p and norm(p) != norm(folder)]
if mode == "install":
    dirs.append(folder)
if dirs:
    env["CLAUDE_CODE_PLUGIN_DIRS"] = os.pathsep.join(dirs)
else:
    env.pop("CLAUDE_CODE_PLUGIN_DIRS", None)
if not env:
    data.pop("env", None)
os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
tmp = path + ".tmp-clawd"
with open(tmp, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
os.replace(tmp, path)
PY
  elif command -v node >/dev/null 2>&1; then
    node - "$SETTINGS" "$DIR" "$MODE" <<'JS'
const fs = require('fs'), path = require('path'), os = require('os')
const [file, folder, mode] = process.argv.slice(2)
let data = {}
if (fs.existsSync(file)) {
  const text = fs.readFileSync(file, 'utf8')
  if (text.trim()) {
    try { data = JSON.parse(text) } catch (e) { console.error(`clawd_corps: ${file} is not valid JSON (${e.message}); fix it first, nothing was changed`); process.exit(1) }
  }
  fs.writeFileSync(file + '.bak-clawd', text)
}
const norm = p => { try { return fs.realpathSync(p.replace(/^~/, os.homedir())) } catch { return path.resolve(p.replace(/^~/, os.homedir())) } }
data.env = data.env || {}
const dirs = (data.env.CLAUDE_CODE_PLUGIN_DIRS || '').split(path.delimiter).filter(p => p && norm(p) !== norm(folder))
if (mode === 'install') dirs.push(folder)
if (dirs.length) data.env.CLAUDE_CODE_PLUGIN_DIRS = dirs.join(path.delimiter)
else delete data.env.CLAUDE_CODE_PLUGIN_DIRS
if (!Object.keys(data.env).length) delete data.env
fs.mkdirSync(path.dirname(file), { recursive: true })
fs.writeFileSync(file + '.tmp-clawd', JSON.stringify(data, null, 2) + '\n')
fs.renameSync(file + '.tmp-clawd', file)
JS
  else
    die "needs python3 or node to edit $SETTINGS. Add \"CLAUDE_CODE_PLUGIN_DIRS\": \"$DIR\" to its \"env\" block by hand."
  fi
}

if [ "$MODE" = uninstall ]; then
  edit_settings
  say "removed from Claude Code. Start a new session to see it gone."
  say "the files are still in $DIR; delete that folder to remove them too."
  exit 0
fi

command -v git >/dev/null 2>&1 || die "needs git"
if [ -d "$DIR/.git" ]; then
  say "updating $DIR"
  git -C "$DIR" pull --ff-only --quiet
else
  [ -e "$DIR" ] && die "$DIR exists and is not a clawd_corps checkout; set CLAWD_DIR to install elsewhere"
  say "installing into $DIR"
  mkdir -p "$(dirname "$DIR")"
  git clone --depth 1 --quiet "$REPO" "$DIR"
fi
edit_settings
say "done. Start a new Claude Code session: Clawd hops in and suits up into its Lantern Corps colour."
say "try /clawd corps to pick a colour, /clawd off to hide it."
