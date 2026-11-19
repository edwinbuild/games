import { seededRandom } from '../../shell/daily'

/** How far the pendulum swings either side of straight down, in degrees. */
export const AMPLITUDE = 60

export type Round = { period: number; center: number; width: number }

/** The pendulum's angle (degrees, 0 = straight down) `t` ms into a swing that starts at the left extreme. */
export function angleAt(t: number, period: number): number {
  return -AMPLITUDE * Math.cos((2 * Math.PI * t) / period)
}

/** Round k (0-based) of a run: faster swings and smaller zones as it goes, zone placed by the seed. */
export function roundFor(seed: string, k: number): Round {
  const r = seededRandom(`pendulum-stop:${seed}:${k}`)
  const period = Math.max(550, Math.round(1700 * 0.93 ** k))
  const width = Math.max(4, Math.round(20 * 0.92 ** k * 10) / 10)
  const reach = AMPLITUDE - width / 2 - 4
  const center = Math.round((r() * 2 - 1) * reach * 10) / 10
  return { period, center, width }
}

/** Whether a stop at this angle lands in the zone (edges count). */
export const inZone = (angle: number, round: Round) => Math.abs(angle - round.center) <= round.width / 2 + 1e-9
