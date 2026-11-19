import { seededRandom } from '../../shell/daily'

export const N = 6
/** Openings as bits: north 1, east 2, south 4, west 8. */
export const NORTH = 1, EAST = 2, SOUTH = 4, WEST = 8
const DIRS = [[NORTH, -1, 0, SOUTH], [EAST, 0, 1, WEST], [SOUTH, 1, 0, NORTH], [WEST, 0, -1, EAST]] as const

/** Turns a piece a quarter turn clockwise, `k` times. */
export function turn(mask: number, k = 1): number {
  let m = mask
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15
  return m
}
const bits = (m: number) => [1, 2, 4, 8].filter((b) => m & b).length
/** The fewest clockwise quarter turns that take `from` to `to` (or -1 if no turning can). */
export function turnsBetween(from: number, to: number): number {
  for (let k = 0; k < 4; k++) if (turn(from, k) === to) return k
  return -1
}

export type Board = { pieces: number[]; source: number; sink: number; solution: number[]; par: number }

/** Cells reached by water: it enters the source cell from the west and runs through matching openings. */
export function flow(pieces: number[], source: number): Set<number> {
  const seen = new Set<number>()
  if (!(pieces[source] & WEST)) return seen
  const queue = [source]
  seen.add(source)
  while (queue.length) {
    const i = queue.shift()!
    const r = Math.floor(i / N), c = i % N
    for (const [d, dr, dc, back] of DIRS) {
      if (!(pieces[i] & d)) continue
      const rr = r + dr, cc = c + dc
      if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue
      const j = rr * N + cc
      if (!seen.has(j) && pieces[j] & back) { seen.add(j); queue.push(j) }
    }
  }
  return seen
}
/** Solved when water reaches the sink cell and that cell opens east, to the plant. */
export const solved = (pieces: number[], source: number, sink: number) => !!(pieces[sink] & EAST) && flow(pieces, source).has(sink)

/** The day's board: a winding path from the tap (west of the source) to the plant (east of the sink), decoys elsewhere, all scrambled. */
export function boardFor(seed: string): Board {
  for (let attempt = 0; ; attempt++) {
    const r = seededRandom(`pipe-turn:${seed}:${attempt}`)
    const source = Math.floor(r() * N) * N, sinkRow = Math.floor(r() * N), sink = sinkRow * N + N - 1
    // Random self-avoiding walk to the sink.
    const path = [source]
    const visited = new Set(path)
    const walk = (i: number): boolean => {
      if (i === sink) return true
      const r0 = Math.floor(i / N), c0 = i % N
      const opts = DIRS.map(([, dr, dc]) => [r0 + dr, c0 + dc]).filter(([a, b]) => a >= 0 && a < N && b >= 0 && b < N).map(([a, b]) => a * N + b).filter((j) => !visited.has(j))
      opts.sort(() => r() - 0.5)
      for (const j of opts) {
        visited.add(j); path.push(j)
        if (path.length < 18 && walk(j)) return true
        visited.delete(j); path.pop()
      }
      return false
    }
    if (!walk(source) || path.length < 9) continue
    const solution = new Array<number>(N * N).fill(0)
    path.forEach((i, k) => {
      const dirTo = (a: number, b: number) => (b === a - N ? NORTH : b === a + 1 ? EAST : b === a + N ? SOUTH : WEST)
      const into = k === 0 ? WEST : dirTo(i, path[k - 1])
      const out = k === path.length - 1 ? EAST : dirTo(i, path[k + 1])
      solution[i] = into | out
    })
    // Decoys: straights, corners and tees.
    const decoys = [5, 10, 3, 6, 12, 9, 7, 14, 13, 11]
    for (let i = 0; i < N * N; i++) if (!solution[i]) solution[i] = decoys[Math.floor(r() * decoys.length)]
    const pieces = solution.map((m) => turn(m, Math.floor(r() * 4)))
    const onPath = new Set(path)
    const par = path.reduce((s, i) => s + turnsBetween(pieces[i], solution[i]), 0)
    if (par < 6 || solved(pieces, source, sink)) continue
    // Only the path's pieces matter for par; decoys are kept as they are.
    for (let i = 0; i < N * N; i++) if (!onPath.has(i)) solution[i] = pieces[i]
    return { pieces, source, sink, solution, par }
  }
}

export { bits }
