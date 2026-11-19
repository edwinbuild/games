import { describe, expect, it } from 'vitest'
import { hitWindow, onOrbit, planetsFor, release, WORLD_W } from './orbit'

describe('Orbit Drop', () => {
  it('builds the same run for a seed, climbing up the screen inside the play area', () => {
    const a = planetsFor('s1', 40)
    expect(a).toEqual(planetsFor('s1', 40))
    expect(planetsFor('s2', 40)).not.toEqual(a)
    for (let k = 1; k < a.length; k++) {
      expect(a[k].y).toBeLessThan(a[k - 1].y)
      expect(Math.abs(a[k].x)).toBeLessThanOrEqual(WORLD_W / 2)
      expect(a[k].orbit).toBeGreaterThan(a[k].r + 20)
    }
  })
  it('catches a ball aimed at the next planet and loses one aimed away', () => {
    const [p, q] = planetsFor('aim', 2)
    // Find the angle whose direction of travel points straight at q.
    let best = 0, bestDot = -2
    for (let i = 0; i < 3600; i++) {
      const a = (i / 3600) * Math.PI * 2
      const { pos, dir } = onOrbit(p, a)
      const d = Math.hypot(q.x - pos.x, q.y - pos.y)
      const dot = ((q.x - pos.x) * dir.x + (q.y - pos.y) * dir.y) / d
      if (dot > bestDot) { bestDot = dot; best = a }
    }
    const hit = release(p, q, best)
    expect(hit.hit).toBe(true)
    if (hit.hit) {
      // It joins the orbit ring of q, after a sensible flight.
      expect(Math.hypot(hit.at.x - q.x, hit.at.y - q.y)).toBeCloseTo(q.orbit, 5)
      expect(hit.t).toBeGreaterThan(0.1)
      expect(hit.t).toBeLessThan(1)
    }
    expect(release(p, q, best + Math.PI).hit).toBe(false)
  })
  it('gets harder but stays fair: every jump can be made, and the window narrows with level', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const ps = planetsFor(seed, 31)
      const w = ps.slice(1).map((q, k) => hitWindow(ps[k], q))
      for (const x of w) expect(x).toBeGreaterThanOrEqual(0.04)
      const early = (w[0] + w[1] + w[2]) / 3, late = (w[27] + w[28] + w[29]) / 3
      expect(late).toBeLessThan(early)
      expect(w[0]).toBeGreaterThan(0.1) // the first jump is easy
    }
  })
})
