import { seededRandom } from '../../shell/daily'

/** The board is W×H world units: the organiser on top, the clutter below. */
export const W = 320
export const H = 520
export const CELL = 72
export const COLS = 4
export const ROWS = 3
/** Organiser cells start here. */
export const ORG = { x: (W - COLS * CELL) / 2, y: 20 }
/** The clutter area. */
export const MESS = { x: 10, y: ORG.y + ROWS * CELL + 34, w: W - 20, h: H - (ORG.y + ROWS * CELL + 34) - 10 }
/** A drop within this distance of a slot's centre lands in that slot. */
export const SNAP = 26
/** Seconds added for each item dropped in a slot that isn't its own. */
export const PENALTY = 2

export type Kind = 'coin' | 'button' | 'battery' | 'pencil' | 'key' | 'heart' | 'star' | 'leaf' | 'bolt' | 'eraser' | 'clip' | 'moon'
/** How many quarter turns look the same: 4 = any way round, 2 = upside down is fine, 1 = only one way. */
export const SYMMETRY: Record<Kind, 1 | 2 | 4> = { coin: 4, button: 4, battery: 1, pencil: 1, key: 1, heart: 1, star: 1, leaf: 1, bolt: 1, eraser: 2, clip: 1, moon: 1 }
export const KINDS = Object.keys(SYMMETRY) as Kind[]
export const NAMES: Record<Kind, string> = { coin: 'Coin', button: 'Button', battery: 'Battery', pencil: 'Pencil', key: 'Key', heart: 'Heart', star: 'Star', leaf: 'Leaf', bolt: 'Bolt', eraser: 'Eraser', clip: 'Paper clip', moon: 'Moon' }

export type Slot = { kind: Kind; x: number; y: number; turns: number }
export type Item = { kind: Kind; x: number; y: number; turns: number }

/** Whether two rotations (in quarter turns) look the same for this kind. */
export function sameWay(kind: Kind, a: number, b: number): boolean {
  const step = 4 / SYMMETRY[kind]
  return (((a - b) % step) + step) % step === 0
}

export type Drop = { result: 'snap'; slot: number } | { result: 'wrong-way'; slot: number } | { result: 'wrong-slot'; slot: number } | { result: 'free' }

/** What happens when an item is let go at (x, y) turned `turns`, given which slots are already filled. */
export function judge(kind: Kind, x: number, y: number, turns: number, slots: Slot[], filled: boolean[]): Drop {
  let best = -1, d = Infinity
  slots.forEach((s, i) => {
    const e = Math.hypot(s.x - x, s.y - y)
    if (!filled[i] && e <= SNAP && e < d) { best = i; d = e }
  })
  if (best < 0) return { result: 'free' }
  const s = slots[best]
  if (s.kind !== kind) return { result: 'wrong-slot', slot: best }
  return sameWay(kind, s.turns, turns) ? { result: 'snap', slot: best } : { result: 'wrong-way', slot: best }
}

/** A board from a seed: each kind gets a slot (turned to fit) and starts somewhere in the mess, turned at random. */
export function boardFor(seed: string): { slots: Slot[]; items: Item[] } {
  const r = seededRandom(`tidy-up:${seed}`)
  const kinds = [...KINDS]
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[kinds[i], kinds[j]] = [kinds[j], kinds[i]]
  }
  const slots = kinds.map((kind, i) => ({
    kind,
    x: ORG.x + (i % COLS) * CELL + CELL / 2,
    y: ORG.y + Math.floor(i / COLS) * CELL + CELL / 2,
    turns: Math.floor(r() * 4),
  }))
  const order = [...kinds]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  // Spread the mess over a loose grid with jitter, so every item can be grabbed.
  const cols = 4, rows = Math.ceil(order.length / cols)
  const items = order.map((kind, i) => {
    const cx = MESS.x + ((i % cols) + 0.5) * (MESS.w / cols) + (r() - 0.5) * 22
    const cy = MESS.y + (Math.floor(i / cols) + 0.5) * (MESS.h / rows) + (r() - 0.5) * 18
    const slot = slots.find((s) => s.kind === kind)!
    // Never start already the right way round, unless every way round is right.
    let turns = Math.floor(r() * 4)
    if (SYMMETRY[kind] < 4 && sameWay(kind, turns, slot.turns)) turns = (turns + 1) % 4
    return { kind, x: Math.round(cx), y: Math.round(cy), turns }
  })
  return { slots, items }
}

/** Final time: seconds taken plus the penalty for wrong-slot drops, to 0.1 s. */
export const finalTime = (seconds: number, wrong: number) => Math.round((seconds + wrong * PENALTY) * 10) / 10
