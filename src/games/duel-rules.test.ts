import { describe, expect, it } from 'vitest'
import { GRACE_MS, judgeRound, matchWinner } from './duel-rules'

describe('duel rules', () => {
  it('a tap before go loses the round for that player', () => {
    expect(judgeRound([{ player: 1, t: 50 }], null)).toEqual({ kind: 'early', loser: 1 })
  })
  it('ignores taps inside the grace window', () => {
    expect(judgeRound([{ player: 0, t: 1000 + GRACE_MS - 1 }], 1000)).toBe('pending')
  })
  it('first valid tap wins, with its reaction time', () => {
    expect(judgeRound([{ player: 1, t: 1250 }, { player: 0, t: 1300 }], 1000)).toEqual({ kind: 'win', winner: 1, ms: 250 })
  })
  it('two players within 10 ms is a tie', () => {
    expect(judgeRound([{ player: 0, t: 1200 }, { player: 1, t: 1205 }], 1000)).toEqual({ kind: 'tie' })
  })
  it('first to three wins the match', () => {
    expect(matchWinner([2, 2])).toBeNull()
    expect(matchWinner([3, 1])).toBe(0)
  })
})
