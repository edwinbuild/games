import { describe, expect, it } from 'vitest'
import { pull, tugWinner, WIN_STEPS } from './tug-rules'

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
})
