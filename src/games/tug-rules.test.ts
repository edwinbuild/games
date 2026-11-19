import { describe, expect, it } from 'vitest'
import { counts, pull, tugWinner, WIN_STEPS } from './tug-rules'

describe('tug rules', () => {
  it('each tap moves the rope one step toward the tapper', () => {
    expect(pull(0, 0)).toBe(-1)
    expect(pull(0, 1)).toBe(1)
  })
  it('wins at 20 steps either way, not before', () => {
    expect(tugWinner(WIN_STEPS - 1)).toBeNull()
    expect(tugWinner(WIN_STEPS)).toBe(1)
    expect(tugWinner(-WIN_STEPS)).toBe(0)
  })
  it('only pulls when thumbs alternate', () => {
    expect(counts(null, 'left')).toBe(true)
    expect(counts('left', 'right')).toBe(true)
    expect(counts('right', 'right')).toBe(false)
    // Mashing one side ten times pulls once; alternating ten times pulls ten.
    let last: 'left' | 'right' | null = null, mash = 0, alt = 0
    for (let i = 0; i < 10; i++) { if (counts(last, 'left')) mash++; last = 'left' }
    last = null
    for (let i = 0; i < 10; i++) { const s = i % 2 ? 'right' : 'left'; if (counts(last, s)) alt++; last = s }
    expect([mash, alt]).toEqual([1, 10])
  })
})
