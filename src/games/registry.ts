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
  /** Who plays: one person, several on one phone, or several online. Defaults to 1. */
  players?: 1 | 'same-phone-2' | 'same-phone-3' | 'online-2' | 'online-2-8'
}

/** Short label for multiplayer games ("2 players", "Online · 2"), or null for solo games. */
export function playersLabel(g: GameMeta): string | null {
  switch (g.players) {
    case 'same-phone-2': return '2 players'
    case 'same-phone-3': return '3 players'
    case 'online-2': return 'Online · 2'
    case 'online-2-8': return 'Online · 2–8'
    default: return null
  }
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
  {
    slug: 'tap-duel',
    title: 'Tap Duel',
    emoji: '🤝',
    instructions: 'Two players, one phone. Tap your side the moment it turns green. First to three.',
    tagline: 'Two players, one phone: first to tap after the signal wins the round.',
    howTo: [
      'Put the phone flat between you; each player gets one half of the screen. Both halves say Wait, then turn green at the same moment. The first player to tap their own half wins the round.',
      'Tapping before it turns green loses the round. If you both tap within 10 milliseconds it is a tie and the round is replayed. First to three rounds wins. On a computer, use the A and L keys.',
    ],
    daily: false,
    color: 'coral',
    sample: '3–1',
    players: 'same-phone-2',
  },
  {
    slug: 'this-or-that',
    title: 'This or That',
    emoji: '🔀',
    instructions: 'Pick your answer, then guess how today’s players split.',
    tagline: 'One question a day. Pick a side, then guess how everyone else picked.',
    howTo: [
      'Every day there is one two-way question, the same for everyone, like “Window seat or aisle seat?”. Pick your answer, then guess what share of today’s players picked the first option.',
      'Lock in to see the real split so far. Your score is how close your guess was: within 3% is a great read of the crowd. One vote a day; the split keeps moving as more people play.',
    ],
    daily: true,
    color: 'aqua',
    sample: '4% off',
  },
  {
    slug: 'color-recall',
    title: 'Color Recall',
    emoji: '🎨',
    instructions: 'Each colour shows for 2 seconds. Rebuild it from memory with three sliders.',
    tagline: 'See a colour for two seconds, then rebuild it from memory. Three new colours every day.',
    howTo: [
      'A colour fills the screen for two seconds, then hides. Rebuild it with the hue, saturation and lightness sliders and press Lock in. After each colour you see yours next to the real one.',
      'There are three colours a day, the same for everyone. Each match is scored by how different the two colours look to the human eye (the CIEDE2000 measure), and your day’s result is the average. Try as many times as you like; your best try counts.',
    ],
    daily: true,
    color: 'orchid',
    sample: '86%',
  },
  {
    slug: 'count-flash',
    title: 'Count Flash',
    emoji: '🔢',
    instructions: 'A field of dots flashes for under a second. Estimate how many there were.',
    tagline: 'Dots flash for less than a second. How many were there? Five new fields every day.',
    howTo: [
      'Each field of dots shows for 0.8 seconds, which is too short to count. Type your estimate and lock it in; the field comes back with the real number.',
      'There are five fields a day, from about a dozen dots to three hundred, the same for everyone. Each guess scores 100 minus your percentage error, and your result is the average. Try as many times as you like; your best try counts.',
    ],
    daily: true,
    color: 'sand',
    sample: '9% off',
  },
  {
    slug: 'tug-of-taps',
    title: 'Tug of Taps',
    emoji: '🪢',
    instructions: 'Two players, one phone. After Go, tap your side as fast as you can to pull the rope over.',
    tagline: 'Two players, one phone, one rope. Tap faster to pull it to your side.',
    howTo: [
      'Put the phone between you; each player gets one half of the screen. After a 3-2-1 countdown, tap your own half as fast as you can. Every tap pulls the rope one step toward you.',
      'The first player to pull the rope 20 steps to their side wins. Taps before Go don’t count, and both players can tap at the same time. On a computer, use the A and L keys.',
    ],
    daily: false,
    color: 'lime',
    sample: '9.4 s',
    players: 'same-phone-2',
  },
  {
    slug: 'angle-eye',
    title: 'Angle Eye',
    emoji: '📐',
    instructions: 'Ten quick rounds: set angles, find middles and centres, double lines. By eye only.',
    tagline: 'How good is your eye? Judge angles, middles and centres in ten quick rounds.',
    howTo: [
      'Each round asks for one thing by eye: make an angle of a given size, mark the exact middle of a line, extend a line to twice its length, or mark the centre of a circle. Drag the handle (or use the arrow keys) and lock in.',
      'After each round the true answer appears in green with how far off you were. Each round scores up to 10, for a total out of 100. Send the link to a friend and they get the exact same ten rounds.',
    ],
    daily: false,
    color: 'periwinkle',
    sample: '82/100',
  },
]

export function getGame(slug: string): GameMeta {
  const g = GAMES.find((x) => x.slug === slug)
  if (!g) throw new Error(`Unknown game: ${slug}`)
  return g
}
