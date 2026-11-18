import { describe, expect, it } from 'vitest'
import { deltaE2000, hslToRgb, matchScore, rgbToLab } from './color'

describe('colour maths', () => {
  // Reference pairs from Sharma, Wu and Dalal (2005), the published CIEDE2000 test data.
  const pairs: [[number, number, number], [number, number, number], number][] = [
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
    [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
    [[50, -1.3802, -84.2814], [50, 0, -82.7485], 1.0],
    [[50, 2.5, 0], [50, 0, -2.5], 4.3065],
    [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    [[22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619], 2.0373],
    [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
  ]
  it('matches the published CIEDE2000 test data', () => {
    for (const [a, b, want] of pairs) expect(deltaE2000(a, b)).toBeCloseTo(want, 3)
  })
  it('converts known colours', () => {
    expect(hslToRgb({ h: 0, s: 100, l: 50 }).map(Math.round)).toEqual([255, 0, 0])
    const [L] = rgbToLab([255, 255, 255])
    expect(L).toBeCloseTo(100, 1)
  })
  it('scores identical colours 100 and opposite ones 0', () => {
    expect(matchScore({ h: 200, s: 60, l: 50 }, { h: 200, s: 60, l: 50 }).score).toBe(100)
    expect(matchScore({ h: 10, s: 90, l: 50 }, { h: 190, s: 90, l: 50 }).score).toBe(0)
  })
})
