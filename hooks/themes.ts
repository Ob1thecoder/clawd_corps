export type ThemeName = 'lantern' | 'classic'
export type WordState = 'idle' | 'doze' | 'thinking' | 'planning' | 'showplan' | 'building' | 'waiting'
export type Style = 'classic' | 'lantern'
export type Paint = { body: string; floor: string; style: Style }
export type Theme = Paint & { title: string; words: Record<WordState, readonly string[]> }

export const THEMES: Record<ThemeName, Theme> = {
  lantern: {
    title: 'Green Lantern',
    body: '#2fcf62',
    floor: '#123a22',
    style: 'lantern',
    words: {
      idle: ['In brightest day'],
      doze: ['Recharging the ring'],
      thinking: ['Consulting the Guardians', 'Focusing willpower', 'Scanning Sector 2814'],
      planning: ['Drafting the blueprint', 'Surveying Sector 2814', 'Sketching the construct'],
      showplan: ['Awaiting the Guardians'],
      building: ['Charging the ring', 'Forging a construct', 'Willpower at maximum', 'Hammering in green'],
      waiting: ['Awaiting your word'],
    },
  },
  classic: {
    title: 'Classic',
    body: '#d97757',
    floor: '#3a2c25',
    style: 'classic',
    words: {
      idle: ['Ready'],
      doze: ['Napping'],
      thinking: ['Thinking', 'Pondering', 'Mulling'],
      planning: ['Sketching', 'Drafting', 'Mapping it out'],
      showplan: ['Waiting on your verdict'],
      building: ['Building', 'Hammering', 'Nailing it down', 'Assembling'],
      waiting: ['Waiting on you'],
    },
  },
}

export function isThemeName(s: string): s is ThemeName {
  return s === 'lantern' || s === 'classic'
}

export const C = {
  hat: '#ffcc1a', hatHi: '#fff0a0', hatShade: '#c98f00', brim: '#e0a800',
  steel: '#9aa5b5', steelHi: '#e9eef5', steelDk: '#566173', face: '#ffffff',
  handle: '#b07434', handleHi: '#d39a58', grip: '#3a2a20',
  nail: '#c9d1d9', nailHi: '#ffffff', wood: '#9a6432', woodHi: '#c08a52', grain: '#6e4420',
  spark: '#ffe066', sparkHi: '#ffffff', trail: '#56645b',
  board: '#8a5a2e', boardHi: '#a8743f', paper: '#f4f1ea', rule: '#cfdcec',
  clip: '#9aa5b5', clipDk: '#566173', wrinkle: '#b9b4aa',
  ink: '#2b3140', check: '#1f9e4a',
  pTip: '#2b3140', pWood: '#e8c48a', pBody: '#ffcc1a', pBodyDk: '#d9a400', pFerrule: '#b8c0cc', pEraser: '#f28aa0',
  bubble: '#c9d1d9', bang: '#ffe066', red: '#ff5a5a', sweat: '#7fc8ff', zz: '#c9d1d9',
  // ring energy: deliberately paler than Clawd's lantern green so ring, beam and construct stand apart from the body
  energy: '#c4ffd9', energyHi: '#f2fff6', core: '#0d3a20', coreHi: '#1f6e40', halo: '#145c34', haloHi: '#1f8048',
  beam: '#ffffff', gSpark: '#e8fff0', badgeW: '#eafbe9', badgeD: '#0b3d1c',
  heart: '#ff6b9a', sweatHi: '#d6f0ff', leather: '#8b5a2b', leatherTip: '#c08a52', whipGrip: '#3a2a20', speed: '#3a4252',
} as const
