import { seededRandom } from '../../shell/daily'

export type Dot = { x: number; y: number; r: number }

/** Today's five counts (12–300), spread so each day mixes small and large fields. */
export function countsFor(seed: string): number[] {
  const r = seededRandom(`${seed}:counts`)
  const bands: [number, number][] = [[12, 40], [40, 90], [90, 160], [160, 230], [230, 300]]
  const counts = bands.map(([lo, hi]) => Math.round(lo + r() * (hi - lo)))
  for (let i = counts.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[counts[i], counts[j]] = [counts[j], counts[i]]
  }
  return counts
}

/**
 * Places `n` non-overlapping dots in a 100×100 field, seeded. Dot size shrinks with the count;
 * if the field gets crowded the gap between dots shrinks, but dots never overlap.
 */
export function placeDots(n: number, seed: string): Dot[] {
  const rand = seededRandom(`${seed}:dots:${n}`)
  const r = Math.max(0.9, Math.min(3.2, 26 / Math.sqrt(n)))
  let gap = r * 0.9
  const dots: Dot[] = []
  let tries = 0
  while (dots.length < n) {
    const x = r + rand() * (100 - 2 * r)
    const y = r + rand() * (100 - 2 * r)
    if (dots.every((d) => (d.x - x) ** 2 + (d.y - y) ** 2 >= (2 * r + gap) ** 2)) dots.push({ x, y, r })
    if (++tries > 4000) {
      gap = Math.max(0.05, gap * 0.7)
      tries = 0
    }
  }
  return dots
}

/** 100 for exact, minus the percentage error, never below 0. */
export const roundScore = (guess: number, actual: number) => Math.max(0, Math.round(100 - (Math.abs(guess - actual) / actual) * 100))
