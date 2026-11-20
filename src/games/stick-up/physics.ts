// Stick Up physics: a stick stands on a ball you move left and right. It's the classic "pole on a
// cart": two bodies pushing on each other. Your finger pulls the ball like a firm hand (a stiff
// spring); gravity tips the stick; the stick's motion tugs the ball back; wind pushes the stick
// (and, through it, the ball), and moving the stick through the air meets a little resistance.
// Units are the stage's: 360 wide, pixels and seconds. Steps are fixed and small (see STEP).
import { seededRandom } from '../../shell/daily'

export const W = 360
/** Stick length, and gravity (a stand-in, tuned with the damping below so a lean about triples each second: hard, but human). */
export const LEN = 170
export const G = 262
/** The ball and the stick (only their ratio matters): a light stick on a heavier ball. */
const BALL_MASS = 1
const STICK_MASS = 0.3
const HALF = LEN / 2
/** The stick about its bottom end: a uniform rod. */
const I_END = (STICK_MASS * LEN * LEN) / 3
/** How firmly your hand holds the ball: a stiff, critically damped spring, with a limit on how hard it can push. */
const K = 900
const C = 2 * Math.sqrt(K)
const MAX_PUSH = 5000
/** Damping on the stick's turning: slows a lean enough for human reactions. */
export const DAMP = 1
/** Air resistance when the stick moves sideways (small: real air hardly slows a broom). */
const AIR = 0.25
/** Rolling resistance of the ball once you've let go (per second). */
const ROLL = 1.6
/** The ball stays this far from each edge. */
export const EDGE = 30
/** Height of the stick's bottom end above the ground (it rests on top of the ball). */
export const PIVOT_H = 40
/** Past horizontal the stick slides off the ball: the run is over. */
export const FALLEN = Math.PI / 2
/** Where the stick's top meets the ground when it has fallen. */
const ON_GROUND = Math.PI / 2 + Math.asin(PIVOT_H / LEN)
/** The fixed physics step. */
export const STEP = 1 / 240

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

/** Wind at time t, as the push it gives the stick per unit of its mass (positive is to the right). */
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

/**
 * One step of both bodies. `target` is where your finger is (null once you've let go: the ball
 * rolls on and slows). Solves the pole-on-cart equations for the ball's and the stick's
 * accelerations together, so each pushes on the other.
 */
export function step(s: State, target: number | null, wind: number, dt = STEP): State {
  const c = Math.cos(s.th), sn = Math.sin(s.th)
  // The stick's middle moves sideways at v + HALF·cosθ·ω; air resists that, wind pushes it.
  const side = STICK_MASS * (wind - AIR * (s.v + HALF * c * s.om))
  // Your hand is firm enough to carry the stick's weight too, so the ball answers as quickly as it would alone.
  const hand = target == null ? -ROLL * BALL_MASS * s.v : (BALL_MASS + STICK_MASS) * Math.max(-MAX_PUSH, Math.min(MAX_PUSH, K * (target - s.x) - C * s.v))
  // [M+m, m·l·c] [a] = [hand + side + m·l·sinθ·ω²]
  // [m·l·c, I  ] [α] = [m·g·l·sinθ + side·l·cosθ − I·DAMP·ω]
  const a11 = BALL_MASS + STICK_MASS, a12 = STICK_MASS * HALF * c, a22 = I_END
  const b1 = hand + side + STICK_MASS * HALF * sn * s.om * s.om
  const b2 = STICK_MASS * G * HALF * sn + side * HALF * c - I_END * DAMP * s.om
  const det = a11 * a22 - a12 * a12
  const a = (b1 * a22 - a12 * b2) / det
  const al = (a11 * b2 - a12 * b1) / det
  let v = s.v + a * dt
  let x = s.x + v * dt
  let om = s.om + al * dt
  // The edge stops the ball dead; the stick, carried along, keeps turning (the jolt passes into it).
  if (x < EDGE || x > W - EDGE) {
    x = Math.max(EDGE, Math.min(W - EDGE, x))
    om += (STICK_MASS * HALF * c * v) / I_END
    v = 0
  }
  return { x, v, th: s.th + om * dt, om, t: s.t + dt, a }
}
export const fallen = (s: State) => Math.abs(s.th) > FALLEN

/** After a fall: the ball rolls on and the stick drops to the ground, bouncing a little. */
export function stepFallen(s: State, dt = STEP): State {
  // Lying on the ground the stick rests there; only the ball moves, rolling to a stop.
  if (Math.abs(s.th) >= ON_GROUND - 1e-3 && s.om === 0) {
    const v = Math.abs(s.v) < 1 ? 0 : s.v * Math.exp(-ROLL * dt)
    const x = Math.max(EDGE, Math.min(W - EDGE, s.x + v * dt))
    return { ...s, x, v: x === EDGE || x === W - EDGE ? 0 : v, t: s.t + dt, a: 0 }
  }
  const n = step(s, null, 0, dt)
  const side = Math.sign(n.th)
  if (Math.abs(n.th) >= ON_GROUND) {
    n.th = side * ON_GROUND
    n.om = Math.abs(n.om) > 0.6 ? -n.om * 0.3 : 0
  }
  return n
}
/** Whether a fallen stick has come to rest. */
export const settled = (s: State) => Math.abs(s.th) >= ON_GROUND - 1e-3 && s.om === 0 && Math.abs(s.v) < 4
