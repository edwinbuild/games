import { seededRandom } from '../../shell/daily'
import { resample, type P } from '../../shell/ink'

export const SIZE = 300
const SAMPLES = 64

/** Centred on its middle and scaled to unit size, so position and size don't matter. */
export function normalise(points: P[]): P[] {
  const pts = resample(points, SAMPLES)
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cy = pts.reduce((s, p) => s + p.y, 0) / pts.length
  const rms = Math.sqrt(pts.reduce((s, p) => s + (p.x - cx) ** 2 + (p.y - cy) ** 2, 0) / pts.length) || 1
  return pts.map((p) => ({ x: (p.x - cx) / rms, y: (p.y - cy) / rms }))
}

const meanDist = (a: P[], b: P[]) => a.reduce((s, p, i) => s + Math.hypot(p.x - b[i].x, p.y - b[i].y), 0) / a.length

/** How closely a drawing matches a shape, 0–100. Drawing direction doesn't matter. */
export function matchScore(shape: P[], drawing: P[]): number {
  if (drawing.length < 2) return 0
  const a = normalise(shape), b = normalise(drawing)
  const d = Math.min(meanDist(a, b), meanDist(a, [...b].reverse()))
  // A gentle falloff: small wobbles cost little, a different shape costs most of the points.
  return Math.round(100 / (1 + (d / 0.35) ** 2))
}

/** A smooth curve through points (Catmull-Rom), sampled. */
function spline(ctrl: P[], per = 16): P[] {
  const out: P[] = []
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)]
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      })
    }
  }
  out.push(ctrl[ctrl.length - 1])
  return out
}

export type Shape = { kind: 'zigzag' | 'curve' | 'loop'; points: P[] }

/** The day's three shapes: a zigzag, a curve and a loop, the same for everyone. */
export function shapesFor(seed: string): Shape[] {
  const r = seededRandom(`shape-recall:${seed}`)
  const m = 50, span = SIZE - 2 * m
  const zn = 4 + Math.floor(r() * 3)
  const zig: P[] = Array.from({ length: zn }, (_, i) => ({ x: m + (span * i) / (zn - 1), y: m + (i % 2 ? 0.7 + r() * 0.3 : r() * 0.3) * span }))
  const ctrl: P[] = Array.from({ length: 5 }, (_, i) => ({ x: m + (span * i) / 4 + (r() - 0.5) * 30, y: m + r() * span }))
  const turns = 0.75 + r() * 0.15, wob = 0.15 + r() * 0.2, k = 2 + Math.floor(r() * 3), start = r() * Math.PI * 2
  const loop: P[] = Array.from({ length: 90 }, (_, i) => {
    const t = i / 89, a = start + t * turns * Math.PI * 2, rad = (span / 2) * (0.75 + wob * Math.sin(a * k))
    return { x: SIZE / 2 + Math.cos(a) * rad, y: SIZE / 2 + Math.sin(a) * rad }
  })
  return [{ kind: 'zigzag', points: zig }, { kind: 'curve', points: spline(ctrl) }, { kind: 'loop', points: loop }]
}

export const average = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
