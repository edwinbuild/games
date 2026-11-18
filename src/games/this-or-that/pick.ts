import { dayNumber, seededRandom } from '../../shell/daily'
import { QUESTIONS } from './questions'

/** A fixed shuffle of all questions; day N takes entry N, so none repeats within QUESTIONS.length days. */
const ORDER = (() => {
  const r = seededRandom('this-or-that:order')
  const idx = QUESTIONS.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
})()

export function questionFor(d = new Date()): { id: number; text: string; a: string; b: string } {
  const n = ((dayNumber(d) % ORDER.length) + ORDER.length) % ORDER.length
  const id = ORDER[n]
  const [text, a, b] = QUESTIONS[id]
  return { id, text, a, b }
}

/** Score for guessing the share that picked A: 100 minus the distance in percentage points. */
export function guessScore(guessA: number, a: number, b: number): { actualA: number; off: number; score: number } {
  const total = a + b
  const actualA = total ? Math.round((a / total) * 100) : 50
  const off = Math.abs(guessA - actualA)
  return { actualA, off, score: Math.max(0, 100 - off) }
}
