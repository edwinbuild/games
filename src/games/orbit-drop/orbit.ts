// Orbit Drop rules. World units, y grows downwards (the run climbs up the screen).
// A ball circles a planet; letting go sends it straight along its direction of travel. If that
// line passes close enough to the next planet, the ball is caught into its orbit.
import { seededRandom } from '../../shell/daily'

export type V = { x: number; y: number }
export type Planet = { x: number; y: number; r: number; orbit: number; w: number; dir: 1 | -1; catchR: number }

/** How fast the ball flies between planets, units per second. */
export const SPEED = 560
/** Width of the play area in world units (planets stay inside it). */
export const WORLD_W = 300

/** Planet k of a run (k = 0 is where you start). The same seed always gives the same run. */
export function planetsFor(seed: string, n: number): Planet[] {
  const r = seededRandom(`orbit-drop:${seed}`)
  const out: Planet[] = [{ x: 0, y: 0, r: 26, orbit: 58, w: 2.1, dir: 1, catchR: 58 + 22 }]
  for (let k = 1; k < n; k++) {
    const prev = out[k - 1]
    const lvl = Math.min(k, 45) // it keeps getting harder up to planet 45, then holds
    const dist = 185 + lvl * 3 + r() * 40
    // Up the screen, leaning left or right, staying inside the play area.
    const ang = (r() - 0.5) * (Math.PI / 1.7)
    const edge = WORLD_W / 2 - 40
    const x = Math.max(-edge, Math.min(edge, prev.x + Math.sin(ang) * dist))
    const y = prev.y - Math.sqrt(dist ** 2 - (x - prev.x) ** 2)
    const body = Math.max(13, 25 - lvl * 0.45) + r() * 5
    const orbit = body + 26 + r() * 8
    out.push({
      x, y, r: body, orbit,
      w: Math.min(4.2, 2.1 + lvl * 0.075 + r() * 0.35),
      dir: r() < 0.5 ? 1 : -1,
      // How far outside the orbit ring the flight may pass and still be caught; shrinks with level.
      catchR: orbit + Math.max(7, 22 - lvl * 0.5),
    })
  }
  return out
}

/** Where the ball is at angle a around planet p, and its direction of travel (a unit vector). */
export function onOrbit(p: Planet, a: number): { pos: V; dir: V } {
  return { pos: { x: p.x + Math.cos(a) * p.orbit, y: p.y + Math.sin(a) * p.orbit }, dir: { x: -Math.sin(a) * p.dir, y: Math.cos(a) * p.dir } }
}

export type Flight = { hit: true; t: number; at: V; angle: number } | { hit: false; closest: number }

/**
 * Letting go at angle a around `from`: the ball flies straight. Caught if the line passes within
 * `to.catchR` of its centre, ahead of the ball. It joins the orbit where the line first meets the
 * orbit ring (or, for a near miss outside the ring, at the closest point), after `t` seconds.
 */
export function release(from: Planet, to: Planet, a: number): Flight {
  const { pos, dir } = onOrbit(from, a)
  const dx = to.x - pos.x, dy = to.y - pos.y
  const along = dx * dir.x + dy * dir.y
  const px = pos.x + dir.x * along, py = pos.y + dir.y * along
  const closest = Math.hypot(to.x - px, to.y - py)
  if (along <= 0 || closest > to.catchR) return { hit: false, closest }
  const inside = closest < to.orbit ? Math.sqrt(to.orbit ** 2 - closest ** 2) : 0
  const travel = Math.max(0, along - inside)
  const at = { x: pos.x + dir.x * travel, y: pos.y + dir.y * travel }
  // On a near miss the ball is pulled onto the ring at the closest point.
  const ring = closest < to.orbit ? at : { x: to.x + ((px - to.x) / closest) * to.orbit, y: to.y + ((py - to.y) / closest) * to.orbit }
  return { hit: true, t: travel / SPEED, at: ring, angle: Math.atan2(ring.y - to.y, ring.x - to.x) }
}

/** The share of a full orbit during which letting go would be caught (how forgiving a jump is). */
export function hitWindow(from: Planet, to: Planet, steps = 720): number {
  let n = 0
  for (let i = 0; i < steps; i++) if (release(from, to, (i / steps) * Math.PI * 2).hit) n++
  return n / steps
}
