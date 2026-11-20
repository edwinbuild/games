import { describe, expect, it } from 'vitest'
import { bannerLive, rerolled } from './config'

describe('site settings', () => {
  it('re-rolls only the named game and day', () => {
    const r = { 'garden-path:2026-11-20': 1 }
    expect(rerolled('garden-path:2026-11-20', r)).toBe('garden-path:2026-11-20#r1')
    expect(rerolled('rule-stack:2026-11-20:try1', { 'rule-stack:2026-11-20': 2 })).toBe('rule-stack:2026-11-20:try1#r2')
    expect(rerolled('garden-path:2026-11-21', r)).toBe('garden-path:2026-11-21')
    expect(rerolled('word-ladder:2026-11-20', r)).toBe('word-ladder:2026-11-20')
    expect(rerolled('garden-path:2026-11-20', {})).toBe('garden-path:2026-11-20')
  })
  it('shows a banner until its end time', () => {
    expect(bannerLive({ text: 'Hi' })).toBe(true)
    expect(bannerLive({ text: 'Hi', until: '2000-01-01T00:00:00Z' })).toBe(false)
    expect(bannerLive({ text: '' })).toBe(false)
    expect(bannerLive(null)).toBe(false)
  })
})
