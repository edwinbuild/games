import { seededRandom } from '../../shell/daily'

export const N = 7
export const MAX_MIRRORS = 3
/** Cell contents. Mirrors: '/' and '\\'. */
export type Cell = '' | 'laser' | 'target' | 'wall' | '/' | '\\'
export type Board = { cells: Cell[]; laser: number; par: number; solution: Record<number, '/' | '\\'> }

const at = (r: number, c: number) => r * N + c
/** Direction after a mirror, with y pointing down. */
export function bounce(m: '/' | '\\', dx: number, dy: number): [number, number] {
  return m === '/' ? [-dy, -dx] : [dy, dx]
}

/** The beam's path from the laser (heading east), as cell indexes, and which targets it lights. */
export function trace(cells: Cell[], laser: number): { path: number[]; lit: Set<number>; end: 'edge' | 'wall' | 'loop' } {
  let r = Math.floor(laser / N), c = laser % N, dx = 1, dy = 0
  const path = [laser], lit = new Set<number>(), seen = new Set<string>()
  for (let step = 0; step < 400; step++) {
    r += dy; c += dx
    if (r < 0 || r >= N || c < 0 || c >= N) return { path, lit, end: 'edge' }
    const i = at(r, c), cell = cells[i]
    if (cell === 'wall' || cell === 'laser') return { path, lit, end: 'wall' }
    const key = `${i}:${dx}:${dy}`
    if (seen.has(key)) return { path, lit, end: 'loop' }
    seen.add(key)
    path.push(i)
    if (cell === 'target') lit.add(i)
    if (cell === '/' || cell === '\\') [dx, dy] = bounce(cell, dx, dy)
  }
  return { path, lit, end: 'loop' }
}

export const targets = (cells: Cell[]) => cells.flatMap((c, i) => (c === 'target' ? [i] : []))
export const allLit = (cells: Cell[], laser: number) => { const t = targets(cells); const { lit } = trace(cells, laser); return t.every((i) => lit.has(i)) }

/** Whether the board can be solved with at most `k` mirrors (exhaustive). */
export function solvableWith(cells: Cell[], laser: number, k: number): boolean {
  const free = cells.flatMap((c, i) => (c === '' ? [i] : []))
  const go = (from: number, left: number, b: Cell[]): boolean => {
    if (allLit(b, laser)) return true
    if (left === 0) return false
    // Only cells on the current beam can usefully take the next mirror.
    const onBeam = new Set(trace(b, laser).path)
    for (const i of free) {
      if (i < from && !onBeam.has(i)) continue
      if (!onBeam.has(i) || b[i] !== '') continue
      for (const m of ['/', '\\'] as const) {
        const nb = b.slice(); nb[i] = m
        if (go(0, left - 1, nb)) return true
      }
    }
    return false
  }
  return go(0, k, cells.slice())
}

/** The day's board: built backwards from a beam with 2 or 3 mirrors; par is proven minimal. */
export function boardFor(seed: string): Board {
  for (let attempt = 0; ; attempt++) {
    const r = seededRandom(`light-path:${seed}:${attempt}`)
    const k = r() < 0.5 ? 2 : 3
    const cells: Cell[] = new Array(N * N).fill('')
    const lr = 1 + Math.floor(r() * (N - 2))
    const laser = at(lr, 0)
    cells[laser] = 'laser'
    let row = lr, col = 0, dx = 1, dy = 0
    const used = new Set([laser])
    const segments: number[][] = [[]]
    const solution: Record<number, '/' | '\\'> = {}
    let ok = true
    for (let m = 0; m <= k && ok; m++) {
      const run = m === k ? 99 : 1 + Math.floor(r() * 4)
      for (let s = 0; s < run; s++) {
        const nr = row + dy, nc = col + dx
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) { if (m < k) ok = false; break }
        if (used.has(at(nr, nc))) { ok = false; break }
        row = nr; col = nc; used.add(at(row, col)); segments[segments.length - 1].push(at(row, col))
      }
      if (!ok || m === k) break
      // Put a mirror on the last cell of this run, turning left or right.
      const cell = at(row, col)
      const mirror: '/' | '\\' = r() < 0.5 ? '/' : '\\'
      solution[cell] = mirror
      ;[dx, dy] = bounce(mirror, dx, dy)
      segments[segments.length - 1].pop()
      segments.push([])
    }
    if (!ok || segments.some((s, i) => i > 0 && s.length === 0)) continue
    // A target on each segment after a mirror.
    for (let s = 1; s < segments.length; s++) {
      const seg = segments[s]
      cells[seg[Math.floor(r() * seg.length)]] = 'target'
    }
    // Walls off the beam.
    const off = cells.flatMap((c, i) => (c === '' && !used.has(i) ? [i] : []))
    for (let w = 0; w < 5 && off.length; w++) cells[off.splice(Math.floor(r() * off.length), 1)[0]] = 'wall'
    // The intended solution must work, and nothing simpler may.
    const solved = cells.slice()
    for (const [i, m] of Object.entries(solution)) solved[+i] = m
    if (!allLit(solved, laser)) continue
    if (solvableWith(cells, laser, k - 1)) continue
    return { cells, laser, par: k, solution }
  }
}
