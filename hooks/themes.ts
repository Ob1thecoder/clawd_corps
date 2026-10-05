export type CorpsName = 'lantern' | 'blue' | 'red' | 'yellow' | 'violet' | 'white' | 'black'
export type ThemeName = CorpsName | 'classic'
export type WordState = 'idle' | 'doze' | 'thinking' | 'planning' | 'showplan' | 'building' | 'waiting'
export type Style = 'classic' | 'lantern'

// A lantern's ring energy, badge and tag colours. The art is drawn with Green's and recoloured into these.
export type Ring = {
  energy: string; energyHi: string; core: string; coreHi: string; halo: string; haloHi: string; gSpark: string
  badgeBg: string; badgeFg: string; text: string; line: string; rim?: string
}
export type Paint = {
  body: string; floor: string; style: Style
  badge?: readonly string[]          // the chest symbol, 9 x 7 (W badge, D mark)
  emblem?: readonly string[]         // the suit-up flash, 13 x 9 ('#')
  ring?: Ring
  from?: Paint                       // while powering down: the corps being left
}
export type Theme = Paint & { title: string; words: Record<WordState, readonly string[]>; badge: readonly string[]; emblem: readonly string[]; ring: Ring }

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t)
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)
}

function words(idle: string, doze: string, building: string[], thinking: string[]): Record<WordState, readonly string[]> {
  return { idle: [idle], doze: [doze], thinking, planning: ['Drafting the blueprint', 'Sketching the construct'], showplan: ['Awaiting your verdict'], building, waiting: ['Awaiting your word'] }
}

type CorpsSpec = {
  title: string; base: string; badge: string[]; emblem: string[]; words: Record<WordState, readonly string[]>
  ring?: Partial<Ring>
}
function corps(c: CorpsSpec): Theme {
  const ring: Ring = {
    energy: mix(c.base, '#ffffff', 0.72), energyHi: mix(c.base, '#ffffff', 0.9),
    core: mix(c.base, '#000000', 0.75), coreHi: mix(c.base, '#000000', 0.5),
    halo: mix(c.base, '#000000', 0.6), haloHi: mix(c.base, '#000000', 0.4), gSpark: mix(c.base, '#ffffff', 0.85),
    badgeBg: mix(c.base, '#ffffff', 0.88), badgeFg: mix(c.base, '#000000', 0.7), text: c.base, line: c.base,
    ...c.ring,
  }
  return { title: c.title, body: c.base, floor: mix(c.base, '#000000', 0.78), style: 'lantern', badge: c.badge, emblem: c.emblem, words: c.words, ring }
}

const GREEN_BADGE = ['..WWWWW..', '.DDDDDDD.', 'WWWDDDWWW', 'WWDWWWDWW', 'WWWDDDWWW', '.DDDDDDD.', '..WWWWW..']
const GREEN_EMBLEM = [
  '#############', '...#######...', '..##.....##..', '.##.......##.', '.##.......##.',
  '.##.......##.', '..##.....##..', '...#######...', '#############',
]

export const THEMES: Record<ThemeName, Theme> = {
  // Green keeps its hand-tuned palette: the art is drawn in these colours.
  lantern: {
    title: 'Green Lantern', body: '#2fcf62', floor: '#123a22', style: 'lantern', badge: GREEN_BADGE, emblem: GREEN_EMBLEM,
    words: {
      idle: ['In brightest day'], doze: ['Recharging the ring'],
      thinking: ['Consulting the Guardians', 'Focusing willpower', 'Scanning Sector 2814'],
      planning: ['Drafting the blueprint', 'Surveying Sector 2814', 'Sketching the construct'], showplan: ['Awaiting the Guardians'],
      building: ['Charging the ring', 'Forging a construct', 'Willpower at maximum', 'Hammering in green'], waiting: ['Awaiting your word'],
    },
    ring: {
      energy: '#c4ffd9', energyHi: '#f2fff6', core: '#0d3a20', coreHi: '#1f6e40', halo: '#145c34', haloHi: '#1f8048', gSpark: '#e8fff0',
      badgeBg: '#eafbe9', badgeFg: '#0b3d1c', text: '#2fcf62', line: '#2fcf62',
    },
  },
  blue: corps({
    title: 'Blue Lantern', base: '#3d8bff',
    badge: ['..WWDWW..', '.DWWDWWD.', 'DWWDDDWWD', 'DWDWWWDWD', 'DWWDDDWWD', '.DWWDWWD.', '..WWDWW..'],
    emblem: ['.....###.....', '..##..#..##..', '.#..#...#..#.', '#..#.....#..#', '#..#.....#..#', '#..#.....#..#', '.#..#...#..#.', '..##..#..##..', '.....###.....'],
    words: words('All will be well', 'Dreaming of green builds', ['All will be well', 'Hoping the tests pass', 'Recharging the greens'], ['Finding a way', 'Keeping hope alive']),
  }),
  red: corps({
    title: 'Red Lantern', base: '#ff4b4b',
    badge: ['..WWWWW..', '.DWWWWWD.', 'WDWWWWWDW', 'WDWWWDDDW', 'WDWWDWWDW', '.DDWDDDD.', '..WDWWD..'],
    emblem: ['..##.....##..', '.#.........#.', '#...........#', '#.....###...#', '#....#...#..#', '#....#...#..#', '.#....###..#.', '..##.....##..', '....##.##....'],
    words: words('Simmering', 'Seething quietly', ['Raging at the bug', 'Burning it down', 'Pure fury, pure focus'], ['Boiling over', 'Glaring at the stack trace']),
  }),
  yellow: corps({
    title: 'Yellow Lantern', base: '#ffd23f',
    badge: ['..WWWWW..', '.WDDDDDW.', 'WWDDWDDWW', 'WDDWWWDDW', 'WWDWWWDWW', '.DWDDDWD.', '..DDWDD..'],
    emblem: ['.###########.', '..###...###..', '...#######...', '...#.....#...', '..##.....##..', '...#.....#...', '...#######...', '..##.##.##...', '.##..###..##.'],
    words: words('Watching the logs', 'Sleeping with one eye open', ['Instilling fear in typos', 'Terrifying the linter', 'Ruling by fear'], ['Plotting', 'Sizing up the code']),
  }),
  violet: corps({
    title: 'Violet Lantern', base: '#d65bf0',
    badge: ['..WWDWW..', '.WWDDDWW.', 'WWDDWDDWW', 'DDDWWWDDD', 'WWDDWDDWW', '.WWDDDWW.', '..WWDWW..'],
    emblem: ['......#......', '.....###.....', '...#######...', '...##...##...', '#####...#####', '...##...##...', '...#######...', '.....###.....', '......#......'],
    words: words('Feeling the love', 'Dreaming sweetly', ['Coding with love', 'Crafting with care', 'Every line a love letter'], ['Thinking fondly', 'Choosing gently']),
  }),
  white: corps({
    title: 'White Lantern', base: '#f2f2f6',
    badge: ['..WDWDW..', '.WWWWWWW.', 'DWWDDDWWD', 'WWWDDDWWW', 'DWWDDDWWD', '.WWWWWWW.', '..WDWDW..'],
    emblem: ['......#......', '..#...#...#..', '....#####....', '...#.....#...', '####.....####', '...#.....#...', '....#####....', '..#...#...#..', '......#......'],
    words: words('Radiant', 'Resting in the light', ['Bringing the build to life', 'Breathing life into code', 'Lighting every corner'], ['Seeing it all', 'Weighing the spectrum']),
    ring: { badgeBg: '#5f6470', badgeFg: '#ffffff', text: '#f2f2f6', line: '#e8e8ee' },
  }),
  black: corps({
    title: 'Black Lantern', base: '#26262c',
    badge: ['..DWDWD..', '.DWDWDWD.', 'WDWDWDWDW', 'DDDDDDDDD', 'WDWWWWWDW', '.WDWWWDW.', '..WWDWW..'],
    emblem: ['.#.##.#.##.#.', '.#.##.#.##.#.', '.#.##.#.##.#.', '.#.##.#.##.#.', '#############', '.##.......##.', '..##.....##..', '...##...##...', '....##.##....'],
    words: words('Lurking', 'Dead to the world', ['Raising dead code', 'Rising from the logs', 'Nothing stays deleted'], ['Haunting the stack', 'Whispering to old commits']),
    ring: { energy: '#c8c8d4', energyHi: '#ececf2', badgeBg: '#d6d6de', badgeFg: '#111114', text: '#a8a8b6', line: '#5a5a66', rim: '#6b6b78' },
  }),
  classic: {
    title: 'Classic', body: '#d97757', floor: '#3a2c25', style: 'classic', badge: GREEN_BADGE, emblem: GREEN_EMBLEM,
    words: {
      idle: ['Ready'], doze: ['Napping'], thinking: ['Thinking', 'Pondering', 'Mulling'], planning: ['Sketching', 'Drafting', 'Mapping it out'],
      showplan: ['Waiting on your verdict'], building: ['Building', 'Hammering', 'Nailing it down', 'Assembling'], waiting: ['Waiting on you'],
    },
    ring: {
      energy: '#c4ffd9', energyHi: '#f2fff6', core: '#0d3a20', coreHi: '#1f6e40', halo: '#145c34', haloHi: '#1f8048', gSpark: '#e8fff0',
      badgeBg: '#eafbe9', badgeFg: '#0b3d1c', text: '#d97757', line: '#d97757',
    },
  },
}

export const CORPS: readonly CorpsName[] = ['lantern', 'blue', 'red', 'yellow', 'violet', 'white', 'black']

// Accepts a corps name, 'green' or 'lantern' for Green, or 'classic'; anything else is null.
export function corpsOf(s: string): ThemeName | null {
  const n = s.trim().toLowerCase()
  if (n === 'green') return 'lantern'
  return n === 'classic' || (CORPS as readonly string[]).includes(n) ? (n as ThemeName) : null
}

export function isThemeName(s: string): s is ThemeName {
  return corpsOf(s) === s
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
