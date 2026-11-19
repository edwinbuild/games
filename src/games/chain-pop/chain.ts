import { seededRandom } from '../../shell/daily'

/** The board is W×H world units. */
export const W = 300
export const H = 400
export const COUNT = 60
/** Rings grow at this speed (units per second). */
export const RING_SPEED = 170
/** A bubble waits this long after being reached before it pops and sends its own ring. */
export const POP_DELAY = 0.07

export type Size = 0 | 1 | 2
export const RADIUS: Record<Size, number> = { 0: 9, 1: 13, 2: 18 }
/** How far each size's ring reaches from the bubble's centre. */
export const REACH: Record<Size, number> = { 0: 24, 1: 32, 2: 46 }

export type Bubble = { x: number; y: number; size: Size }
export type Pop = { i: number; t: number; from: number | null }

/**
 * Which bubbles pop, and when, if bubble `start` is tapped at time 0. Exact and frame-rate
 * independent: a bubble pops at the earliest time any popped bubble's ring reaches its edge.
 */
export function chain(board: Bubble[], start: number): Pop[] {
  const n = board.length
  const time = new Array<number>(n).fill(Infinity)
  const from = new Array<number | null>(n).fill(null)
  const done = new Array<boolean>(n).fill(false)
  time[start] = 0
  const out: Pop[] = []
  for (;;) {
    let i = -1
    for (let k = 0; k < n; k++) if (!done[k] && time[k] < Infinity && (i < 0 || time[k] < time[i])) i = k
    if (i < 0) break
    done[i] = true
    out.push({ i, t: time[i], from: from[i] })
    const a = board[i]
    for (let j = 0; j < n; j++) {
      if (done[j]) continue
      const b = board[j]
      const gap = Math.hypot(a.x - b.x, a.y - b.y) - RADIUS[b.size]
      if (gap > REACH[a.size]) continue
      const t = time[i] + POP_DELAY + Math.max(0, gap) / RING_SPEED
      if (t < time[j]) { time[j] = t; from[j] = i }
    }
  }
  return out
}

/** The best single tap on a board: its bubble and how many it pops. */
export function bestTap(board: Bubble[]): { i: number; popped: number } {
  let best = { i: 0, popped: 0 }
  for (let i = 0; i < board.length; i++) {
    const popped = chain(board, i).length
    if (popped > best.popped) best = { i, popped }
  }
  return best
}

function place(r: () => number): Bubble[] {
  const out: Bubble[] = []
  let guard = 0
  while (out.length < COUNT && guard++ < 20000) {
    const roll = r()
    const size: Size = roll < 0.5 ? 0 : roll < 0.85 ? 1 : 2
    const rad = RADIUS[size]
    const x = rad + 6 + r() * (W - 2 * rad - 12)
    const y = rad + 6 + r() * (H - 2 * rad - 12)
    if (out.every((b) => Math.hypot(b.x - x, b.y - y) >= RADIUS[b.size] + rad + 4)) out.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, size })
  }
  return out
}

/**
 * The day's board: the same for everyone. Boards are re-rolled until the best tap pops at least
 * half of them but no tap clears the whole board.
 */
export function boardFor(seed: string): Bubble[] {
  for (let attempt = 0; ; attempt++) {
    const board = place(seededRandom(`chain-pop:${seed}:${attempt}`))
    if (board.length < COUNT) continue
    const best = bestTap(board).popped
    if (best >= COUNT / 2 && best < COUNT) return board
  }
}

/** The bubble under a point, allowing a little extra room for fingers. */
export function bubbleAt(board: Bubble[], x: number, y: number, slack = 8): number {
  let hit = -1, d = Infinity
  board.forEach((b, i) => {
    const e = Math.hypot(b.x - x, b.y - y) - RADIUS[b.size]
    if (e <= slack && e < d) { hit = i; d = e }
  })
  return hit
}
