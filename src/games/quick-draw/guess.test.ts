import { describe, expect, it } from 'vitest'
import { blanks, isClose, isRight, norm, wordFor } from './guess'
import { WORD_LIST } from './words'
import { isBlocked } from '../../shell/filter'

describe('Quick Draw words', () => {
  it('has at least 300 different, clean words, phrases kept whole', () => {
    expect(WORD_LIST.length).toBeGreaterThanOrEqual(300)
    expect(new Set(WORD_LIST).size).toBe(WORD_LIST.length)
    for (const w of WORD_LIST) {
      expect(w).toMatch(/^[a-z][a-z -]*[a-z]$/)
      expect(isBlocked(w), w).toBe(false)
    }
    for (const p of ['ice cream', 'hot air balloon', 'teddy bear']) expect(WORD_LIST).toContain(p)
    expect(WORD_LIST).not.toContain('cream')
  })
  it('deals the same words to every phone in a room', () => {
    expect(wordFor('seed', 3)).toBe(wordFor('seed', 3))
    expect(new Set([0, 1, 2, 3, 4, 5, 6, 7].map((k) => wordFor('seed', k))).size).toBe(8)
  })
})

describe('Quick Draw guessing', () => {
  it('accepts case, spaces and simple plurals', () => {
    expect(isRight('Cat', 'cat')).toBe(true)
    expect(isRight(' cats ', 'cat')).toBe(true)
    expect(isRight('Ice-Cream', 'ice cream')).toBe(true)
    expect(isRight('boxes', 'box')).toBe(true)
    expect(isRight('cherries', 'cherry')).toBe(true)
    expect(isRight('dog', 'cat')).toBe(false)
    expect(isRight('', 'cat')).toBe(false)
    expect(norm('Glass')).toBe('glass')
  })
  it('spots guesses one letter away', () => {
    expect(isClose('rabit', 'rabbit')).toBe(true)
    expect(isClose('lamb', 'lamp')).toBe(true)
    expect(isClose('lamps', 'lamp')).toBe(false) // a plural is simply right, not close
    expect(isRight('lamps', 'lamp')).toBe(true)
    expect(isClose('dog', 'cat')).toBe(false)
  })
  it('shows the word as blanks', () => {
    expect(blanks('ice cream')).toBe('_ _ _    _ _ _ _ _')
  })
})
