import { roundScore } from './dots'

/** A finished or running try: the player's guesses and the real counts. */
export type Try = { g: number[]; n: number[] }
/** Tries saved before the change were only scores; they still load. */
export type Stored = Try | number[]

/** Each try of the day has its own fields: try 1 is the same for everyone, try 2 is the same for everyone… */
export const trySeed = (seed: string, k: number) => (k === 0 ? seed : `${seed}:try${k}`)

/** Per-field scores (0–100, used for the coloured squares). */
export const scoresOf = (t: Stored): number[] => (Array.isArray(t) ? t : t.g.map((g, i) => roundScore(g, t.n[i])))

/** The true average error in percent, to 0.1 (not capped: guessing 300 for 100 is 200% off). */
export function errorOf(t: Stored): number {
  if (Array.isArray(t)) return Math.round((100 - t.reduce((a, b) => a + b, 0) / t.length) * 10) / 10
  const e = t.g.reduce((s, g, i) => s + (Math.abs(g - t.n[i]) / t.n[i]) * 100, 0) / t.g.length
  return Math.round(e * 10) / 10
}

/** The best try: the smallest average error. */
export const bestOf = (tries: Stored[]): Stored => tries.reduce((a, b) => (errorOf(b) < errorOf(a) ? b : a))
