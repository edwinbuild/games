import { describe, expect, it } from 'vitest'
import { allRules, judge, LEVELS, rulesFor, type Grid } from './rules'

const g = (s: string): Grid => [...s].map((c) => (c === '.' ? null : ('rbgy'.indexOf(c) as 0 | 1 | 2 | 3)))
const rule = (id: string) => allRules().find((r) => r.id === id)!

describe('Rule Stack', () => {
  it('checks rules on a grid', () => {
    const grid = g('rbgy' + 'gyrb' + 'brgy' + 'ygbr')
    expect(rule('apart-0').holds(grid)).toBe(true) // no red touches red
    expect(rule('rows-1').holds(grid)).toBe(true)
    expect(rule('corners-diff').holds(grid)).toBe(false) // corners red, yellow, yellow, red
    expect(rule('corners-diff').holds(g('rbgy' + 'gyrb' + 'brgy' + 'bgyg'))).toBe(true) // red, yellow, blue, green
    expect(rule('full').holds(g('rbgy' + 'gyrb' + 'brgy' + 'ygb.'))).toBe(false)
    expect(rule('exactly-0-4').holds(grid)).toBe(true)
    expect(rule('next-0-1').holds(g('rb..' + '....' + '....' + '....'))).toBe(true)
    expect(rule('next-0-1').holds(g('r...' + '....' + '....' + '...r'))).toBe(false)
  })
  it('makes twelve different kinds of rule that all hold for the hidden grid, the same for everyone', () => {
    for (let i = 0; i < 60; i++) {
      const seed = `2027-02-${i}`
      const { rules, hidden } = rulesFor(seed)
      expect(rules.map((r) => r.id)).toEqual(rulesFor(seed).rules.map((r) => r.id))
      expect(rules).toHaveLength(LEVELS)
      expect(rules[0].id).toBe('full')
      expect(new Set(rules.map((r) => r.id.split('-')[0])).size).toBe(LEVELS)
      expect(judge(rules, LEVELS, hidden).ok).toBe(true)
    }
    expect(rulesFor('x', 1).rules.map((r) => r.id)).not.toEqual(rulesFor('x').rules.map((r) => r.id))
  })
  it('reports which rules fail', () => {
    const { rules } = rulesFor('2027-03-01')
    const empty: Grid = Array(16).fill(null)
    expect(judge(rules, 1, empty)).toEqual({ ok: false, failing: [0] })
  })
})
