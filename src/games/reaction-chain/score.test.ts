import { describe, expect, it } from 'vitest'
import { PENALTY, summarize } from './score'

const clean = (ms: number) => ({ ms, early: false })
const early = { ms: PENALTY, early: true }

describe('Reaction Chain scoring', () => {
  it('does not count five false starts, and has no fastest round', () => {
    expect(summarize([early, early, early, early, early])).toEqual({ avg: 500, clean: 0, fastest: null, counts: false })
  })
  it('takes the fastest from clean taps only, and averages penalties in', () => {
    const s = summarize([clean(300), early, clean(250), clean(280), early])
    expect(s).toEqual({ avg: Math.round((300 + 500 + 250 + 280 + 500) / 5), clean: 3, fastest: 250, counts: true })
  })
  it('needs at least three clean taps to count', () => {
    expect(summarize([clean(200), clean(210), early, early, early]).counts).toBe(false)
    expect(summarize([clean(200), clean(210), clean(220), early, early]).counts).toBe(true)
  })
  it('handles a clean run', () => {
    expect(summarize([240, 250, 260, 270, 280].map(clean))).toMatchObject({ avg: 260, fastest: 240, counts: true })
  })
})
