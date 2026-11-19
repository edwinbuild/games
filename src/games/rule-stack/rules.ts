// Rule Stack rules: colour a 4×4 grid so every rule so far holds. Each level adds a rule, which
// may break your last answer. The day's twelve rules all hold for one hidden grid, so every
// level can be cleared; there are usually many answers.
import { seededRandom } from '../../shell/daily'

export const N = 4
export const COLOURS = ['red', 'blue', 'green', 'yellow'] as const
export type Colour = 0 | 1 | 2 | 3
/** A grid: 16 squares, each a colour or empty (null). */
export type Grid = (Colour | null)[]
export const LEVELS = 12

export type Rule = { id: string; text: string; holds: (g: Grid) => boolean }

const rc = (i: number) => [Math.floor(i / N), i % N] as const
const at = (g: Grid, r: number, c: number) => (r >= 0 && r < N && c >= 0 && c < N ? g[r * N + c] : undefined)
const around = (g: Grid, i: number) => { const [r, c] = rc(i); return [at(g, r - 1, c), at(g, r + 1, c), at(g, r, c - 1), at(g, r, c + 1)] }
const rows = (g: Grid) => Array.from({ length: N }, (_, r) => g.slice(r * N, r * N + N))
const cols = (g: Grid) => Array.from({ length: N }, (_, c) => Array.from({ length: N }, (_, r) => g[r * N + c]))
const quarters = (g: Grid) => [[0, 1, 4, 5], [2, 3, 6, 7], [8, 9, 12, 13], [10, 11, 14, 15]].map((q) => q.map((i) => g[i]))
const corners = (g: Grid) => [g[0], g[3], g[12], g[15]]
const name = (c: Colour) => COLOURS[c]
const full = (g: Grid) => g.every((x) => x != null)
const howMany = (g: Grid, c: Colour) => g.filter((x) => x === c).length

/** Every rule the game knows, for every colour. Rules about counts need the grid filled. */
export function allRules(): Rule[] {
  const out: Rule[] = []
  const cs: Colour[] = [0, 1, 2, 3]
  for (const c of cs) {
    out.push({ id: `apart-${c}`, text: `No two ${name(c)} squares touch side by side`, holds: (g) => g.every((x, i) => x !== c || !around(g, i).includes(c)) })
    out.push({ id: `rows-${c}`, text: `Every row has a ${name(c)} square`, holds: (g) => rows(g).every((r) => r.includes(c)) })
    out.push({ id: `cols-${c}`, text: `Every column has a ${name(c)} square`, holds: (g) => cols(g).every((r) => r.includes(c)) })
    out.push({ id: `quarters-${c}`, text: `Every quarter of the grid has a ${name(c)} square`, holds: (g) => quarters(g).every((q) => q.includes(c)) })
    out.push({ id: `notop-${c}`, text: `No ${name(c)} in the top row`, holds: (g) => full(g) && !rows(g)[0].includes(c) })
    out.push({ id: `noedge-${c}`, text: `No ${name(c)} in a corner`, holds: (g) => full(g) && !corners(g).includes(c) })
    for (const k of [3, 4, 5]) out.push({ id: `exactly-${c}-${k}`, text: `Exactly ${k} ${name(c)} squares`, holds: (g) => full(g) && howMany(g, c) === k })
    for (const d of cs) if (d !== c) {
      out.push({ id: `more-${c}-${d}`, text: `More ${name(c)} squares than ${name(d)}`, holds: (g) => full(g) && howMany(g, c) > howMany(g, d) })
      out.push({ id: `next-${c}-${d}`, text: `Every ${name(c)} square touches a ${name(d)} square`, holds: (g) => g.every((x, i) => x !== c || around(g, i).includes(d)) })
    }
  }
  out.push({ id: 'corners-diff', text: 'The four corners are all different colours', holds: (g) => full(g) && new Set(corners(g)).size === 4 })
  out.push({ id: 'corners-same', text: 'The four corners are all the same colour', holds: (g) => full(g) && new Set(corners(g)).size === 1 })
  out.push({ id: 'diag', text: 'The diagonal from top left to bottom right has no repeated colour', holds: (g) => full(g) && new Set([g[0], g[5], g[10], g[15]]).size === 4 })
  out.push({ id: 'row-mixed', text: 'No row is all one colour', holds: (g) => full(g) && rows(g).every((r) => new Set(r).size > 1) })
  out.push({ id: 'all-four', text: 'All four colours are used', holds: (g) => new Set(g.filter((x) => x != null)).size === 4 })
  out.push({ id: 'full', text: 'Every square is coloured', holds: full })
  return out
}

/**
 * The day's twelve rules, in the order they arrive. They all hold for one hidden grid (so every
 * level can be cleared), and each rule is a different kind from the others.
 */
export function rulesFor(seed: string, tryIndex = 0): { rules: Rule[]; hidden: Grid } {
  const r = seededRandom(`rule-stack:${seed}${tryIndex ? `:try${tryIndex}` : ''}`)
  const all = allRules()
  for (;;) {
    const hidden: Grid = Array.from({ length: N * N }, () => Math.floor(r() * 4) as Colour)
    const holds = all.filter((rule) => rule.holds(hidden))
    // One rule per kind (the id up to its first dash), so the day isn't five count rules.
    const byKind = new Map<string, Rule[]>()
    for (const rule of holds) { const k = rule.id.split('-')[0]; if (k !== 'full') byKind.set(k, [...(byKind.get(k) ?? []), rule]) }
    if (byKind.size < LEVELS - 1) continue
    const kinds = [...byKind.keys()].sort(() => r() - 0.5).slice(0, LEVELS - 1)
    const picked = kinds.map((k) => { const list = byKind.get(k)!; return list[Math.floor(r() * list.length)] })
    // "Every square is coloured" comes first, so the rest are about a full grid.
    return { rules: [all.find((x) => x.id === 'full')!, ...picked], hidden }
  }
}

/** How many of the first `level` rules a grid satisfies, and which fail. */
export function judge(rules: Rule[], level: number, g: Grid): { ok: boolean; failing: number[] } {
  const failing = rules.slice(0, level).map((x, i) => (x.holds(g) ? -1 : i)).filter((i) => i >= 0)
  return { ok: failing.length === 0, failing }
}
