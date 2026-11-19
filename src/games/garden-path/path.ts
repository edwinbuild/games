// Garden Path rules: draw one path from the gate (S) to the gate (E) through every square of
// the garden exactly once, moving up, down, left or right. Stones say what the path does on
// their square: ● it turns there, ○ it goes straight through. Each day has exactly one answer.
import { parseDateKey, seededRandom } from '../../shell/daily'

export type Cell = number // index y * w + x
export type Stone = 'turn' | 'straight'
export type Puzzle = { w: number; h: number; start: Cell; end: Cell; stones: Record<number, Stone>; solution: Cell[] }

export const xy = (w: number, c: Cell) => [c % w, Math.floor(c / w)] as const
export function adjacent(w: number, h: number, c: Cell): Cell[] {
  const [x, y] = xy(w, c)
  const out: Cell[] = []
  if (x > 0) out.push(c - 1)
  if (x < w - 1) out.push(c + 1)
  if (y > 0) out.push(c - w)
  if (y < h - 1) out.push(c + w)
  return out
}
/** Whether the path turns at `mid` (coming from a, leaving to b). */
export function turnsAt(w: number, a: Cell, mid: Cell, b: Cell): boolean {
  const [ax, ay] = xy(w, a), [mx, my] = xy(w, mid), [bx, by] = xy(w, b)
  return !((ax === mx && mx === bx) || (ay === my && my === by))
}

/** Checks a finished path: every square once, gate to gate, steps between neighbours, stones obeyed. Returns the squares whose stone is broken. */
export function check(p: { w: number; h: number; start: Cell; end: Cell; stones: Record<number, Stone> }, path: Cell[]): { ok: boolean; broken: Cell[] } {
  const broken: Cell[] = []
  for (let i = 1; i < path.length - 1; i++) {
    const s = p.stones[path[i]]
    if (s && (s === 'turn') !== turnsAt(p.w, path[i - 1], path[i], path[i + 1])) broken.push(path[i])
  }
  const full = path.length === p.w * p.h && new Set(path).size === path.length
  const linked = path.every((c, i) => i === 0 || adjacent(p.w, p.h, path[i - 1]).includes(c))
  return { ok: full && linked && path[0] === p.start && path[path.length - 1] === p.end && broken.length === 0, broken }
}

/**
 * Counts paths that obey the stones (stopping at `limit`), by depth-first search with pruning:
 * an unvisited square left with fewer than two ways in (one, for the end gate) can't be finished.
 */
export function countSolutions(p: { w: number; h: number; start: Cell; end: Cell; stones: Record<number, Stone> }, limit = 2): number {
  const { w, h, start, end, stones } = p
  const n = w * h
  const seen = new Uint8Array(n)
  const nb = Array.from({ length: n }, (_, c) => adjacent(w, h, c))
  const path: Cell[] = [start]
  seen[start] = 1
  let found = 0
  const freeDegree = (c: Cell, head: Cell) => nb[c].reduce((k, d) => k + (!seen[d] || d === head ? 1 : 0), 0)
  const dfs = (): void => {
    if (found >= limit) return
    const head = path[path.length - 1]
    if (path.length === n) { if (head === end) found++; return }
    if (head === end) return
    for (const next of nb[head]) {
      if (seen[next]) continue
      // The stone on the square we're leaving decides whether this step may turn.
      if (path.length >= 2) {
        const s = stones[head]
        if (s && (s === 'turn') !== turnsAt(w, path[path.length - 2], head, next)) continue
      }
      seen[next] = 1
      path.push(next)
      // Dead ends: an unvisited neighbour of the old head with no way left to be passed through.
      let dead = false
      for (const c of nb[head]) {
        if (seen[c] && c !== next) continue
        if (c === next) continue
        const need = c === end ? 1 : 2
        if (freeDegree(c, next) < need) { dead = true; break }
      }
      if (!dead) dfs()
      path.pop()
      seen[next] = 0
      if (found >= limit) return
    }
  }
  dfs()
  return found
}

/** Garden size by weekday: 5×5 Monday and Tuesday, 6×5 midweek, 6×6 Friday to Sunday. */
export function sizeFor(seed: string): [number, number] {
  const d = parseDateKey(seed)
  const dow = d ? (d.getDay() + 6) % 7 : 0
  return dow < 2 ? [5, 5] : dow < 4 ? [6, 5] : [6, 6]
}

/** A random path through every square (randomised depth-first search, fewest-exits first). */
function randomPath(w: number, h: number, r: () => number): Cell[] | null {
  const n = w * h
  const seen = new Uint8Array(n)
  const start = Math.floor(r() * n)
  const path = [start]
  seen[start] = 1
  let steps = 0
  const go = (): boolean => {
    if (path.length === n) return true
    if (++steps > 20000) return false
    const head = path[path.length - 1]
    const options = adjacent(w, h, head).filter((c) => !seen[c])
      .map((c) => ({ c, k: adjacent(w, h, c).filter((d) => !seen[d]).length + r() * 0.9 }))
      .sort((a, b) => a.k - b.k)
    for (const { c } of options) {
      seen[c] = 1
      path.push(c)
      if (go()) return true
      path.pop()
      seen[c] = 0
    }
    return false
  }
  return go() ? path : null
}

export function puzzleFor(seed: string): Puzzle {
  const r = seededRandom(`garden-path:${seed}`)
  const [w, h] = sizeFor(seed)
  for (;;) {
    const solution = randomPath(w, h, r)
    if (!solution) continue
    const start = solution[0], end = solution[solution.length - 1]
    // Every inner square's true stone; then take stones away while the answer stays unique.
    const stones: Record<number, Stone> = {}
    for (let i = 1; i < solution.length - 1; i++) stones[solution[i]] = turnsAt(w, solution[i - 1], solution[i], solution[i + 1]) ? 'turn' : 'straight'
    const order = Object.keys(stones).map(Number).sort(() => r() - 0.5)
    for (const c of order) {
      const s = stones[c]
      delete stones[c]
      if (countSolutions({ w, h, start, end, stones }) !== 1) stones[c] = s
    }
    return { w, h, start, end, stones, solution }
  }
}
