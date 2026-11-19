import { describe, expect, it } from 'vitest'
import { isBlocked } from '../../shell/filter'
import { canStep, neighbours, parFor, puzzleFor, shortest } from './ladder'
import { WORDS } from './words'

const day = (i: number) => { const d = new Date(2027, 0, 4 + i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

describe('Word Ladder', () => {
  it('has a clean list of four-letter words', () => {
    expect(new Set(WORDS).size).toBe(WORDS.length)
    for (const w of WORDS) expect(w).toMatch(/^[a-z]{4}$/)
    expect(WORDS.filter(isBlocked)).toEqual([])
  })
  it('steps change exactly one letter into a real word', () => {
    expect(canStep('cold', 'cord')).toBe(true)
    expect(canStep('cold', 'card')).toBe(false) // two letters
    expect(canStep('cold', 'cold')).toBe(false)
    expect(canStep('cold', 'colq')).toBe(false) // not a word
    expect(neighbours('cold')).toContain('bold')
  })
  it('finds the shortest ladder', () => {
    const p = shortest('cold', 'warm')!
    expect(p[0]).toBe('cold')
    expect(p[p.length - 1]).toBe('warm')
    for (let i = 1; i < p.length; i++) expect(canStep(p[i - 1], p[i])).toBe(true)
  })
  it('makes a day whose par is the shortest ladder, longer later in the week', () => {
    expect(parFor('2027-01-04')).toBe(3) // Monday
    expect(parFor('2027-01-10')).toBe(6) // Sunday
    for (let i = 0; i < 42; i++) {
      const p = puzzleFor(day(i))
      expect(p).toEqual(puzzleFor(day(i)))
      expect(shortest(p.start, p.end)!.length - 1).toBe(p.par)
    }
  })
})
