// Word Ladder rules: change the start word into the end word one letter at a time; every step
// must be a word from the list. Par is the shortest ladder.
import { parseDateKey, seededRandom } from '../../shell/daily'
import { WORDS } from './words'

const SET = new Set(WORDS)
export const isWord = (w: string) => SET.has(w)
/** True if b is a real word that differs from a in exactly one letter. */
export function canStep(a: string, b: string): boolean {
  if (!isWord(b) || a.length !== b.length || a === b) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++
  return diff === 1
}

let graph: Map<string, string[]> | null = null
/** Every word's one-letter neighbours (built once, on first use). */
export function neighbours(w: string): string[] {
  if (!graph) {
    graph = new Map(WORDS.map((x) => [x, [] as string[]]))
    // Bucket by pattern ("c_ld" groups cold, card…): fast even for a big list.
    const buckets = new Map<string, string[]>()
    for (const x of WORDS) for (let i = 0; i < 4; i++) {
      const k = x.slice(0, i) + '_' + x.slice(i + 1)
      const b = buckets.get(k)
      if (b) b.push(x); else buckets.set(k, [x])
    }
    for (const b of buckets.values()) for (const x of b) for (const y of b) if (x !== y) graph.get(x)!.push(y)
  }
  return graph.get(w) ?? []
}

/** The shortest ladder from a to b (both included), or null if there is none. */
export function shortest(a: string, b: string): string[] | null {
  const prev = new Map<string, string | null>([[a, null]])
  const q = [a]
  for (let i = 0; i < q.length; i++) {
    const w = q[i]
    if (w === b) {
      const path = [w]
      for (let p = prev.get(w); p; p = prev.get(p)) path.unshift(p)
      return path
    }
    for (const n of neighbours(w)) if (!prev.has(n)) { prev.set(n, w); q.push(n) }
  }
  return null
}

/** Steps (letter changes) a day's par asks for: 3 on Monday up to 6 on Sunday. */
export function parFor(seed: string): number {
  const d = parseDateKey(seed)
  const dow = d ? (d.getDay() + 6) % 7 : 0
  return [3, 3, 4, 4, 5, 5, 6][dow]
}

export function puzzleFor(seed: string): { start: string; end: string; par: number } {
  const r = seededRandom(`word-ladder:${seed}`)
  const par = parFor(seed)
  for (;;) {
    const start = WORDS[Math.floor(r() * WORDS.length)]
    if (neighbours(start).length < 2) continue
    // Words exactly `par` steps away.
    const dist = new Map<string, number>([[start, 0]])
    const q = [start]
    for (let i = 0; i < q.length; i++) for (const n of neighbours(q[i])) if (!dist.has(n)) { dist.set(n, dist.get(q[i])! + 1); q.push(n) }
    const far = [...dist].filter(([w, d]) => d === par && neighbours(w).length >= 2).map(([w]) => w)
    if (!far.length) continue
    return { start, end: far[Math.floor(r() * far.length)], par }
  }
}
