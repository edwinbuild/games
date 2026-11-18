// The Odd One Out engine, shared by Odd One Out and Spot Race Online.

// Pairs ordered from easy to hard to tell apart. Each level draws from a window that
// slides down the list, so the grid grows and the difference gets subtler together.
export const PAIRS: [string, string][] = [
  // different shape and colour
  ['🍎', '🍌'], ['🐶', '🐱'], ['⚽', '🏀'], ['☀️', '🌧️'], ['🚗', '🚲'], ['🌲', '🌵'], ['🍕', '🍔'], ['🐟', '🐦'],
  // same family, different colour or shape
  ['🍎', '🍅'], ['🍊', '🍑'], ['🐶', '🐕'], ['🐱', '🐈'], ['🌕', '🌝'], ['🐢', '🦎'], ['🍋', '🍌'], ['🚗', '🚕'], ['🌻', '🌼'], ['❤️', '🧡'],
  // faces and small marks
  ['😀', '😃'], ['🙂', '🙃'], ['😐', '😑'], ['😄', '😆'], ['😺', '😸'], ['🌑', '🌚'], ['⭐', '🌟'], ['🕐', '🕑'], ['🔴', '🟠'], ['💙', '💜'], ['😮', '😯'], ['🌘', '🌒'],
  // nearly the same
  ['😊', '☺️'], ['😗', '😙'], ['🕒', '🕓'], ['😁', '😀'], ['😚', '😙'], ['🙁', '☹️'], ['😶', '😐'], ['🕐', '🕜'], ['🟢', '🟩'], ['😌', '😊'],
]

/** Grid size, the two emoji and where the odd one sits, for a level (1-based). */
export function levelSetup(level: number, rng: () => number) {
  const size = Math.min(3 + Math.floor((level - 1) / 2), 8) // 3×3 → 8×8
  const start = Math.min(Math.floor((level - 1) * 2.2), PAIRS.length - 5)
  const [a, b] = PAIRS[start + Math.floor(rng() * 5)]
  const flip = rng() < 0.5
  return { size, common: flip ? a : b, odd: flip ? b : a, oddIndex: Math.floor(rng() * size * size) }
}

