import { describe, expect, it } from 'vitest'
import { guessScore, questionFor } from './pick'
import { QUESTIONS } from './questions'

describe('This or That', () => {
  it('never repeats a question within the list length', () => {
    const seen = new Set<number>()
    for (let d = 0; d < QUESTIONS.length; d++) seen.add(questionFor(new Date(2027, 0, 1 + d)).id)
    expect(seen.size).toBe(QUESTIONS.length)
  })
  it('gives everyone the same question on a date, before launch too', () => {
    expect(questionFor(new Date(2026, 10, 18))).toEqual(questionFor(new Date(2026, 10, 18, 23)))
  })
  it('scores the guess by distance from the real split', () => {
    expect(guessScore(55, 62, 38)).toEqual({ actualA: 62, off: 7, score: 93 })
    expect(guessScore(50, 0, 0)).toEqual({ actualA: 50, off: 0, score: 100 })
  })
})
