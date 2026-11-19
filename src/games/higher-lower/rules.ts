import { seededRandom } from '../../shell/daily'
import { COUNTRIES, SOURCE } from './facts'

export const ROUNDS = 10
/** Seconds to answer a round. */
export const ANSWER_S = 10
export type Metric = 'population' | 'area'
export type Round = { metric: Metric; shown: number; hidden: number }

export const valueOf = (i: number, m: Metric) => (m === 'population' ? COUNTRIES[i][2] : COUNTRIES[i][3])
export const nameOf = (i: number) => COUNTRIES[i][1]
export const sourceOf = (m: Metric) => SOURCE[m]

/** A room's rounds from its seed: alternating population and land area, never a near-tie (within 10%). */
export function roundsFor(seed: string): Round[] {
  const r = seededRandom(`higher-lower:${seed}`)
  const used = new Set<number>()
  const out: Round[] = []
  for (let k = 0; out.length < ROUNDS && k < 1000; k++) {
    const metric: Metric = out.length % 2 ? 'area' : 'population'
    const a = Math.floor(r() * COUNTRIES.length), b = Math.floor(r() * COUNTRIES.length)
    if (a === b || used.has(a) || used.has(b)) continue
    const va = valueOf(a, metric), vb = valueOf(b, metric)
    if (Math.max(va, vb) / Math.min(va, vb) < 1.1) continue
    used.add(a); used.add(b)
    out.push({ metric, shown: a, hidden: b })
  }
  return out
}

export const answerFor = (r: Round): 'higher' | 'lower' => (valueOf(r.hidden, r.metric) > valueOf(r.shown, r.metric) ? 'higher' : 'lower')

export type Answer = { id: string; correct: boolean; ms: number }
/** Points for a round: correct answers ranked by speed get 3, 2, then 1 each; wrong or no answer gets 0. */
export function roundPoints(answers: Answer[]): Record<string, number> {
  const pts: Record<string, number> = {}
  for (const a of answers) pts[a.id] = 0
  answers.filter((a) => a.correct).sort((a, b) => a.ms - b.ms || a.id.localeCompare(b.id)).forEach((a, i) => (pts[a.id] = Math.max(1, 3 - i)))
  return pts
}

/** Formats a value for display, with its unit. */
export function show(v: number, m: Metric): string {
  if (m === 'area') return `${v.toLocaleString('en')} km²`
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} billion people`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} million people`
  return `${v.toLocaleString('en')} people`
}
