import { describe, expect, it } from 'vitest'
import { rgbToLab } from '../color-recall/color'
import { dayFor, dayScore, empty, FAMILIES, ROUNDS, SLACK, stars, TIERS, familyOf, MAX_DROPS, matchScore, mixColor, PAINTS, recipeFor, total } from './mix'

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

describe('Paint Mix: five colours a day', () => {
  it('gives five recipes, easy to hard, within the bowl, the same for everyone, new for each try', () => {
    for (let n = 0; n < 120; n++) {
      const seed = `2027-04-${n}`
      const day = dayFor(seed)
      expect(day).toEqual(dayFor(seed))
      expect(day.targets).toHaveLength(ROUNDS)
      expect(dayFor(seed, 1)).not.toEqual(day)
      const used = (d: number[]) => d.filter((x) => x > 0).length
      // tint: one paint and white; two: two paints; two-white: three; dark: has black; muted: all three primaries
      expect(used(day.targets[0])).toBe(2)
      expect(day.targets[0][3]).toBeGreaterThan(0)
      expect(used(day.targets[1])).toBe(2)
      expect(day.targets[1][3] + day.targets[1][4]).toBe(0)
      expect(day.targets[3][4]).toBe(1)
      expect(day.targets[4].slice(0, 3).every((x) => x > 0)).toBe(true)
      for (const t of day.targets) {
        expect(total(t)).toBeGreaterThanOrEqual(3)
        expect(total(t)).toBeLessThanOrEqual(MAX_DROPS)
      }
      // The budget covers every exact recipe with ten drops to spare.
      expect(day.budget).toBe(day.targets.reduce((s, t) => s + total(t), 0) + SLACK)
    }
    expect(TIERS).toHaveLength(ROUNDS)
  })
  it('scores the day as the average, with a star per exact match', () => {
    expect(dayScore([100, 90, 80, 70, 60])).toBe(80)
    expect(stars([100, 99, 100, 40, 100])).toBe(3)
  })
  it('the same ratio in more drops still matches exactly (a correction can work)', () => {
    const d = drops({ yellow: 2, blue: 1 })
    expect(mixColor(drops({ yellow: 4, blue: 2 }))).toEqual(mixColor(d))
  })
})

