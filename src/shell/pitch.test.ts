import { describe, expect, it } from 'vitest'
import { chimeHz, popHz } from './pitch'

describe('pitch ladders', () => {
  it('pops climb a semitone each and stop at two octaves', () => {
    expect(popHz(0)).toBe(330)
    expect(popHz(12)).toBeCloseTo(660)
    expect(popHz(24)).toBeCloseTo(1320)
    expect(popHz(99)).toBe(popHz(24))
    expect(popHz(-3)).toBe(330)
    for (let n = 1; n <= 24; n++) expect(popHz(n)).toBeGreaterThan(popHz(n - 1))
  })
  it('chimes climb a pentatonic scale from C5 and stop after two octaves', () => {
    expect(chimeHz(0)).toBeCloseTo(523.25)
    expect(chimeHz(3)).toBeCloseTo(523.25 * 2 ** (7 / 12))
    expect(chimeHz(5)).toBeCloseTo(1046.5)
    expect(chimeHz(10)).toBeCloseTo(2093)
    expect(chimeHz(50)).toBe(chimeHz(10))
    for (let n = 1; n <= 10; n++) expect(chimeHz(n)).toBeGreaterThan(chimeHz(n - 1))
  })
})
