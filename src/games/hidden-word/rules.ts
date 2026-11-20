// Hidden Word rules: find a hidden five-letter word. After each guess every letter is marked:
// right (this letter, this spot), elsewhere (in the word, another spot) or out (not in the word,
// or not again). The bigger versions play 2, 4 or 8 hidden words at once: every guess goes on every
// board not yet solved.
import { seededRandom } from '../../shell/daily'

export type Mark = 'right' | 'elsewhere' | 'out'
export const LEN = 5

/** The versions: how many boards, and how many guesses for all of them. */
export const MODES = {
  'hidden-word': { boards: 1, guesses: 6 },
  'two-words': { boards: 2, guesses: 7 },
  'four-words': { boards: 4, guesses: 9 },
  'eight-words': { boards: 8, guesses: 13 },
} as const
export type Mode = keyof typeof MODES

/**
 * Marks for one guess against one answer. Letters in the right spot first; then each other letter
 * is "elsewhere" only while the answer still has an unmatched copy of it (so a double letter in a
 * guess isn't marked twice for a single one in the answer).
 */
export function mark(guess: string, answer: string): Mark[] {
  const out: Mark[] = Array(LEN).fill('out')
  const left: Record<string, number> = {}
  for (let i = 0; i < LEN; i++) {
    if (guess[i] === answer[i]) out[i] = 'right'
    else left[answer[i]] = (left[answer[i]] ?? 0) + 1
  }
  for (let i = 0; i < LEN; i++) {
    if (out[i] === 'right') continue
    if (left[guess[i]]) { out[i] = 'elsewhere'; left[guess[i]]-- }
  }
  return out
}

/** The day's hidden words for a version: different words, the same for everyone. */
export function answersFor(mode: Mode, seed: string, answers: string[]): string[] {
  const r = seededRandom(`${mode}:${seed}`)
  const out: string[] = []
  while (out.length < MODES[mode].boards) {
    const w = answers[Math.floor(r() * answers.length)]
    if (!out.includes(w)) out.push(w)
  }
  return out
}

/** The guess at which each board was solved (index into guesses), or null. */
export function solvedAt(guesses: string[], answers: string[]): (number | null)[] {
  return answers.map((a) => { const i = guesses.indexOf(a); return i < 0 ? null : i })
}

/**
 * A finished game as one number (lower is better): the guesses used if every board was solved;
 * otherwise more than the most guesses allowed, plus one for each board left unsolved.
 */
export function scoreOf(mode: Mode, guesses: string[], answers: string[]): number {
  const at = solvedAt(guesses, answers)
  const missed = at.filter((x) => x == null).length
  return missed ? MODES[mode].guesses + missed : guesses.length
}
export function scoreText(mode: Mode, score: number): string {
  const { boards, guesses } = MODES[mode]
  if (score <= guesses) return `${score}/${guesses}`
  const missed = score - guesses
  return boards === 1 ? `X/${guesses}` : `${boards - missed} of ${boards} words`
}

/** For the keyboard: the best mark each letter has had on each board (right beats elsewhere beats out). */
export function keyMarks(guesses: string[], answers: string[]): Record<string, (Mark | null)[]> {
  const rank = { right: 3, elsewhere: 2, out: 1 }
  const at = solvedAt(guesses, answers)
  const keys: Record<string, (Mark | null)[]> = {}
  answers.forEach((a, b) => {
    // A board stops taking guesses once it's solved.
    const upto = at[b] == null ? guesses.length : at[b]! + 1
    guesses.slice(0, upto).forEach((g) => mark(g, a).forEach((m, i) => {
      const k = (keys[g[i]] ??= answers.map(() => null))
      if (!k[b] || rank[m] > rank[k[b]!]) k[b] = m
    }))
  })
  return keys
}
