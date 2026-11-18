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
    instructions: 'Press Start, then Stop when you think the target time is up. The clock hides after one second.',
    tagline: 'Stop a hidden clock on the target time. A new target every day.',
    howTo: [
      'Each day has one target time, the same for everyone, such as 7.30 seconds. Press Start, count in your head, and press Stop when you think the time is up. The clock hides after the first second.',
      'Try as many times as you like. Your closest try is your result for the day, and the share says how many tries it took.',
    ],
    daily: true,
    color: 'tangerine',
    sample: '07.30',
  },
  {
    slug: 'reaction-chain',
    title: 'Reaction Chain',
    emoji: '⚡',
    instructions: 'Tap the panel the moment it turns green. Five rounds.',
    tagline: 'Tap the moment the panel turns green. Five rounds, one average.',
    howTo: [
      'Tap the panel to start a round. Wait while it is red, then tap as soon as it turns green. A tap while it is still red, or faster than 100 ms after it turns green, counts as 500 ms.',
      'After five rounds you get your average reaction time in milliseconds, and your fastest round.',
    ],
    daily: false,
    color: 'mint',
    sample: '243ms',
  },
  {
    slug: 'odd-one-out',
    title: 'Odd One Out',
    emoji: '👀',
    instructions: 'Tap the one that is different. 60 seconds; a wrong tap costs 3.',
    tagline: 'Find the one different emoji before the minute runs out.',
    howTo: [
      'Each grid hides exactly one emoji that is different. Tap it to go to the next level, where the grid gets bigger and the difference gets smaller.',
      'You have 60 seconds in total, starting from your first tap. A wrong tap takes 3 seconds off. Your score is the number of levels you clear.',
    ],
    daily: false,
    color: 'grape',
    sample: 'Lv 12',
  },
  {
    slug: 'memory-path',
    title: 'Memory Path',
    emoji: '🧠',
    instructions: 'Watch the squares light up, then tap them in the same order.',
    tagline: 'Repeat a path of lit squares. It gets one step longer every round.',
    howTo: [
      'Squares on a 4×4 grid light up one at a time. When they stop, tap the same squares in the same order. Each round adds one step, and after eight steps the squares light up faster.',
      'One wrong tap ends the game. Your score is the longest path you repeated. Turn sound on to hear a note for each square.',
    ],
    daily: false,
    color: 'sky',
    sample: '9',
  },
  {
    slug: 'pitch-match',
    title: 'Pitch Match',
    emoji: '🎵',
    instructions: 'Listen to the tone, then slide yours until they match. Three tones, as many tries as you like.',
    tagline: 'Hear a tone, then match it by ear. Three new tones every day.',
    howTo: [
      'Press Listen to hear the target tone. Move the slider, play your tone, and press Lock in when they sound the same. You need your phone\'s sound on.',
      'There are three tones a day, the same for everyone. Being one semitone off (one piano key) scores 50%; matching exactly scores 100%. Try as many times as you like; your best try counts and the share says how many it took.',
    ],
    daily: true,
    color: 'bubblegum',
    sample: '92%',
  },
  {
    slug: 'luckiest-person',
    title: 'Luckiest Person',
    emoji: '🍀',
    instructions: 'Pick one of today\'s five face-down cards. Higher is luckier.',
    tagline: 'Five face-down cards, one pick a day. Everyone gets the same five.',
    howTo: [
      'Every day there are five face-down cards, each with a number from 1 to 100. Everyone gets the same five cards in the same places, so you and your friends are choosing from the same row.',
      'You get one pick a day. Then all five turn over and you see whether you took the best one. Share your card and compare with friends. After your pick you can practise with random decks; they don\'t count.',
    ],
    daily: true,
    color: 'lagoon',
    sample: '87',
  },
]

export function getGame(slug: string): GameMeta {
  const g = GAMES.find((x) => x.slug === slug)
  if (!g) throw new Error(`Unknown game: ${slug}`)
  return g
}
