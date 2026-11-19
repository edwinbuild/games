import { seededRandom } from '../../shell/daily'
import { WORD_LIST } from './words'

/** Seconds the drawer has. */
export const DRAW_S = 45

/** The word for round k of a room, the same on every phone. */
export function wordFor(seed: string, k: number): string {
  const r = seededRandom(`quick-draw:${seed}`)
  const order = WORD_LIST.map((w) => [r(), w] as const).sort((a, b) => a[0] - b[0]).map(([, w]) => w)
  return order[k % order.length]
}

/** Lower case, letters only, and a simple plural removed. */
export function norm(s: string): string {
  const t = s.toLowerCase().replace(/[^a-z]/g, '')
  if (t.endsWith('ies') && t.length > 4) return t.slice(0, -3) + 'y'
  if (t.endsWith('es') && /(s|x|z|ch|sh)es$/.test(t)) return t.slice(0, -2)
  if (t.endsWith('s') && !t.endsWith('ss') && t.length > 3) return t.slice(0, -1)
  return t
}

export const isRight = (guess: string, word: string) => norm(guess) !== '' && norm(guess) === norm(word)

/** One letter away (added, removed or changed): worth a private "close!". */
export function isClose(guess: string, word: string): boolean {
  const a = norm(guess), b = norm(word)
  if (!a || a === b || Math.abs(a.length - b.length) > 1) return false
  let i = 0, j = 0, edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (a.length < b.length) j++
    else { i++; j++ }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

/** The word shown as blanks for guessers: "_ _ _   _ _ _ _" (spaces kept). */
export const blanks = (word: string) => word.split('').map((c) => (c === ' ' ? '  ' : '_')).join(' ')
