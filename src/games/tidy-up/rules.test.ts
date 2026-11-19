import { describe, expect, it } from 'vitest'
import { boardFor, finalTime, judge, KINDS, MESS, sameWay, SNAP, type Slot } from './rules'

describe('Tidy Up', () => {
  it('knows which turns look the same', () => {
    expect(sameWay('coin', 0, 3)).toBe(true)
    expect(sameWay('eraser', 1, 3)).toBe(true)
    expect(sameWay('eraser', 0, 1)).toBe(false)
    expect(sameWay('key', 2, 2)).toBe(true)
    expect(sameWay('key', 0, 2)).toBe(false)
    expect(sameWay('key', 5, 1)).toBe(true)
  })
  const slots: Slot[] = [{ kind: 'key', x: 100, y: 100, turns: 1 }, { kind: 'coin', x: 200, y: 100, turns: 0 }]
  it('snaps the right item, the right way round, near its slot', () => {
    expect(judge('key', 110, 105, 1, slots, [false, false])).toEqual({ result: 'snap', slot: 0 })
    expect(judge('key', 110, 105, 2, slots, [false, false])).toEqual({ result: 'wrong-way', slot: 0 })
    expect(judge('coin', 100, 100, 3, slots, [false, false])).toEqual({ result: 'wrong-slot', slot: 0 })
    expect(judge('coin', 205, 100, 3, slots, [false, false])).toEqual({ result: 'snap', slot: 1 })
  })
  it('ignores drops far from any slot, and slots already filled', () => {
    expect(judge('key', 100 + SNAP + 1, 100, 1, slots, [false, false])).toEqual({ result: 'free' })
    expect(judge('key', 100, 100, 1, slots, [true, false])).toEqual({ result: 'free' })
  })
  it('builds the same board from the same seed, with every item in the mess and not already fitting', () => {
    expect(boardFor('a')).toEqual(boardFor('a'))
    for (let s = 0; s < 200; s++) {
      const { slots, items } = boardFor(`s${s}`)
      expect(new Set(slots.map((x) => x.kind)).size).toBe(KINDS.length)
      for (const it of items) {
        expect(it.y).toBeGreaterThanOrEqual(MESS.y)
        expect(it.y).toBeLessThanOrEqual(MESS.y + MESS.h)
        const slot = slots.find((x) => x.kind === it.kind)!
        if (it.kind !== 'coin' && it.kind !== 'button') expect(sameWay(it.kind, it.turns, slot.turns)).toBe(false)
      }
    }
  })
  it('adds 2 seconds per wrong-slot drop', () => {
    expect(finalTime(31.23, 0)).toBe(31.2)
    expect(finalTime(31.23, 2)).toBe(35.2)
  })
})
