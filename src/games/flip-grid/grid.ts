import { seededRandom } from '../../shell/daily'

export const N = 5
export type Grid = boolean[] // true = dark, row by row

/** Flips a tile and its four neighbours. */
export function flip(g: Grid, i: number): Grid {
  const r = Math.floor(i / N), c = i % N
  const out = [...g]
  for (const [dr, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const rr = r + dr, cc = c + dc
    if (rr >= 0 && rr < N && cc >= 0 && cc < N) out[rr * N + cc] = !out[rr * N + cc]
  }
  return out
}

export const solved = (g: Grid) => g.every((x) => !x)

/** Today's puzzle: a solved grid scrambled with 6–10 distinct seeded taps. */
export function puzzleFor(seed: string): Grid {
  const r = seededRandom(`flip-grid:${seed}`)
  const taps = 6 + Math.floor(r() * 5)
  const cells = Array.from({ length: N * N }, (_, i) => i)
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }
  let g: Grid = Array(N * N).fill(false)
  for (const i of cells.slice(0, taps)) g = flip(g, i)
  return solved(g) ? flip(g, 12) : g
}

/**
 * The fewest taps that clear `g`, by solving the flip equations over GF(2).
 * A 5×5 grid has a two-dimensional null space, so there are four solutions; we keep the shortest.
 */
export function shortestSolution(g: Grid): number[] | null {
  const n = N * N
  const rows = Array.from({ length: n }, (_, cell) => {
    const row = Array(n + 1).fill(0)
    for (let tap = 0; tap < n; tap++) if (flip(Array(n).fill(false), tap)[cell]) row[tap] = 1
    row[n] = g[cell] ? 1 : 0
    return row
  })
  const pivots: number[] = []
  let r = 0
  for (let col = 0; col < n && r < n; col++) {
    const p = rows.findIndex((row, i) => i >= r && row[col] === 1)
    if (p < 0) continue
    ;[rows[r], rows[p]] = [rows[p], rows[r]]
    for (let i = 0; i < n; i++) if (i !== r && rows[i][col]) for (let k = col; k <= n; k++) rows[i][k] ^= rows[r][k]
    pivots.push(col)
    r++
  }
  for (let i = r; i < n; i++) if (rows[i][n]) return null // unsolvable
  const free = Array.from({ length: n }, (_, c) => c).filter((c) => !pivots.includes(c))
  let best: number[] | null = null
  for (let mask = 0; mask < 1 << free.length; mask++) {
    const x = Array(n).fill(0)
    free.forEach((c, k) => (x[c] = (mask >> k) & 1))
    pivots.forEach((col, i) => {
      let v = rows[i][n]
      for (const c of free) v ^= rows[i][c] & x[c]
      x[col] = v
    })
    const taps = x.flatMap((v, i) => (v ? [i] : []))
    if (!best || taps.length < best.length) best = taps
  }
  return best
}
