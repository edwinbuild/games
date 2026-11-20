// Letter Race rules: everyone gets the same seven letters and a minute to make words from them
// (3 to 7 letters, each letter used as often as it appears). Longer words score more, and a word
// only you found scores double.
import { seededRandom } from '../../shell/daily'

export const ROUND_S = 60
export const MIN = 3

/** The seven letters for a match: a common seven-letter word, shuffled so it isn't in order. */
export function lettersFor(seed: string, seeds: string[]): string[] {
  const r = seededRandom(`letter-race:${seed}`)
  const word = seeds[Math.floor(r() * seeds.length)]
  const letters = [...word]
  for (let tries = 0; tries < 10; tries++) {
    for (let i = letters.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [letters[i], letters[j]] = [letters[j], letters[i]] }
    if (letters.join('') !== word) break
  }
  return letters
}

/** Whether `word` can be made from the letters (each used at most as often as it appears). */
export function canMake(word: string, letters: string[]): boolean {
  const left = [...letters]
  for (const c of word) {
    const i = left.indexOf(c)
    if (i < 0) return false
    left.splice(i, 1)
  }
  return true
}

const BY_LENGTH: Record<number, number> = { 3: 1, 4: 2, 5: 4, 6: 6, 7: 10 }
export const pointsFor = (word: string) => BY_LENGTH[word.length] ?? 0

export type Verdict = 'ok' | 'short' | 'letters' | 'unknown' | 'again'
/** Why a typed word is or isn't accepted. */
export function check(word: string, letters: string[], words: Set<string>, found: string[]): Verdict {
  if (word.length < MIN) return 'short'
  if (!canMake(word, letters)) return 'letters'
  if (found.includes(word)) return 'again'
  if (!words.has(word)) return 'unknown'
  return 'ok'
}

export type Scored = { id: string; points: number; words: { word: string; points: number; only: boolean }[] }
/**
 * Every player's score: each word's points, doubled if nobody else found it. Words are checked
 * again here (letters and list), so a phone can't send in words that don't count.
 */
export function score(lists: Record<string, string[]>, letters: string[], words: Set<string>): Scored[] {
  const clean: Record<string, string[]> = {}
  const seen = new Map<string, number>()
  for (const [id, list] of Object.entries(lists)) {
    clean[id] = [...new Set(list.map((w) => String(w).toLowerCase()))].filter((w) => w.length >= MIN && canMake(w, letters) && words.has(w))
    for (const w of clean[id]) seen.set(w, (seen.get(w) ?? 0) + 1)
  }
  const multi = Object.keys(lists).length > 1
  return Object.entries(clean).map(([id, list]) => {
    const scored = list.map((word) => {
      const only = multi && seen.get(word) === 1
      return { word, only, points: pointsFor(word) * (only ? 2 : 1) }
    }).sort((a, b) => b.points - a.points || a.word.localeCompare(b.word))
    return { id, points: scored.reduce((t, w) => t + w.points, 0), words: scored }
  })
}

/** Every word in the list that can be made from the letters, longest first (shown after a match). */
export const allWords = (letters: string[], words: Set<string>) =>
  [...words].filter((w) => canMake(w, letters)).sort((a, b) => b.length - a.length || a.localeCompare(b))
