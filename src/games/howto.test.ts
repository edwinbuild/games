import { describe, expect, it } from 'vitest'
import { HOW_TO } from './howto'
import { GAMES } from './registry'
import { TAGLINES } from './taglines'

describe('how-to text', () => {
  it('exists for every game, and only for games that exist', () => {
    for (const g of GAMES) {
      expect(HOW_TO[g.slug], g.slug).toBeDefined()
      expect(HOW_TO[g.slug].length, g.slug).toBeGreaterThanOrEqual(1)
      for (const p of HOW_TO[g.slug]) expect(p.length, g.slug).toBeGreaterThan(40)
    }
    expect(Object.keys(HOW_TO).sort()).toEqual(GAMES.map((g) => g.slug).sort())
  })
})

describe('taglines', () => {
  it('exist for every game, and only for games that exist', () => {
    for (const g of GAMES) expect(TAGLINES[g.slug]?.length ?? 0, g.slug).toBeGreaterThan(30)
    expect(Object.keys(TAGLINES).sort()).toEqual(GAMES.map((g) => g.slug).sort())
  })
})
