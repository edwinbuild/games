// Stick Up physics: a stick stands on a ball you move left and right (an upside-down pendulum on a
// cart). Moving the ball under the stick's lean keeps it up; wind gusts push the stick over, so you
// have to lean it into the wind. Units are the stage's: 360 wide, pixels and seconds.
import { seededRandom } from '../../shell/daily'

export const W = 360
/** Stick length, and how hard it falls (a stand-in for gravity, tuned with the drag below so a lean about triples each second: hard, but human). */
export const LEN = 170
export const G = 262
/** How tightly the ball follows your finger: a stiff, critically damped spring. */
const K = 900
const C = 2 * Math.sqrt(K)
const MAX_A = 5000
/** Air drag on the stick: slows a lean down enough for human reactions. */
export const DAMP = 1
/** The ball stays this far from each edge. */
export const EDGE = 30
/** Past this lean (radians, about 77°) the stick is down. */
export const FALLEN = 1.35

export type State = { x: number; v: number; th: number; om: number; t: number; a: number }
export type Gust = { start: number; dur: number; dir: 1 | -1; peak: number }

export const startState = (lean: number): State => ({ x: W / 2, v: 0, th: lean, om: 0, t: 0, a: 0 })

/** The run's gusts: the first after 4 s, then every 2–4.5 s, each a little stronger (the same for everyone with the seed). */
export function gustsFor(seed: string, upTo = 300): { lean: number; gusts: Gust[] } {
  const r = seededRandom(`stick-up:${seed}`)
  const lean = (r() < 0.5 ? -1 : 1) * (0.08 + r() * 0.04)
  const gusts: Gust[] = []
  for (let t = 4; t < upTo; ) {
    const dur = 1.5 + r() * 2
    // A gust's strength as the lean it needs: from about 8° at first up to about 38°.
    gusts.push({ start: t, dur, dir: r() < 0.5 ? -1 : 1, peak: G * Math.min(0.78, 0.1 + 0.01 * t) * (0.8 + r() * 0.4) })
    t += dur + 2 + r() * 2.5
  }
  return { lean, gusts }
}

/** Wind on the stick at time t (positive pushes right): the gusts, smoothly in and out, plus a light breeze. */
export function windAt(gusts: Gust[], t: number): number {
  let w = G * (0.035 * Math.sin(t * 1.3) + 0.02 * Math.sin(t * 2.9 + 1))
  for (const g of gusts) {
    if (g.start > t) break
    const u = (t - g.start) / g.dur
    if (u < 1) w += g.dir * g.peak * Math.sin(Math.PI * u) ** 2
  }
  return w
}
/** The strongest wind so far, as a force from 1 to 10 (for the result). */
export const forceOf = (gusts: Gust[], t: number) => {
  const peak = Math.max(0, ...gusts.filter((g) => g.start < t).map((g) => g.peak))
  return Math.max(1, Math.min(10, Math.round((peak / G) * 12)))
}

/** One small step: the ball chases `target`, the stick tips with gravity, the ball's push and the wind. */
export function step(s: State, target: number, wind: number, dt: number): State {
  let a = Math.max(-MAX_A, Math.min(MAX_A, K * (target - s.x) - C * s.v))
  let v = s.v + a * dt
  let x = s.x + v * dt
  if (x < EDGE || x > W - EDGE) { x = Math.max(EDGE, Math.min(W - EDGE, x)); a = -s.v / dt; v = 0 }
  const al = (3 / (2 * LEN)) * (G * Math.sin(s.th) - a * Math.cos(s.th) + wind * Math.cos(s.th)) - DAMP * s.om
  const om = s.om + al * dt
  return { x, v, th: s.th + om * dt, om, t: s.t + dt, a }
}
export const fallen = (s: State) => Math.abs(s.th) > FALLEN
