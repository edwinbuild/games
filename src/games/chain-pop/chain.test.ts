import { describe, expect, it } from 'vitest'
import { bestTap, boardFor, bubbleAt, chain, COUNT, POP_DELAY, RADIUS, RING_SPEED, type Bubble } from './chain'

describe('Chain Pop', () => {
  it('pops along a line in order, with exact times', () => {
    const line: Bubble[] = [0, 1, 2].map((k) => ({ x: 50 + k * 40, y: 50, size: 1 }))
    const pops = chain(line, 0)
    expect(pops.map((p) => p.i)).toEqual([0, 1, 2])
    const gap = 40 - RADIUS[1]
    expect(pops[1].t).toBeCloseTo(POP_DELAY + gap / RING_SPEED)
    expect(pops[2].t).toBeCloseTo(2 * (POP_DELAY + gap / RING_SPEED))
    expect(pops[2].from).toBe(1)
  })
  it('stops where no ring reaches', () => {
    const far: Bubble[] = [{ x: 20, y: 20, size: 0 }, { x: 200, y: 300, size: 2 }]
    expect(chain(far, 0).length).toBe(1)
  })
  it('gives the same result for the same tap, every time', () => {
    const b = boardFor('same')
    expect(chain(b, 7)).toEqual(chain(b, 7))
    expect(boardFor('same')).toEqual(b)
  })
  it('makes every daily board for a year worth playing: a good tap pops at least half, none clears it', () => {
    for (let d = 0; d < 365; d++) {
      const b = boardFor(`2027-day-${d}`)
      expect(b.length).toBe(COUNT)
      const best = bestTap(b).popped
      expect(best).toBeGreaterThanOrEqual(COUNT / 2)
      expect(best).toBeLessThan(COUNT)
    }
  })
  it('finds the bubble under a finger, with a little slack', () => {
    const b: Bubble[] = [{ x: 100, y: 100, size: 1 }, { x: 160, y: 100, size: 0 }]
    expect(bubbleAt(b, 100, 100)).toBe(0)
    expect(bubbleAt(b, 100 + RADIUS[1] + 5, 100)).toBe(0)
    expect(bubbleAt(b, 130, 140)).toBe(-1)
  })
})
