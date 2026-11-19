// Untangle Lights rules: lights joined by wires. Drag the lights until no two wires cross.
// Each day's graph is built from a layout with no crossings (so it can always be untangled),
// then the lights are scrambled round a circle, which tangles almost every wire.
import { parseDateKey, seededRandom } from '../../shell/daily'

export type P = { x: number; y: number }
export type Edge = [number, number]
export type Graph = { n: number; edges: Edge[]; start: P[]; solved: P[]; par: number }

/** The board is SIZE × SIZE; lights stay MARGIN from the edge. */
export const SIZE = 320
export const MARGIN = 18

const cross = (o: P, a: P, b: P) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
/** Whether segments ab and cd properly cross (sharing an end doesn't count). */
export function segmentsCross(a: P, b: P, c: P, d: P): boolean {
  const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d)
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

/** Every pair of wires that cross (wires sharing a light never count). */
export function crossings(edges: Edge[], pos: P[]): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const [a, b] = edges[i], [c, d] = edges[j]
      if (a === c || a === d || b === c || b === d) continue
      if (segmentsCross(pos[a], pos[b], pos[c], pos[d])) out.push([i, j])
    }
  }
  return out
}

/** Lights a day: 8 on Monday up to 12 on Sunday. */
export function lightsFor(seed: string): number {
  const d = parseDateKey(seed)
  const dow = d ? (d.getDay() + 6) % 7 : 0 // Monday 0 … Sunday 6
  return 8 + Math.round((dow * 4) / 6)
}

export function graphFor(seed: string): Graph {
  const r = seededRandom(`untangle-lights:${seed}`)
  const n = lightsFor(seed)
  for (;;) {
    // A planar layout: lights scattered with space between them, then wires added between near
    // neighbours whenever they don't cross a wire already there.
    const solved: P[] = []
    while (solved.length < n) {
      const p = { x: MARGIN + 20 + r() * (SIZE - 2 * MARGIN - 40), y: MARGIN + 20 + r() * (SIZE - 2 * MARGIN - 40) }
      if (solved.every((q) => Math.hypot(p.x - q.x, p.y - q.y) > 62)) solved.push(p)
    }
    const pairs: Edge[] = []
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j])
    pairs.sort((a, b) => Math.hypot(solved[a[0]].x - solved[a[1]].x, solved[a[0]].y - solved[a[1]].y) - Math.hypot(solved[b[0]].x - solved[b[1]].x, solved[b[0]].y - solved[b[1]].y))
    const edges: Edge[] = []
    const degree = Array(n).fill(0)
    for (const [a, b] of pairs) {
      if (degree[a] >= 4 || degree[b] >= 4) continue
      if (edges.some(([c, d]) => a !== c && a !== d && b !== c && b !== d && segmentsCross(solved[a], solved[b], solved[c], solved[d]))) continue
      edges.push([a, b])
      degree[a]++
      degree[b]++
    }
    // Every light needs at least two wires, or it's trivially placed.
    if (degree.some((d) => d < 2)) continue
    // Scramble: the lights in random order round a circle.
    const order = Array.from({ length: n }, (_, i) => i).sort(() => r() - 0.5)
    const start: P[] = Array(n)
    order.forEach((light, k) => {
      const a = (k / n) * Math.PI * 2 - Math.PI / 2
      start[light] = { x: SIZE / 2 + Math.cos(a) * (SIZE / 2 - MARGIN - 14), y: SIZE / 2 + Math.sin(a) * (SIZE / 2 - MARGIN - 14) }
    })
    if (crossings(edges, start).length < n) continue
    // Par: moving every light once always works (to its untangled spot); good players move fewer.
    return { n, edges, start, solved, par: n }
  }
}

/** Keeps a dragged light on the board. */
export const clampToBoard = (p: P): P => ({ x: Math.max(MARGIN, Math.min(SIZE - MARGIN, p.x)), y: Math.max(MARGIN, Math.min(SIZE - MARGIN, p.y)) })
