export type ClawdThemeName = 'lantern' | 'blue' | 'red' | 'yellow' | 'violet' | 'white' | 'black' | 'classic'

declare module 'claude-code' {
  interface PluginState {
    clawd: { enabled: boolean; theme: ClawdThemeName }
  }
}
