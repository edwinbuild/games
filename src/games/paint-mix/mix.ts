// Paint Mix rules: paints mix like real paint (subtractively), so yellow and blue make green.
// Each paint is a reflectance per channel (linear light, 0–1); a mix is the drop-weighted
// geometric mean of the reflectances, a simple, well-behaved stand-in for pigment mixing.
import { seededRandom } from '../../shell/daily'
import { deltaE2000, rgbToLab } from '../color-recall/color'

export type Rgb = [number, number, number] // sRGB 0–255
export type Paint = { id: string; name: string; reflect: [number, number, number] }

export const PAINTS: Paint[] = [
  { id: 'red', name: 'Red', reflect: [0.8, 0.055, 0.07] },
  { id: 'yellow', name: 'Yellow', reflect: [0.92, 0.75, 0.05] },
  { id: 'blue', name: 'Blue', reflect: [0.035, 0.16, 0.7] },
  { id: 'white', name: 'White', reflect: [0.92, 0.92, 0.92] },
  { id: 'black', name: 'Black', reflect: [0.03, 0.03, 0.035] },
]
/** Most drops the bowl holds. */
export const MAX_DROPS = 12

/** Drops of each paint, in PAINTS order. */
export type Drops = number[]
export const empty = (): Drops => PAINTS.map(() => 0)
export const total = (d: Drops) => d.reduce((a, b) => a + b, 0)

const toSrgb = (c: number) => {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  return Math.round(Math.max(0, Math.min(1, v)) * 255)
}

/** The colour of a mix; an empty bowl is null. */
export function mixColor(d: Drops): Rgb | null {
  const n = total(d)
  if (!n) return null
  const out = [0, 1, 2].map((ch) => Math.exp(PAINTS.reduce((s, p, i) => s + d[i] * Math.log(p.reflect[ch]), 0) / n))
  return out.map(toSrgb) as Rgb
}

export const paintColor = (p: Paint): Rgb => p.reflect.map(toSrgb) as Rgb
export const css = ([r, g, b]: Rgb) => `rgb(${r} ${g} ${b})`

/** 100 for the same colour, 2 points lost per unit of CIEDE2000 difference (as in Color Recall). */
export function matchScore(target: Rgb, mine: Rgb): number {
  const dE = deltaE2000(rgbToLab(target), rgbToLab(mine))
  return Math.max(0, Math.min(100, Math.round(100 - dE * 2)))
}

/**
 * The day's target: a real recipe of two or three paints (so a perfect match is always
 * possible), 3 to 8 drops in all, never just one paint, and never muddy.
 */
export function recipeFor(seed: string): Drops {
  const r = seededRandom(`paint-mix:${seed}`)
  for (;;) {
    const d = empty()
    const colours = [0, 1, 2].sort(() => r() - 0.5).slice(0, r() < 0.75 ? 2 : 3)
    for (const i of colours) d[i] = 1 + Math.floor(r() * 3)
    if (r() < 0.55) d[3] = 1 + Math.floor(r() * 3) // white
    else if (r() < 0.25) d[4] = 1 // a touch of black
    const n = total(d)
    if (n < 3 || n > 8) continue
    // Colourful enough to be satisfying (three paints together easily turn to mud), and not near black.
    const c = mixColor(d)!
    const [, a, b] = rgbToLab(c)
    if (Math.max(...c) < 70 || Math.hypot(a, b) < 24) continue
    return d
  }
}
