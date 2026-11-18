// Every game on the site. This file is also read by scripts/pages.ts
// (plain Node), so keep it free of imports.
export type GameMeta = {
  slug: string
  title: string
  emoji: string
  /** One line shown above the game. */
  instructions: string
  /** Short description for cards, <meta description> and link previews. */
  tagline: string
  /** How-to-play paragraphs rendered as static HTML for search engines. */
  howTo: string[]
  daily: boolean
  /** A colour token from design-system/tokens.json (e.g. "tangerine"). */
  color: string
  /** A typical score in the game's own units, shown on its card. */
  sample: string
}

export const GAMES: GameMeta[] = [
  {
    slug: 'blind-timer',
    title: 'Blind Timer',
    emoji: '⏱️',
    instructions: 'Start the clock, then stop it at exactly the target time. The clock hides after 1 second.',
    tagline: 'Stop a hidden clock at exactly the target time. A new target every day.',
    howTo: [
      'Each day has one target time, the same for everyone, such as 7.30 seconds. Press Start, count in your head, and press Stop when you think the target has passed. The clock disappears after the first second, so you have to feel it.',
      'You get three attempts a day and your best one counts. Share how far off you were, then come back tomorrow for a new target. Practice mode is open any time.',
    ],
    daily: true,
    color: 'tangerine',
    sample: '07.30',
  },
  {
    slug: 'reaction-chain',
    title: 'Reaction Chain',
    emoji: '⚡',
    instructions: 'Tap the moment the panel turns green. Five rounds.',
    tagline: 'Tap the instant the colour changes. Five rounds, one average.',
    howTo: [
      'Tap the panel to begin. Wait while it is red, then tap as soon as it turns green. Tapping too early costs you a 500 ms penalty on that round.',
      'After five rounds you get your average reaction time in milliseconds. Most people land between 200 and 300 ms.',
    ],
    daily: false,
    color: 'mint',
    sample: '243ms',
  },
  {
    slug: 'odd-one-out',
    title: 'Odd One Out',
    emoji: '👀',
    instructions: 'Tap the one emoji that is different. The grid grows every level.',
    tagline: 'Spot the one different emoji in a grid that keeps growing.',
    howTo: [
      'A grid of matching emojis hides exactly one that is different. Tap it to move to the next level, where the grid gets bigger and the difference gets subtler.',
      'You have 60 seconds in total, and each wrong tap costs 3 seconds. Share the level you reached.',
    ],
    daily: false,
    color: 'grape',
    sample: 'Lv 12',
  },
  {
    slug: 'memory-path',
    title: 'Memory Path',
    emoji: '🧠',
    instructions: 'Watch the path light up, then tap it back in order. It grows by one each round.',
    tagline: 'Watch a path light up on a grid and repeat it as it grows.',
    howTo: [
      'Squares on a 4×4 grid light up one at a time. When they stop, tap the same squares in the same order. Each round the path gets one step longer.',
      'One wrong tap ends the game. Your score is the longest path you repeated.',
    ],
    daily: false,
    color: 'sky',
    sample: '9',
  },
  {
    slug: 'pitch-match',
    title: 'Pitch Match',
    emoji: '🎵',
    instructions: 'Listen to the tone, then slide until yours matches it. Three tones a day.',
    tagline: 'Hear a tone, then slide to match it. Three new tones every day.',
    howTo: [
      'Press Listen to hear the target tone. Then move the slider and play your tone until you think they match, and press Lock in. Turn your sound on.',
      'There are three tones a day, the same for everyone. Your accuracy is based on how many cents (hundredths of a semitone) you were off.',
    ],
    daily: true,
    color: 'bubblegum',
    sample: '92%',
  },
  {
    slug: 'luckiest-person',
    title: 'Luckiest Person',
    emoji: '🍀',
    instructions: 'One tap a day. See how lucky you are today.',
    tagline: 'One tap a day rolls your luck. Are you luckier than everyone else?',
    howTo: [
      'Tap once to roll your luck for the day, a number from 1 to 100. Higher is luckier, and a roll of 93 means you were luckier than 93% of rolls.',
      'You only get one roll a day, so share it and come back tomorrow. Your streak counts the days in a row you rolled.',
    ],
    daily: true,
    color: 'lagoon',
    sample: '94',
  },
]

export function getGame(slug: string): GameMeta {
  const g = GAMES.find((x) => x.slug === slug)
  if (!g) throw new Error(`Unknown game: ${slug}`)
  return g
}
