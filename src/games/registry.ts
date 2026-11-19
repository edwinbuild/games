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
  {
    slug: 'reaction-online',
    title: 'Reaction Duel Online',
    emoji: '⚡',
    instructions: 'Duel a friend on their own phone: tap the moment it turns green. First to three.',
    tagline: 'Duel a friend on another phone. The faster reaction wins each round, first to three.',
    howTo: [
      'Create a room and send the link (or the five-letter code) to a friend. When you are both in, press Ready; the host starts the duel. Each round both screens say Wait, then turn green; tap as fast as you can.',
      'Each phone times its own reaction from the moment it turned green, so a slow connection never decides a round. Tapping before green loses the round. First to three rounds wins; Rematch keeps you in the same room.',
    ],
    daily: false,
    color: 'peach',
    sample: '3–2',
    players: 'online-2',
  },
  {
    slug: 'flip-grid',
    title: 'Flip Grid',
    emoji: '🔲',
    instructions: 'Tap a tile to flip it and its neighbours. Clear every lit tile in as few moves as you can.',
    tagline: 'Flip tiles and their neighbours until the grid is clear. One puzzle a day, with a par to beat.',
    howTo: [
      'Each day has one 5×5 puzzle, the same for everyone. Tapping a tile flips it and the tiles directly above, below and beside it, from lit to off or back. Turn every tile off to solve it.',
      'Par is the fewest moves that can solve the day\'s grid. Undo as often as you like; only a solved grid counts. Try as many times as you like; your fewest moves is your result. On a computer, use the arrow keys and Space, and Z to undo.',
    ],
    daily: true,
    color: 'pistachio',
    sample: '7 moves',
  },
  {
    slug: 'spot-race',
    title: 'Spot Race Online',
    emoji: '👀',
    instructions: 'Race up to seven friends, each on your own phone, through the same odd-one-out grids. 60 seconds.',
    tagline: 'Up to eight friends, one minute, the same grids. Who spots the odd one out fastest?',
    howTo: [
      'Create a room and send the link (or the five-letter code). Two to eight players can join. When everyone is ready, the host starts the race and every phone gets the same sequence of grids.',
      'Tap the one emoji that is different to go to the next level; a wrong tap costs 3 seconds. Everyone sees each other’s level live. After 60 seconds the most levels wins; on a tie, whoever got there first. A player who leaves keeps their last level.',
    ],
    daily: false,
    color: 'grape',
    sample: '2nd of 5',
    players: 'online-2-8',
  },
  {
    slug: 'stack-tower',
    title: 'Stack Tower',
    emoji: '🧱',
    instructions: 'Tap to drop each sliding block onto the tower. Anything that overhangs is cut off.',
    tagline: 'Drop sliding blocks into a tower. Overhangs get cut, perfect drops don’t. One tower a day.',
    howTo: [
      'A block slides back and forth above the tower. Tap (or press Space) to drop it. Whatever hangs over the block below is cut off, so the next block is narrower. Drop it almost exactly on top and it keeps its full width.',
      'Every five blocks the slide gets faster. Miss the tower completely and the try is over. Everyone gets the same tower each day, with the same starting width and speeds. Try as many times as you like; your tallest tower counts.',
    ],
    daily: true,
    color: 'chili',
    sample: '23 blocks',
  },
  {
    slug: 'pour-line',
    title: 'Pour Line',
    emoji: '🥛',
    instructions: 'Press and hold to pour, let go to stop. Fill the glass exactly to the line.',
    tagline: 'Hold to pour, let go at the line. The drink keeps falling after you let go. One glass a day.',
    howTo: [
      'Press and hold anywhere on the glass to pour from the tap; let go to stop. The stream already in the air still lands after you let go, so stop a moment early. Pour past the rim and the try is spilled.',
      'Every day has one glass, the same for everyone: its shape, the height of the line and how fast the tap runs. Narrow parts of a glass fill faster. Your score is how far the settled drink is from the line, as a share of the glass height. Try as many times as you like; your closest pour counts. On a computer, hold Space.',
    ],
    daily: true,
    color: 'honey',
    sample: '0.6% off',
  },
  {
    slug: 'chain-pop',
    title: 'Chain Pop',
    emoji: '🫧',
    instructions: 'One tap. The bubble you tap pops and sets off its neighbours. Pop as many as you can.',
    tagline: 'One tap sets off a chain of popping bubbles. Same board for everyone, every day.',
    howTo: [
      'Tap one bubble. It pops and sends out a ring; any bubble the ring reaches pops too and sends out its own ring. Big bubbles send bigger rings. Then sit back and watch the chain run.',
      'Every day has one board of 60 bubbles, the same for everyone. Your score is how many popped from your one tap. Try as many times as you like; your longest chain counts. On a computer, choose a bubble with the arrow keys and press Space.',
    ],
    daily: true,
    color: 'lilac',
    sample: '41 of 60',
  },
]

export function getGame(slug: string): GameMeta {
  const g = GAMES.find((x) => x.slug === slug)
  if (!g) throw new Error(`Unknown game: ${slug}`)
  return g
}
