// Sum Path rules: a grid of digits. Draw one path from the top-left square to the bottom-right
// one, moving up, down, left or right and using each square at most once, so the squares on it
// add up to exactly the target. Fewer squares is better; par is the fewest possible.
import { parseDateKey, seededRandom } from '../../shell/daily'

export type Puzzle = { w: number; h: number; cells: number[]; target: number; par: number; solution: number[] }

export function adjacent(w: number, h: number, c: number): number[] {
  const x = c % w, y = Math.floor(c / w)
  const out: number[] = []
  if (y > 0) out.push(c - w)
  if (y < h - 1) out.push(c + w)
  if (x > 0) out.push(c - 1)
  if (x < w - 1) out.push(c + 1)
  return out
}
export const sumOf = (cells: number[], path: number[]) => path.reduce((t, c) => t + cells[c], 0)

/**
 * The shortest path that starts with `prefix` (default: just the top-left square), ends at the
 * bottom-right and adds up to `target`, using at most `max` squares; null if there is none.
 */
export function shortest(g: { w: number; h: number; cells: number[] }, target: number, max: number, prefix: number[] = [0]): number[] | null {
  const { w, h, cells } = g
  const end = w * h - 1
  const dist = (c: number) => (w - 1 - (c % w)) + (h - 1 - Math.floor(c / w))
  const used = new Uint8Array(w * h)
  for (const c of prefix) used[c] = 1
  const path = [...prefix]
  let sum = sumOf(cells, prefix)
  // Iterative deepening: the first length that works is the shortest.
  for (let len = Math.max(prefix.length, w + h - 1); len <= max; len++) {
    if (dfs(len)) return [...path]
  }
  return null
  function dfs(len: number): boolean {
    const head = path[path.length - 1]
    if (head === end) return sum === target && path.length === len
    const left = len - path.length // squares still to add
    const d = dist(head)
    // Needs at least d more squares, each worth 1 or more; the same parity as the distance.
    if (left < d || (left - d) % 2 || sum + left > target || sum + 9 * left < target) return false
    for (const n of adjacent(w, h, head)) {
      if (used[n]) continue
      used[n] = 1; path.push(n); sum += cells[n]
      if (dfs(len)) return true
      used[n] = 0; path.pop(); sum -= cells[n]
    }
    return false
  }
}

/** The day's size and how far above the straight-line length par should be. */
export function shapeFor(seed: string): { w: number; extra: [number, number] } {
  const d = parseDateKey(seed)
  const dow = d ? (d.getDay() + 6) % 7 : 0 // Monday 0 … Sunday 6
  const days: { w: number; extra: [number, number] }[] = [
    { w: 5, extra: [2, 2] },
    { w: 5, extra: [2, 4] },
    { w: 5, extra: [4, 4] },
    { w: 6, extra: [2, 4] },
    { w: 6, extra: [4, 4] },
    { w: 6, extra: [4, 6] },
    { w: 6, extra: [6, 6] },
  ]
  return days[dow]
}

/** The day's puzzle: digits 1–9 and a target whose shortest path is a little longer than straight. */
export function puzzleFor(seed: string): Puzzle {
  const r = seededRandom(`sum-path:${seed}`)
  const { w, extra: [lo, hi] } = shapeFor(seed)
  const h = w
  const straight = w + h - 1
  for (;;) {
    const cells = Array.from({ length: w * h }, () => 1 + Math.floor(r() * 9))
    const g = { w, h, cells }
    // Try a few targets around the size a path of the wanted length would add up to.
    for (let k = 0; k < 12; k++) {
      const len = straight + lo + 2 * Math.floor(r() * ((hi - lo) / 2 + 1))
      const target = Math.round(len * (4 + r() * 2.5))
      const way = shortest(g, target, straight + hi)
      if (way && way.length - straight >= lo) return { w, h, cells, target, par: way.length, solution: way }
    }
  }
}
