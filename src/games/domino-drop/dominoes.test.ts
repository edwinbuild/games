import { describe, expect, it } from 'vitest'
import { autoFacing, boardFor, canPlace, fallen, REACH, run, SPARES, type Block, type Domino } from './dominoes'

const line = (n: number, step: number): Domino[] => Array.from({ length: n }, (_, k) => ({ x: 20 + k * step, y: 100, nx: 1, ny: 0 }))

describe('Domino Drop', () => {
  it('knocks down a straight line in order, each a little later', () => {
    const f = run(line(6, 16), [])
    expect(f.map((x) => x.i)).toEqual([0, 1, 2, 3, 4, 5])
    for (let k = 1; k < f.length; k++) expect(f[k].t).toBeGreaterThan(f[k - 1].t)
  })
  it('stops at a gap wider than the reach', () => {
    const d = line(3, 16).concat({ x: 20 + 32 + REACH + 1, y: 100, nx: 1, ny: 0 })
    expect(run(d, []).length).toBe(3)
  })
  it('does not tip a domino hit side-on, or one outside the cone', () => {
    expect(run([{ x: 0, y: 0, nx: 1, ny: 0 }, { x: 16, y: 0, nx: 0, ny: 1 }], []).length).toBe(1)
    expect(run([{ x: 0, y: 0, nx: 1, ny: 0 }, { x: 10, y: 14, nx: 1, ny: 0 }], []).length).toBe(1)
  })
  it('is stopped by a block in between', () => {
    const blocks: Block[] = [{ x: 30, y: 90, w: 4, h: 20 }]
    expect(run(line(4, 16), blocks).length).toBe(1)
  })
  it('falls the way it is pushed', () => {
    const f = run([{ x: 0, y: 0, nx: 1, ny: 0 }, { x: 16, y: 0, nx: -1, ny: 0 }], [])
    expect(f[1].dx).toBeCloseTo(1)
  })
  it('refuses spares on top of others, near blocks or off the board', () => {
    const d = line(2, 16)
    expect(canPlace({ x: 25, y: 100 }, d, [])).toBe(false)
    expect(canPlace({ x: 80, y: 100 }, d, [])).toBe(true)
    expect(canPlace({ x: 80, y: 100 }, d, [{ x: 70, y: 90, w: 20, h: 20 }])).toBe(false)
    expect(canPlace({ x: 2, y: 100 }, d, [])).toBe(false)
  })
  it('makes every daily board for a year completable with the five spares, and not without them', () => {
    for (let day = 0; day < 365; day++) {
      const { dominoes, blocks, gaps } = boardFor(`2027-day-${day}`)
      expect(gaps.length).toBe(SPARES)
      expect(dominoes.length + SPARES).toBe(40)
      expect(fallen(dominoes, blocks)).toBeLessThan(dominoes.length)
      const spares = gaps.map((g) => {
        expect(canPlace(g, dominoes, blocks)).toBe(true)
        const f = autoFacing(g, dominoes)
        return { ...g, nx: f.x, ny: f.y, spare: true }
      })
      expect(fallen([...dominoes, ...spares], blocks)).toBe(40)
    }
  })
  it('gives everyone the same board', () => {
    expect(boardFor('x')).toEqual(boardFor('x'))
  })
})
