// Tilt rules: a small board with blocks, marbles and holes. Tilting it (up, down, left, right)
// slides every marble until it hits the edge, a block or another marble. A marble that rolls
// onto its own hole drops in (other marbles' holes are just floor to it). Get every marble in.
// Each day's board is checked by a full search, so par is the fewest tilts that can do it.
import { parseDateKey, seededRandom } from '../../shell/daily'

export type Dir = 'up' | 'down' | 'left' | 'right'
export const DIRS: Dir[] = ['up', 'down', 'left', 'right']
const STEP: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }

export type Board = { w: number; h: number; blocks: number[]; holes: number[] }
/** Where each marble is (y * w + x), or -1 once it has dropped into its hole. */
export type State = number[]
export type Puzzle = Board & { start: State; par: number; solution: Dir[] }

/** Tilts the board: the new state and each marble's path (the squares it rolled through). */
export function tilt(b: Board, s: State, dir: Dir): { state: State; paths: number[][] } {
  const [dx, dy] = STEP[dir]
  const blocked = new Set(b.blocks)
  const next = [...s]
  const paths: number[][] = s.map((p) => (p < 0 ? [] : [p]))
  // Marbles nearest the side they roll towards move first, so the others stop against them.
  const order = s.map((_, i) => i).filter((i) => s[i] >= 0)
    .sort((i, j) => lead(b.w, s[j], dx, dy) - lead(b.w, s[i], dx, dy))
  for (const i of order) {
    let p = next[i]
    for (;;) {
      const x = (p % b.w) + dx, y = Math.floor(p / b.w) + dy
      if (x < 0 || y < 0 || x >= b.w || y >= b.h) break
      const q = y * b.w + x
      if (blocked.has(q) || next.some((o, k) => k !== i && o === q)) break
      p = q
      paths[i].push(p)
      if (b.holes[i] === p) { p = -1; break }
    }
    next[i] = p
  }
  return { state: next, paths }
}
/** How far along the direction of travel a square is (bigger = closer to that side). */
const lead = (w: number, p: number, dx: number, dy: number) => (p % w) * dx + Math.floor(p / w) * dy

export const solved = (s: State) => s.every((p) => p < 0)
const key = (s: State) => s.join(',')

/**
 * The fewest tilts from `s` to every marble in, and one way to do it (null if it can't be done
 * from here). `limit` caps the search for very large boards.
 */
export function solve(b: Board, s: State, limit = 200_000): Dir[] | null {
  if (solved(s)) return []
  const seen = new Map<string, { from: string; dir: Dir } | null>([[key(s), null]])
  let frontier = [s]
  while (frontier.length && seen.size < limit) {
    const next: State[] = []
    for (const cur of frontier) {
      for (const d of DIRS) {
        const n = tilt(b, cur, d).state
        const k = key(n)
        if (seen.has(k)) continue
        seen.set(k, { from: key(cur), dir: d })
        if (solved(n)) {
          const way: Dir[] = []
          for (let at: string = k; ; ) { const e = seen.get(at); if (!e) break; way.unshift(e.dir); at = e.from }
          return way
        }
        next.push(n)
      }
    }
    frontier = next
  }
  return null
}

/** The day's size and par range: small with two marbles early in the week, bigger with three later. */
export function shapeFor(seed: string): { w: number; marbles: number; blocks: number; par: [number, number] } {
  const d = parseDateKey(seed)
  const dow = d ? (d.getDay() + 6) % 7 : 0 // Monday 0 … Sunday 6
  const days: { w: number; marbles: number; blocks: number; par: [number, number] }[] = [
    { w: 5, marbles: 2, blocks: 3, par: [3, 4] },
    { w: 5, marbles: 2, blocks: 4, par: [4, 5] },
    { w: 6, marbles: 2, blocks: 5, par: [4, 6] },
    { w: 6, marbles: 3, blocks: 5, par: [5, 6] },
    { w: 6, marbles: 3, blocks: 6, par: [5, 7] },
    { w: 7, marbles: 3, blocks: 7, par: [6, 8] },
    { w: 7, marbles: 3, blocks: 8, par: [7, 9] },
  ]
  return days[dow]
}

/** The day's puzzle: random boards until one has a par in the day's range. */
export function puzzleFor(seed: string): Puzzle {
  const r = seededRandom(`tilt:${seed}`)
  const { w, marbles, blocks: nb, par: [lo, hi] } = shapeFor(seed)
  const pick = (taken: Set<number>) => { for (;;) { const c = Math.floor(r() * w * w); if (!taken.has(c)) { taken.add(c); return c } } }
  let best: Puzzle | null = null
  for (let attempt = 0; attempt < 400; attempt++) {
    const taken = new Set<number>()
    const blocks = Array.from({ length: nb }, () => pick(taken))
    const holes = Array.from({ length: marbles }, () => pick(taken))
    const start = Array.from({ length: marbles }, () => pick(taken))
    const b = { w, h: w, blocks, holes }
    const way = solve(b, start)
    if (!way) continue
    const p: Puzzle = { ...b, start, par: way.length, solution: way }
    if (way.length >= lo && way.length <= hi) return p
    if (!best || Math.abs(way.length - lo) < Math.abs(best.par - lo)) best = p
  }
  return best!
}
