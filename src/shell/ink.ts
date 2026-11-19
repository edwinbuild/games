// Finger and mouse strokes: capture, smooth, simplify, resample and draw.
// Used by drawing games (Shape Recall, Steady Line, Quick Draw). Pure functions are unit-tested.

export type P = { x: number; y: number }

/** Moving-average smoothing over `k` neighbours each side; the ends stay put. */
export function smooth(points: P[], k = 2): P[] {
  if (points.length < 3) return points.slice()
  return points.map((p, i) => {
    if (i === 0 || i === points.length - 1) return p
    let sx = 0, sy = 0, n = 0
    for (let j = Math.max(0, i - k); j <= Math.min(points.length - 1, i + k); j++) { sx += points[j].x; sy += points[j].y; n++ }
    return { x: sx / n, y: sy / n }
  })
}

const segDist = (p: P, a: P, b: P) => {
  const dx = b.x - a.x, dy = b.y - a.y
  const l = dx * dx + dy * dy
  const t = l ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)) : 0
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** Ramer–Douglas–Peucker: drops points closer than `tolerance` to the line between their neighbours. */
export function simplify(points: P[], tolerance = 1): P[] {
  if (points.length < 3) return points.slice()
  let worst = 0, at = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = segDist(points[i], points[0], points[points.length - 1])
    if (d > worst) { worst = d; at = i }
  }
  if (worst <= tolerance) return [points[0], points[points.length - 1]]
  return [...simplify(points.slice(0, at + 1), tolerance).slice(0, -1), ...simplify(points.slice(at), tolerance)]
}

/** Total length of a stroke. */
export const length = (points: P[]) => points.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - points[i].x, p.y - points[i].y), 0)

/** `n` points evenly spaced along the stroke. */
export function resample(points: P[], n: number): P[] {
  if (points.length === 0) return []
  if (points.length === 1) return Array.from({ length: n }, () => ({ ...points[0] }))
  const total = length(points)
  const step = total / (n - 1)
  const out: P[] = [{ ...points[0] }]
  let need = step, i = 1, prev = points[0]
  while (out.length < n - 1 && i < points.length) {
    const p = points[i]
    const d = Math.hypot(p.x - prev.x, p.y - prev.y)
    if (d >= need && d > 0) {
      const t = need / d
      prev = { x: prev.x + (p.x - prev.x) * t, y: prev.y + (p.y - prev.y) * t }
      out.push(prev)
      need = step
    } else {
      need -= d
      prev = p
      i++
    }
  }
  while (out.length < n) out.push({ ...points[points.length - 1] })
  return out
}

/** Draws a stroke as a smooth line (quadratic curves through midpoints). `k` scales world units to canvas pixels. */
export function drawStroke(g: CanvasRenderingContext2D, points: P[], k = 1) {
  if (points.length === 0) return
  g.beginPath()
  g.moveTo(points[0].x * k, points[0].y * k)
  if (points.length === 1) { g.lineTo(points[0].x * k + 0.01, points[0].y * k); g.stroke(); return }
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2, my = (points[i].y + points[i + 1].y) / 2
    g.quadraticCurveTo(points[i].x * k, points[i].y * k, mx * k, my * k)
  }
  const last = points[points.length - 1]
  g.lineTo(last.x * k, last.y * k)
  g.stroke()
}

/** Points from a pointer event, including the in-between points the browser coalesced, in the element's own units. */
export function pointsFrom(e: PointerEvent, el: Element, worldW: number, worldH: number): P[] {
  const r = el.getBoundingClientRect()
  const evs = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : []
  return (evs.length ? evs : [e]).map((v) => ({ x: ((v.clientX - r.left) / r.width) * worldW, y: ((v.clientY - r.top) / r.height) * worldH }))
}
