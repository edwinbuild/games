import { seededRandom } from '../../shell/daily'

export type P = { x: number; y: number }
export type Round =
  | { kind: 'angle'; origin: P; base: number; target: number } // base direction and target angle in degrees
  | { kind: 'middle'; a: P; b: P }
  | { kind: 'double'; a: P; b: P }
  | { kind: 'centre'; c: P; r: number }

export const ROUNDS = 10
const KINDS = ['angle', 'middle', 'double', 'centre'] as const

/** Ten rounds from a seed; each kind appears two or three times, in a shuffled order. */
export function roundsFor(seed: string): Round[] {
  const r = seededRandom(`angle-eye:${seed}`)
  const kinds = Array.from({ length: ROUNDS }, (_, i) => KINDS[i % 4])
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[kinds[i], kinds[j]] = [kinds[j], kinds[i]]
  }
  return kinds.map((kind) => {
    if (kind === 'angle') return { kind, origin: { x: 20 + r() * 20, y: 60 + r() * 15 }, base: -r() * 20, target: Math.round(15 + r() * 150) }
    if (kind === 'centre') return { kind, c: { x: 35 + r() * 30, y: 35 + r() * 30 }, r: 14 + r() * 16 }
    const len = kind === 'double' ? 22 + r() * 14 : 40 + r() * 40
    const ang = r() * Math.PI
    const cx = kind === 'double' ? 50 - Math.cos(ang) * len * 0.5 : 50
    const cy = kind === 'double' ? 50 - Math.sin(ang) * len * 0.5 : 50
    const dx = (Math.cos(ang) * len) / 2, dy = (Math.sin(ang) * len) / 2
    return { kind, a: { x: cx - dx, y: cy - dy }, b: { x: cx + dx, y: cy + dy } }
  })
}

const dist = (p: P, q: P) => Math.hypot(p.x - q.x, p.y - q.y)
/** Position of p along the line a→b, as a fraction of |ab| (0 at a, 1 at b). */
const along = (a: P, b: P, p: P) => ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / dist(a, b) ** 2

/** Angle in degrees (0–180) between the base ray and the ray from origin to p. */
export function angleAt(origin: P, base: number, p: P): number {
  let a = (Math.atan2(-(p.y - origin.y), p.x - origin.x) * 180) / Math.PI - base
  a = ((a % 360) + 360) % 360
  return a > 180 ? 360 - a : a
}

export type Judged = { score: number; error: string; answer: P }

/** Scores a placed point 0–10 (one decimal) and returns the true answer to draw. */
export function judge(round: Round, p: P): Judged {
  const s = (x: number) => Math.round(Math.max(0, Math.min(10, x)) * 10) / 10
  switch (round.kind) {
    case 'angle': {
      const got = angleAt(round.origin, round.base, p)
      const off = Math.abs(got - round.target)
      const t = ((round.base + round.target) * Math.PI) / 180
      return { score: s(10 - off / 2), error: `${Math.round(off)}° off`, answer: { x: round.origin.x + Math.cos(t) * 30, y: round.origin.y - Math.sin(t) * 30 } }
    }
    case 'middle': {
      const pct = Math.abs(along(round.a, round.b, p) - 0.5) * 100
      return { score: s(10 - pct), error: `${pct.toFixed(1)}% of the line off`, answer: { x: (round.a.x + round.b.x) / 2, y: (round.a.y + round.b.y) / 2 } }
    }
    case 'double': {
      const pct = Math.abs(along(round.a, round.b, p) - 2) * 50
      return { score: s(10 - pct), error: `${pct.toFixed(1)}% too ${along(round.a, round.b, p) > 2 ? 'long' : 'short'}`, answer: { x: round.a.x + (round.b.x - round.a.x) * 2, y: round.a.y + (round.b.y - round.a.y) * 2 } }
    }
    case 'centre': {
      const pct = (dist(round.c, p) / round.r) * 100
      return { score: s(10 - pct / 10), error: `${pct.toFixed(0)}% of the radius off`, answer: round.c }
    }
  }
}

export const prompt = (r: Round) =>
  r.kind === 'angle' ? `Make an angle of ${r.target}°`
  : r.kind === 'middle' ? 'Mark the exact middle of the line'
  : r.kind === 'double' ? 'Extend the line to twice its length'
  : 'Mark the centre of the circle'
