import { seededRandom } from '../../shell/daily'

/** The board is W×H world units, seen from above. */
export const W = 300
export const H = 420
/** A falling domino can tip another whose centre is within this distance… */
export const REACH = 30
/** …and within this angle of the way it is falling (degrees)… */
export const CONE = 35
/** …as long as the hit is not too side-on to the other domino's face (|cos| of the angle). */
export const FACE = 0.5
/** Two dominoes can't stand closer than this. */
export const GAP = 11
/** Seconds for a domino to fall the full reach. */
export const FALL = 0.2
export const SPARES = 5
export const SPACING = 16

export type V = { x: number; y: number }
/** A standing domino: where it is, and which way its faces point (the axis it can fall along). */
export type Domino = { x: number; y: number; nx: number; ny: number; spare?: boolean }
export type Block = { x: number; y: number; w: number; h: number }
export type Fall = { i: number; t: number; dx: number; dy: number }

const unit = (x: number, y: number) => { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l } }

/** Whether the straight path from a to b passes through a block. */
export function blocked(a: V, b: V, blocks: Block[]): boolean {
  return blocks.some((r) => {
    // Sample the segment; blocks are big compared with the step.
    for (let s = 0; s <= 1; s += 0.05) {
      const x = a.x + (b.x - a.x) * s, y = a.y + (b.y - a.y) * s
      if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return true
    }
    return false
  })
}

/**
 * Which dominoes fall, when, and which way, after domino `first` is pushed along its facing.
 * Exact: each falls at the earliest time a falling neighbour reaches it.
 */
export function run(dominoes: Domino[], blocks: Block[], first = 0): Fall[] {
  const n = dominoes.length
  const time = new Array<number>(n).fill(Infinity)
  const dir: V[] = dominoes.map(() => ({ x: 0, y: 0 }))
  const done = new Array<boolean>(n).fill(false)
  time[first] = 0
  dir[first] = unit(dominoes[first].nx, dominoes[first].ny)
  const out: Fall[] = []
  const cone = Math.cos((CONE * Math.PI) / 180)
  for (;;) {
    let i = -1
    for (let k = 0; k < n; k++) if (!done[k] && time[k] < Infinity && (i < 0 || time[k] < time[i])) i = k
    if (i < 0) break
    done[i] = true
    out.push({ i, t: time[i], dx: dir[i].x, dy: dir[i].y })
    const a = dominoes[i]
    for (let j = 0; j < n; j++) {
      if (done[j]) continue
      const b = dominoes[j]
      const dist = Math.hypot(b.x - a.x, b.y - a.y)
      if (dist > REACH) continue
      const u = unit(b.x - a.x, b.y - a.y)
      if (u.x * dir[i].x + u.y * dir[i].y < cone) continue
      const nb = unit(b.nx, b.ny)
      const face = u.x * nb.x + u.y * nb.y
      if (Math.abs(face) < FACE) continue
      if (blocked(a, b, blocks)) continue
      const t = time[i] + FALL * (dist / REACH)
      if (t < time[j]) { time[j] = t; dir[j] = face > 0 ? nb : { x: -nb.x, y: -nb.y } }
    }
  }
  return out
}

/** Whether a new domino may stand at p: inside the board, clear of others and of blocks. */
export function canPlace(p: V, dominoes: Domino[], blocks: Block[], ignore = -1): boolean {
  if (p.x < 8 || p.y < 8 || p.x > W - 8 || p.y > H - 8) return false
  if (dominoes.some((d, i) => i !== ignore && Math.hypot(d.x - p.x, d.y - p.y) < GAP)) return false
  return !blocks.some((r) => p.x > r.x - 6 && p.x < r.x + r.w + 6 && p.y > r.y - 6 && p.y < r.y + r.h + 6)
}

/** A spare faces the same way as the dominoes standing nearest to it. */
export function autoFacing(p: V, dominoes: Domino[]): V {
  const near = dominoes.map((d) => ({ d, e: Math.hypot(d.x - p.x, d.y - p.y) })).sort((a, b) => a.e - b.e).slice(0, 2)
  if (!near.length) return { x: 1, y: 0 }
  // Line the faces up with the line through the two nearest, or copy the nearest one.
  let f = near.length > 1 ? unit(near[1].d.x - near[0].d.x, near[1].d.y - near[0].d.y) : unit(near[0].d.nx, near[0].d.ny)
  const ref = unit(near[0].d.nx, near[0].d.ny)
  if (f.x * ref.x + f.y * ref.y < 0) f = { x: -f.x, y: -f.y }
  return f
}

export type Board = { dominoes: Domino[]; blocks: Block[]; gaps: V[] }

/**
 * The day's board: a winding line of dominoes with five gaps (two missing in a row), each fixable
 * by one spare in the middle, and a few blocks off to the side.
 */
export function boardFor(seed: string): Board {
  for (let attempt = 0; ; attempt++) {
    const r = seededRandom(`domino-drop:${seed}:${attempt}`)
    const pts: V[] = [{ x: 30, y: H - 40 }]
    let heading = -Math.PI / 2 + (r() - 0.5) * 0.6
    let ok = true
    for (let k = 1; k < 45 && ok; k++) {
      heading += (r() - 0.5) * 0.42 // at most about 12° per step
      const prev = pts[k - 1]
      // Steer away from the walls.
      const ahead = { x: prev.x + Math.cos(heading) * 40, y: prev.y + Math.sin(heading) * 40 }
      if (ahead.x < 24 || ahead.x > W - 24 || ahead.y < 24 || ahead.y > H - 24) heading += 0.21 * (r() < 0.5 ? 1 : 1)
      const p = { x: prev.x + Math.cos(heading) * SPACING, y: prev.y + Math.sin(heading) * SPACING }
      if (p.x < 16 || p.x > W - 16 || p.y < 16 || p.y > H - 16) { ok = false; break }
      if (pts.slice(0, -2).some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 34)) { ok = false; break }
      pts.push(p)
    }
    if (!ok || pts.length < 45) continue
    const all: Domino[] = pts.map((p, k) => {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)]
      const n = unit(b.x - a.x, b.y - a.y)
      return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, nx: n.x, ny: n.y }
    })
    // Five gaps, spread along the line: remove two in a row at each.
    const starts = [6, 13, 21, 29, 37].map((s) => s + Math.floor(r() * 3))
    const gone = new Set(starts.flatMap((s) => [s, s + 1]))
    const gaps = starts.map((s) => ({ x: (all[s].x + all[s + 1].x) / 2, y: (all[s].y + all[s + 1].y) / 2 }))
    const dominoes = all.filter((_, k) => !gone.has(k))
    // A few blocks, well clear of the line.
    const blocks: Block[] = []
    for (let tries = 0; tries < 60 && blocks.length < 3; tries++) {
      const b = { x: 20 + r() * (W - 70), y: 20 + r() * (H - 70), w: 26 + r() * 18, h: 14 + r() * 10 }
      const clear = all.every((p) => p.x < b.x - 22 || p.x > b.x + b.w + 22 || p.y < b.y - 22 || p.y > b.y + b.h + 22)
      if (clear) blocks.push(b)
    }
    return { dominoes, blocks, gaps }
  }
}

/** How many fall: the score. */
export const fallen = (dominoes: Domino[], blocks: Block[]) => run(dominoes, blocks).length
