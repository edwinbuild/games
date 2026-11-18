import { describe, expect, it } from 'vitest'
import { levelSetup } from '../shared/odd-grid'
import { seededRandom } from '../../shell/daily'
import { ordinal, rank, timeLeft } from './rules'

describe('Spot Race', () => {
  it('ranks by levels, then by who got there first, and shares exact ties', () => {
    const r = rank([
      { id: 'a', level: 5, at: 40_000 },
      { id: 'b', level: 7, at: 50_000 },
      { id: 'c', level: 5, at: 30_000, left: true },
      { id: 'd', level: 5, at: 40_000 },
    ])
    expect(r.map((x) => [x.id, x.place])).toEqual([['b', 1], ['c', 2], ['a', 3], ['d', 3]])
    expect(r[1].left).toBe(true)
  })
  it('words places', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st'])
  })
  it('counts the clock down with 3 seconds off per wrong tap, never below zero', () => {
    expect(timeLeft(1000, 11_000, 0)).toBe(50_000)
    expect(timeLeft(1000, 11_000, 2)).toBe(44_000)
    expect(timeLeft(0, 59_000, 1)).toBe(0)
  })
  it('gives every player the same grids from the same seed', () => {
    const a = seededRandom('room-seed'), b = seededRandom('room-seed')
    for (let l = 1; l <= 30; l++) expect(levelSetup(l, a)).toEqual(levelSetup(l, b))
  })
})
