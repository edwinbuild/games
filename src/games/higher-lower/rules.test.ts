import { describe, expect, it } from 'vitest'
import { COUNTRIES, SOURCE } from './facts'
import { answerFor, roundPoints, roundsFor, ROUNDS, show, valueOf } from './rules'

describe('Higher Lower facts', () => {
  it('has a source for both measures and a positive number for every fact', () => {
    expect(SOURCE.population.year).toBe(2023)
    expect(SOURCE.area.year).toBe(2022)
    expect(COUNTRIES.length).toBeGreaterThan(100)
    const codes = new Set<string>()
    for (const [code, name, pop, area] of COUNTRIES) {
      expect(code).toMatch(/^[A-Z]{3}$/)
      expect(codes.has(code)).toBe(false)
      codes.add(code)
      expect(name.length).toBeGreaterThan(2)
      expect(pop).toBeGreaterThanOrEqual(1_000_000)
      expect(area).toBeGreaterThan(0)
    }
  })
  it('keeps a few well-known facts in the right order', () => {
    const v = (code: string, i: 2 | 3) => COUNTRIES.find((c) => c[0] === code)![i]
    expect(v('IND', 2)).toBeGreaterThan(v('USA', 2))
    expect(v('RUS', 3)).toBeGreaterThan(v('CAN', 3))
    expect(v('JPN', 2)).toBeGreaterThan(v('FRA', 2))
  })
})

describe('Higher Lower rounds', () => {
  it('deals ten rounds from a seed, the same for everyone, never a near-tie, no country twice', () => {
    for (let s = 0; s < 100; s++) {
      const rs = roundsFor(`room${s}`)
      expect(rs).toEqual(roundsFor(`room${s}`))
      expect(rs.length).toBe(ROUNDS)
      const seen = new Set<number>()
      for (const r of rs) {
        const a = valueOf(r.shown, r.metric), b = valueOf(r.hidden, r.metric)
        expect(Math.max(a, b) / Math.min(a, b)).toBeGreaterThanOrEqual(1.1)
        expect(seen.has(r.shown) || seen.has(r.hidden)).toBe(false)
        seen.add(r.shown); seen.add(r.hidden)
        expect(answerFor(r)).toBe(b > a ? 'higher' : 'lower')
      }
    }
  })
  it('gives the fastest correct answers the most points', () => {
    expect(roundPoints([
      { id: 'a', correct: true, ms: 900 }, { id: 'b', correct: true, ms: 400 },
      { id: 'c', correct: false, ms: 200 }, { id: 'd', correct: true, ms: 1500 }, { id: 'e', correct: true, ms: 2000 },
    ])).toEqual({ a: 2, b: 3, c: 0, d: 1, e: 1 })
  })
  it('shows numbers with units', () => {
    expect(show(1438069596, 'population')).toBe('1.44 billion people')
    expect(show(68372286, 'population')).toBe('68.4 million people')
    expect(show(364500, 'area')).toBe('364,500 km²')
  })
})
