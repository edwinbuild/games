import { describe, expect, it } from 'vitest'
import { fromShare, offBy, questionFor, show, toShare, WRITTEN_COUNT, YEAR } from './questions'

describe('Guess the Crowd questions', () => {
  it('has at least 120 written questions and 365 different ones in the year', () => {
    expect(WRITTEN_COUNT).toBeGreaterThanOrEqual(120)
    expect(YEAR.length).toBe(365)
    expect(new Set(YEAR.map((q) => q.prompt + q.min + q.max)).size).toBe(365)
    for (const q of YEAR) {
      expect(q.max).toBeGreaterThan(q.min)
      expect(q.step).toBeGreaterThan(0)
      expect(Number.isInteger(Math.round(((q.max - q.min) / q.step) * 1e6) / 1e6)).toBe(true)
    }
  })
  it('asks a different question every day for a year', () => {
    const ids = new Set<number>()
    for (let d = 0; d < 365; d++) ids.add(questionFor(new Date(2027, 0, 1 + d)).id)
    expect(ids.size).toBe(365)
  })
  it('stores answers as a share of the range and scores guesses in percent of the range', () => {
    const q = { prompt: '', min: 0, max: 200, step: 1, unit: '' }
    expect(toShare(q, 50)).toBe(0.25)
    expect(fromShare(q, 0.25)).toBe(50)
    expect(offBy(q, 60, 0.25)).toBe(5)
  })
  it('shows values with units and clock times', () => {
    expect(show({ prompt: '', min: 0, max: 12, step: 0.5, unit: 'h' }, 7.5)).toBe('7.5 h')
    expect(show({ prompt: '', min: 4, max: 11, step: 0.5, unit: 'am' }, 6.5)).toBe('06:30')
    expect(show({ prompt: '', min: 20, max: 26, step: 0.5, unit: 'h' }, 24.5)).toBe('00:30')
    expect(show({ prompt: '', min: 0, max: 20000, step: 500, unit: 'steps' }, 7520)).toBe('7,500 steps')
    expect(show({ prompt: '', min: -20, max: 45, step: 1, unit: '°C' }, 21)).toBe('21°C')
  })
})
