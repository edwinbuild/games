import { describe, expect, it } from 'vitest'
import { mergeStats, mergeToday } from './sync'
import type { Stats } from './stats'

const base = (x: Partial<Stats>): Stats => ({ plays: 0, best: null, lastDaily: null, streak: 0, maxStreak: 0, daily: {}, ...x })

describe('merging two devices', () => {
  it('keeps every day played and the better result on days both played (lower is better)', () => {
    const phone = base({ low: true, daily: { '2026-11-18': 0.04, '2026-11-19': 0.2 }, dailyText: { '2026-11-18': '0.04s', '2026-11-19': '0.20s' }, lastDaily: '2026-11-19', streak: 2, maxStreak: 2 })
    const laptop = base({ low: true, daily: { '2026-11-17': 0.5, '2026-11-19': 0.1 }, dailyText: { '2026-11-17': '0.50s', '2026-11-19': '0.10s' }, lastDaily: '2026-11-19', streak: 1, maxStreak: 1 })
    const m = mergeStats(phone, laptop)
    expect(m.daily).toEqual({ '2026-11-17': 0.5, '2026-11-18': 0.04, '2026-11-19': 0.1 })
    expect(m.dailyText?.['2026-11-19']).toBe('0.10s')
    expect(m.streak).toBe(3) // 17, 18, 19 in a row once merged
    expect(m.maxStreak).toBe(3)
  })
  it('a guest with a 5-day streak keeps it when the account has nothing', () => {
    const days = Object.fromEntries(['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'].map((d) => [d, 1]))
    const guest = base({ daily: days, lastDaily: '2026-11-19', streak: 5, maxStreak: 5 })
    const m = mergeStats(guest, base({}))
    expect(m.streak).toBe(5)
    expect(m.maxStreak).toBe(5)
  })
  it('takes the higher best when higher is better, with its text, and the larger play count', () => {
    const a = base({ low: false, best: 12, bestText: '12 planets', plays: 7 })
    const b = base({ low: false, best: 9, bestText: '9 planets', plays: 10 })
    const m = mergeStats(a, b)
    expect([m.best, m.bestText, m.plays]).toEqual([12, '12 planets', 10])
  })
  it('a played day without a score never replaces one with a score', () => {
    const m = mergeStats(base({ daily: { '2026-11-19': null } }), base({ daily: { '2026-11-19': 3 } }))
    expect(m.daily['2026-11-19']).toBe(3)
  })
  it("today's tries: the newer day wins, then the copy with more tries", () => {
    expect(mergeToday({ date: '2026-11-19', value: [1, 2] }, { date: '2026-11-20', value: [] })?.date).toBe('2026-11-20')
    expect(mergeToday({ date: '2026-11-20', value: [1] }, { date: '2026-11-20', value: [1, 2] })?.value).toEqual([1, 2])
    expect(mergeToday(null, { date: '2026-11-20', value: 1 })?.value).toBe(1)
  })
})
