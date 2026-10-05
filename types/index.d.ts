export type ClawdThemeName = 'lantern' | 'classic'

declare module 'claude-code' {
  interface PluginState {
    clawd: { enabled: boolean; theme: ClawdThemeName }
  }
}
