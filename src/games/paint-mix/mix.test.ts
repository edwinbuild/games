import { describe, expect, it } from 'vitest'
import { rgbToLab } from '../color-recall/color'
import { empty, FAMILIES, familyOf, MAX_DROPS, matchScore, mixColor, PAINTS, recipeFor, total } from './mix'

const drops = (o: Record<string, number>) => { const d = empty(); for (const [k, v] of Object.entries(o)) d[PAINTS.findIndex((p) => p.id === k)] = v; return d }

describe('Paint Mix', () => {
  it('mixes like paint: yellow and blue make green, red and yellow make orange', () => {
    const [r, g, b] = mixColor(drops({ yellow: 1, blue: 1 }))!
    expect(g).toBeGreaterThan(r)
    expect(g).toBeGreaterThan(b)
    const [r2, g2, b2] = mixColor(drops({ red: 1, yellow: 1 }))!
    expect(r2).toBeGreaterThan(g2)
    expect(g2).toBeGreaterThan(b2)
  })
  it('only the ratio matters, and white lightens without changing the hue much', () => {
    expect(mixColor(drops({ red: 2, blue: 2 }))).toEqual(mixColor(drops({ red: 1, blue: 1 })))
    const dark = mixColor(drops({ blue: 1 }))!, light = mixColor(drops({ blue: 1, white: 2 }))!
    expect(light.reduce((a, b) => a + b)).toBeGreaterThan(dark.reduce((a, b) => a + b))
    expect(light[2]).toBeGreaterThan(light[0])
  })
  it('an empty bowl has no colour', () => {
    expect(mixColor(empty())).toBeNull()
  })
  it('scores the same colour 100 and a different one much lower', () => {
    const c = mixColor(drops({ yellow: 2, blue: 1 }))!
    expect(matchScore(c, c)).toBe(100)
    expect(matchScore(c, mixColor(drops({ red: 1 }))!)).toBeLessThan(40)
    // One drop off on a 3-drop recipe is close but not perfect.
    const near = matchScore(c, mixColor(drops({ yellow: 3, blue: 1 }))!)
    expect(near).toBeGreaterThan(70)
    expect(near).toBeLessThan(100)
  })
  it('makes a fair daily recipe: 2+ paints, 3–8 drops, colourful, the same for everyone', () => {
    const seen = new Set<string>()
    for (let n = 0; n < 200; n++) {
      const d = recipeFor(`2027-01-${n}`)
      expect(d).toEqual(recipeFor(`2027-01-${n}`))
      expect(d.filter((x) => x > 0).length).toBeGreaterThanOrEqual(2)
      expect(total(d)).toBeGreaterThanOrEqual(3)
      expect(total(d)).toBeLessThanOrEqual(Math.min(8, MAX_DROPS))
      const [, a, b] = rgbToLab(mixColor(d)!)
      expect(Math.hypot(a, b)).toBeGreaterThanOrEqual(24) // colourful, not mud
      seen.add(d.join())
    }
    expect(seen.size).toBeGreaterThan(60)
  })
  it('spreads the year across every colour family, none more than a third of days', () => {
    const count = Object.fromEntries(FAMILIES.map((f) => [f, 0])) as Record<string, number>
    for (let i = 0; i < 365; i++) count[familyOf(mixColor(recipeFor(`day${i}`))!)]++
    for (const f of FAMILIES) {
      expect(count[f]).toBeGreaterThan(20)
      expect(count[f]).toBeLessThan(365 / 3)
    }
  })
})
