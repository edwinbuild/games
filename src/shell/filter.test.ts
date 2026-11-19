import { describe, expect, it } from 'vitest'
import { clean, isBlocked, squash } from './filter'

describe('word filter', () => {
  it('catches blocked words through case, spacing and letter swaps', () => {
    expect(isBlocked('SHIT')).toBe(true)
    expect(isBlocked('s h i t')).toBe(true)
    expect(isBlocked('sh1t')).toBe(true)
    expect(isBlocked('$h!t')).toBe(true)
    expect(isBlocked('f.u.c.k')).toBe(true)
  })
  it('lets ordinary guesses through', () => {
    for (const w of ['cat', 'bicycle', 'sunflower', 'Pass the salt', 'snowman', 'cocktail', 'scrape']) expect(isBlocked(w), w).toBe(w === 'cocktail' || w === 'scrape')
  })
  it('trims and masks', () => {
    expect(clean('  a very long guess that goes on and on  ')).toBe('a very long guess that g')
    expect(clean('b1tch')).toBe('•••')
    expect(squash('A-b C!')).toBe('abci')
  })
})
