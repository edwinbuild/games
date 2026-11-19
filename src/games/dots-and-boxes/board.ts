// Dots & Boxes rules and computer players. Players take turns drawing one line between two
// neighbouring dots; whoever draws the fourth side of a box claims it and must draw again.
// When every line is drawn, the player with more boxes wins.
//
// Lines are numbered: horizontal lines first, row by row ((rows + 1) × cols of them), then
// vertical lines, row by row (rows × (cols + 1)). Boxes are numbered row by row.

export type Player = 0 | 1
export type State = {
  rows: number
  cols: number
  /** Who drew each line, or null if it isn't drawn yet. */
  lines: (Player | null)[]
  /** Who claimed each box, or null. */
  boxes: (Player | null)[]
  turn: Player
  /** The last line drawn (shown highlighted). */
  last: number | null
}
export type Level = 'easy' | 'medium' | 'hard'

type Geometry = { H: number; E: number; boxEdges: number[][]; edgeBoxes: number[][] }
const geometries = new Map<string, Geometry>()
export function geometry(rows: number, cols: number): Geometry {
  const key = `${rows}x${cols}`
  let g = geometries.get(key)
  if (g) return g
  const H = (rows + 1) * cols
  const E = H + rows * (cols + 1)
  const h = (r: number, c: number) => r * cols + c
  const v = (r: number, c: number) => H + r * (cols + 1) + c
  const boxEdges = Array.from({ length: rows * cols }, (_, b) => {
    const r = Math.floor(b / cols), c = b % cols
    return [h(r, c), h(r + 1, c), v(r, c), v(r, c + 1)]
  })
  const edgeBoxes: number[][] = Array.from({ length: E }, () => [])
  boxEdges.forEach((es, b) => es.forEach((e) => edgeBoxes[e].push(b)))
  g = { H, E, boxEdges, edgeBoxes }
  geometries.set(key, g)
  return g
}

/** Where a line runs: its two dots as [row, col]. */
export function lineEnds(rows: number, cols: number, e: number): [[number, number], [number, number]] {
  const { H } = geometry(rows, cols)
  if (e < H) { const r = Math.floor(e / cols), c = e % cols; return [[r, c], [r, c + 1]] }
  const k = e - H, r = Math.floor(k / (cols + 1)), c = k % (cols + 1)
  return [[r, c], [r + 1, c]]
}

export function newGame(rows: number, cols: number, first: Player = 0): State {
  const { E } = geometry(rows, cols)
  return { rows, cols, lines: Array(E).fill(null), boxes: Array(rows * cols).fill(null), turn: first, last: null }
}

/** Draws a line for the player whose turn it is. Returns the new state and how many boxes it claimed. */
export function play(s: State, e: number): { state: State; claimed: number } {
  if (s.lines[e] != null) return { state: s, claimed: 0 }
  const { boxEdges, edgeBoxes } = geometry(s.rows, s.cols)
  const lines = [...s.lines]
  lines[e] = s.turn
  const boxes = [...s.boxes]
  let claimed = 0
  for (const b of edgeBoxes[e]) if (boxEdges[b].every((x) => lines[x] != null)) { boxes[b] = s.turn; claimed++ }
  const turn: Player = claimed ? s.turn : s.turn === 0 ? 1 : 0
  return { state: { ...s, lines, boxes, turn, last: e }, claimed }
}

export const isOver = (s: State) => s.boxes.every((b) => b != null)
export const scores = (s: State): [number, number] => [s.boxes.filter((b) => b === 0).length, s.boxes.filter((b) => b === 1).length]

// ---------- Analysis on a plain "drawn" array (fast, no owners) ----------

type Drawn = Uint8Array
const sidesOf = (g: Geometry, d: Drawn, b: number) => g.boxEdges[b].reduce((k, e) => k + d[e], 0)

/** Lines that complete a box. */
export function capturesOf(g: Geometry, d: Drawn): number[] {
  const out: number[] = []
  for (let e = 0; e < g.E; e++) if (!d[e] && g.edgeBoxes[e].some((b) => sidesOf(g, d, b) === 3)) out.push(e)
  return out
}
/** Lines that give nothing away: no box ends up with three sides. */
export function safeOf(g: Geometry, d: Drawn): number[] {
  const out: number[] = []
  for (let e = 0; e < g.E; e++) if (!d[e] && g.edgeBoxes[e].every((b) => sidesOf(g, d, b) <= 1)) out.push(e)
  return out
}
/** Takes every box on offer, one after another; returns how many. Changes `d`. */
function takeAll(g: Geometry, d: Drawn): number {
  let n = 0
  for (;;) {
    const c = capturesOf(g, d)
    if (!c.length) return n
    const e = c[0]
    d[e] = 1
    n += g.edgeBoxes[e].filter((b) => sidesOf(g, d, b) === 4).length
  }
}
/** How many boxes a line hands to a greedy opponent. */
function giveaway(g: Geometry, d: Drawn, e: number): number {
  const x = d.slice()
  x[e] = 1
  return takeAll(g, x)
}

/**
 * The open boxes as chains and loops, once nothing is safe. Null if the position isn't that simple
 * (a box with three or four open sides joins several chains).
 */
export function components(g: Geometry, d: Drawn): { chains: number[]; loops: number[] } | null {
  const n = g.boxEdges.length
  const open = (b: number) => sidesOf(g, d, b) < 4
  const seen = new Uint8Array(n)
  const chains: number[] = [], loops: number[] = []
  for (let b0 = 0; b0 < n; b0++) {
    if (seen[b0] || !open(b0)) continue
    let size = 0, ground = 0
    const stack = [b0]
    seen[b0] = 1
    while (stack.length) {
      const b = stack.pop()!
      size++
      if (sidesOf(g, d, b) !== 2) return null
      for (const e of g.boxEdges[b]) {
        if (d[e]) continue
        const other = g.edgeBoxes[e].find((x) => x !== b)
        if (other == null) ground++
        else if (!seen[other]) { seen[other] = 1; stack.push(other) }
      }
    }
    if (ground === 0) loops.push(size)
    else chains.push(size)
  }
  return { chains, loops }
}

/**
 * What the player in control nets (boxes won minus boxes lost) when the other player must open one
 * of these chains or loops, both playing well. The controller can take a whole chain and lose
 * control, or take all but two (all but four of a loop) and hand those over to keep it.
 */
export function controlValue(chains: number[], loops: number[], memo = new Map<string, number>()): number {
  if (!chains.length && !loops.length) return 0
  const key = `${[...chains].sort((a, b) => a - b).join(',')}|${[...loops].sort((a, b) => a - b).join(',')}`
  const hit = memo.get(key)
  if (hit != null) return hit
  let best = Infinity
  const tried = new Set<string>()
  chains.forEach((c, i) => {
    if (tried.has(`c${c}`)) return
    tried.add(`c${c}`)
    const r = controlValue(chains.filter((_, j) => j !== i), loops, memo)
    // A chain of one or two can be opened so it can't be handed back (two: opened in the middle).
    best = Math.min(best, c <= 2 ? c - r : Math.max(c - r, c - 4 + r))
  })
  loops.forEach((l, i) => {
    if (tried.has(`l${l}`)) return
    tried.add(`l${l}`)
    const r = controlValue(chains, loops.filter((_, j) => j !== i), memo)
    best = Math.min(best, Math.max(l - r, l - 8 + r))
  })
  memo.set(key, best)
  return best
}

/** For the player who must open a chain: their net from here (negative: they lose that many more). */
function openerValue(g: Geometry, d: Drawn, memo: Map<string, number>): number {
  const comp = components(g, d)
  if (comp) return -controlValue(comp.chains, comp.loops, memo)
  // Not a simple position: assume the cheapest handout and nothing after.
  let least = Infinity
  for (let e = 0; e < g.E; e++) if (!d[e]) least = Math.min(least, giveaway(g, d, e))
  return -least
}

/** Plays out the last safe lines exactly: whoever runs out of safe lines first must open a chain. */
function safeSearch(g: Geometry, d: Drawn, memo: Map<string, number>, cv: Map<string, number>): number {
  const safe = safeOf(g, d)
  if (!safe.length) return openerValue(g, d, cv)
  const key = String.fromCharCode(...d)
  const hit = memo.get(key)
  if (hit != null) return hit
  let best = -Infinity
  for (const e of safe) {
    d[e] = 1
    best = Math.max(best, -safeSearch(g, d, memo, cv))
    d[e] = 0
  }
  memo.set(key, best)
  return best
}

/** The line to open when nothing is safe: the chain that costs least. */
function cheapestOpening(g: Geometry, d: Drawn, cv: Map<string, number>): number {
  const comp = components(g, d)
  const undrawn: number[] = []
  for (let e = 0; e < g.E; e++) if (!d[e]) undrawn.push(e)
  if (!comp) return undrawn.reduce((a, e) => (giveaway(g, d, e) < giveaway(g, d, a) ? e : a))
  // Try one line per box (a short chain opened in the middle keeps it from being handed back).
  let best = undrawn[0], bestVal = Infinity
  for (const e of undrawn) {
    const x = d.slice()
    x[e] = 1
    // The opponent now controls: they take what's on offer, then choose to keep control or not.
    const taken = takeAll(g, x)
    const rest = components(g, x)
    const r = rest ? controlValue(rest.chains, rest.loops, cv) : 0
    // Two boxes handed over as a pair can be given back (double-dealt) to keep control.
    const canHandBack = taken >= 2 && handsBackTwo(g, d, e)
    const val = Math.max(taken - r, canHandBack ? taken - 4 + r : -Infinity)
    if (val < bestVal) { bestVal = val; best = e }
  }
  return best
}
/** Whether opening line e offers a run the taker can stop two boxes short of. */
function handsBackTwo(g: Geometry, d: Drawn, e: number): boolean {
  const x = d.slice()
  x[e] = 1
  // Take boxes until only two remain on offer, then see if those two are a pair joined end to end.
  for (;;) {
    const total = takeAll(g, x.slice())
    if (total <= 2) return total === 2 && pairEnd(g, x) != null
    const c = capturesOf(g, x)
    x[c[0]] = 1
  }
}
/** If the only box on offer is the end of a two-box run, the line that hands both back. */
function pairEnd(g: Geometry, d: Drawn): number | null {
  const c = capturesOf(g, d)
  if (c.length !== 1) return null
  const e = c[0]
  const a = g.edgeBoxes[e].find((b) => sidesOf(g, d, b) === 3)!
  const next = g.edgeBoxes[e].find((b) => b !== a)
  if (next == null || sidesOf(g, d, next) !== 2) return null
  // The far side of the second box: its other open line.
  const far = g.boxEdges[next].find((x) => !d[x] && x !== e)
  if (far == null) return null
  const x = d.slice()
  x[e] = 1
  // Taking the first box offers only the second (and nothing after it).
  if (takeAll(g, x) !== 1) return null
  return far
}

const pick = <T,>(xs: T[], r: () => number) => xs[Math.floor(r() * xs.length)]

/**
 * The computer's line. Easy grabs most boxes on offer and otherwise plays anywhere. Medium takes
 * every box and never gives one away while a safe line is left. Hard also counts the safe lines
 * to the end so you are the one who must open the first long chain, and hands back the last two
 * boxes of a chain when keeping control is worth more.
 */
export function aiMove(s: State, level: Level, r: () => number = Math.random): number {
  const g = geometry(s.rows, s.cols)
  const d = Uint8Array.from(s.lines, (x) => (x == null ? 0 : 1))
  const caps = capturesOf(g, d)
  const safe = safeOf(g, d)
  const undrawn = s.lines.flatMap((x, e) => (x == null ? [e] : []))
  if (level === 'easy') {
    if (caps.length && r() < 0.65) return pick(caps, r)
    if (safe.length && r() < 0.5) return pick(safe, r)
    return pick(undrawn, r)
  }
  const cv = new Map<string, number>()
  if (caps.length) {
    if (level === 'hard') {
      // Hand back the last two boxes of a chain when keeping control is worth more than two boxes.
      const far = pairEnd(g, d)
      if (far != null) {
        const x = d.slice()
        takeAll(g, x)
        const rest = components(g, x)
        if (rest && safeOf(g, x).length === 0 && (rest.chains.length || rest.loops.length) && controlValue(rest.chains, rest.loops, cv) > 2) return far
      }
    }
    return caps[0]
  }
  if (safe.length) {
    if (level === 'hard' && safe.length <= 12) {
      const memo = new Map<string, number>()
      let best = safe[0], bestVal = -Infinity
      for (const e of safe) {
        d[e] = 1
        const v = -safeSearch(g, d, memo, cv)
        d[e] = 0
        if (v > bestVal || (v === bestVal && r() < 0.3)) { bestVal = v; best = e }
      }
      return best
    }
    return pick(safe, r)
  }
  return level === 'hard' ? cheapestOpening(g, d, cv) : undrawn.reduce((a, e) => (giveaway(g, d, e) < giveaway(g, d, a) ? e : a))
}
