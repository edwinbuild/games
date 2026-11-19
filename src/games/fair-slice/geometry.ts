import { seededRandom } from '../../shell/daily'

export type Pt = { x: number; y: number }
export type Poly = Pt[]
/** Shapes live in a SIZE×SIZE world, centred. */
export const SIZE = 300
const C = SIZE / 2

/** Signed area (shoelace); positive for counter-clockwise in a y-up frame. */
export function signedArea(p: Poly): number {
  let a = 0
  for (let i = 0; i < p.length; i++) {
    const q = p[i], r = p[(i + 1) % p.length]
    a += q.x * r.y - r.x * q.y
  }
  return a / 2
}
export const area = (p: Poly) => Math.abs(signedArea(p))

/** Which side of the line a→b a point is on (positive on the left). */
const side = (a: Pt, b: Pt, p: Pt) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)

/** The part of a polygon on the left of the infinite line a→b (Sutherland–Hodgman against one half-plane). */
export function clipLeft(poly: Poly, a: Pt, b: Pt): Poly {
  const out: Poly = []
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length]
    const sp = side(a, b, p), sq = side(a, b, q)
    if (sp >= 0) out.push(p)
    if ((sp >= 0) !== (sq >= 0)) {
      const t = sp / (sp - sq)
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t })
    }
  }
  return out
}

/**
 * Cuts a shape along the infinite line through a and b. Returns each side's share of the area in
 * percent. A concave shape may fall into three or more pieces: everything on one side counts as one side.
 */
export function split(poly: Poly, a: Pt, b: Pt): { left: number; right: number } {
  const total = area(poly)
  const l = clipLeft(poly, a, b)
  const left = l.length >= 3 ? (area(l) / total) * 100 : 0
  return { left, right: 100 - left }
}

/** How far a cut is from a fair half, in percent of the area, to 0.1. */
export const offBy = (s: { left: number }) => Math.round(Math.abs(s.left - 50) * 10) / 10

/** A shape described by its distance from the centre at each angle, sampled into a polygon. */
function radial(r: (a: number) => number, n = 144, turn = 0): Poly {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const d = r(a)
    return { x: C + Math.cos(a + turn) * d, y: C + Math.sin(a + turn) * d }
  })
}
function regular(sides: number, rad: number, turn: number): Poly {
  return Array.from({ length: sides }, (_, i) => {
    const a = turn + (i / sides) * Math.PI * 2
    return { x: C + Math.cos(a) * rad, y: C + Math.sin(a) * rad }
  })
}

export type ShapeName = 'square' | 'triangle' | 'bitten' | 'star' | 'blob'
export const ORDER: ShapeName[] = ['square', 'triangle', 'bitten', 'star', 'blob']

/** The day's five shapes, from easy to hard, each turned by a seeded angle. */
export function shapesFor(seed: string): { name: ShapeName; poly: Poly }[] {
  const r = seededRandom(`fair-slice:${seed}`)
  const turn = () => r() * Math.PI * 2
  const points = 5 + Math.floor(r() * 3)
  const bite = turn()
  const waves = Array.from({ length: 4 }, () => ({ k: 2 + Math.floor(r() * 4), amp: 8 + r() * 14, ph: turn() }))
  return [
    { name: 'square', poly: regular(4, 110, turn()) },
    { name: 'triangle', poly: regular(3, 120, turn()) },
    {
      name: 'bitten',
      poly: radial((a) => {
        // A circle with a round bite out of one side.
        const d = Math.abs(((a - bite + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
        return d < 0.55 ? 100 - 46 * Math.cos((d / 0.55) * (Math.PI / 2)) : 100
      }),
    },
    { name: 'star', poly: radial((a) => starR(a, points), points * 20, turn()) },
    { name: 'blob', poly: radial((a) => 92 + waves.reduce((s, w) => s + Math.sin(a * w.k + w.ph) * w.amp, 0) * 0.5) },
  ]
}
function starR(a: number, points: number): number {
  // Straight edges between 2×points corners, alternating outer and inner radius: where the ray at
  // angle a meets the chord between the two corners on either side of it.
  const seg = Math.PI / points
  const k = Math.floor(a / seg)
  const r1 = k % 2 === 0 ? 125 : 55, r2 = k % 2 === 0 ? 55 : 125
  const p1 = { x: Math.cos(k * seg) * r1, y: Math.sin(k * seg) * r1 }
  const p2 = { x: Math.cos((k + 1) * seg) * r2, y: Math.sin((k + 1) * seg) * r2 }
  const e = { x: p2.x - p1.x, y: p2.y - p1.y }
  const d = { x: Math.cos(a), y: Math.sin(a) }
  return (p1.x * e.y - p1.y * e.x) / (d.x * e.y - d.y * e.x)
}

/** Grade of one cut for the share squares: green within 1%, yellow within 3%, red beyond. */
export const grade = (off: number) => (off <= 1 ? 'hit' : off <= 3 ? 'near' : 'miss') as 'hit' | 'near' | 'miss'
/** Average distance from fair over the five cuts, to 0.1. */
export const average = (offs: number[]) => Math.round((offs.reduce((a, b) => a + b, 0) / offs.length) * 10) / 10
