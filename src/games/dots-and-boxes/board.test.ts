import { describe, expect, it } from 'vitest'
import { aiMove, capturesOf, controlValue, geometry, isOver, newGame, play, safeOf, scores, type Level, type State } from './board'
import { seededRandom } from '../../shell/daily'

const drawn = (s: State) => Uint8Array.from(s.lines, (x) => (x == null ? 0 : 1))
const drawAll = (s: State, es: number[]) => es.reduce((st, e) => play(st, e).state, s)

describe('Dots & Boxes rules', () => {
  it('numbers 40 lines and 16 boxes on a 4×4 board, each box with four sides', () => {
    const g = geometry(4, 4)
    expect(g.E).toBe(40)
    expect(g.boxEdges).toHaveLength(16)
    expect(g.boxEdges.every((es) => new Set(es).size === 4)).toBe(true)
    expect(g.edgeBoxes.filter((bs) => bs.length === 1)).toHaveLength(16) // the border
  })
  it('claims a box on its fourth side and gives the same player another turn', () => {
    const g = geometry(2, 2)
    let s = newGame(2, 2)
    const [top, bottom, left, right] = g.boxEdges[0]
    s = drawAll(s, [top, bottom, left]) // players 0, 1, 0
    expect(s.turn).toBe(1)
    const { state, claimed } = play(s, right)
    expect(claimed).toBe(1)
    expect(state.boxes[0]).toBe(1)
    expect(state.turn).toBe(1) // draws again
  })
  it('passes the turn when no box is finished', () => {
    const s = play(newGame(3, 3), 0).state
    expect(s.turn).toBe(1)
    expect(play(s, 0).state).toBe(s) // a drawn line can't be drawn again
  })
  it('one line can finish two boxes at once', () => {
    const g = geometry(1, 2)
    const shared = g.boxEdges[0][3]
    const others = [...g.boxEdges[0], ...g.boxEdges[1]].filter((e) => e !== shared)
    let s = drawAll(newGame(1, 2), others)
    const { claimed, state } = play(s, shared)
    expect(claimed).toBe(2)
    expect(isOver(state)).toBe(true)
    s = state
    expect(scores(s)[0] + scores(s)[1]).toBe(2)
  })
})

describe('chain values', () => {
  it('values chains and loops for the player in control', () => {
    expect(controlValue([3], [])).toBe(3)
    expect(controlValue([3, 3], [])).toBe(2) // takes one but one... hands back two to keep control
    expect(controlValue([1, 1], [])).toBe(0)
    expect(controlValue([2, 3], [])).toBe(-1)
    expect(controlValue([], [4])).toBe(4)
  })
})

describe('computer players', () => {
  const random = (s: State, r: () => number) => { const free = s.lines.flatMap((x, e) => (x == null ? [e] : [])); return free[Math.floor(r() * free.length)] }
  const playOut = (size: number, a: (s: State) => number, b: (s: State) => number, first: 0 | 1 = 0) => {
    let s = newGame(size, size, first)
    while (!isOver(s)) s = play(s, (s.turn === 0 ? a : b)(s)).state
    return scores(s)
  }

  it('medium and hard never give a box away while a safe line is left, and medium always takes a free box', () => {
    for (const level of ['medium', 'hard'] as Level[]) {
      const r = seededRandom(`dots-safe-${level}`)
      for (let game = 0; game < 25; game++) {
        let s = newGame(4, 4)
        while (!isOver(s)) {
          if (s.turn === 1) {
            const g = geometry(4, 4), d = drawn(s)
            const safe = safeOf(g, d), caps = capturesOf(g, d)
            const e = aiMove(s, level, r)
            if (safe.length && !caps.length) expect(safe).toContain(e)
            // (Hard may hand back the last two boxes of a chain instead; that is tested below.)
            if (caps.length && safe.length && level === 'medium') expect(caps).toContain(e)
            s = play(s, e).state
          } else s = play(s, random(s, r)).state
        }
      }
    }
  })

  it('every level only plays lines that are free', () => {
    for (const level of ['easy', 'medium', 'hard'] as Level[]) {
      const r = seededRandom(`dots-free-${level}`)
      const sc = playOut(3, (s) => aiMove(s, level, r), (s) => random(s, r))
      expect(sc[0] + sc[1]).toBe(9)
    }
  })

  it('hard beats medium most of the time, and medium beats easy', () => {
    const r = seededRandom('dots-ladder')
    let hardWins = 0, medWins = 0
    for (let i = 0; i < 20; i++) {
      const [h, m] = playOut(4, (s) => aiMove(s, 'hard', r), (s) => aiMove(s, 'medium', r), (i % 2) as 0 | 1)
      if (h > m) hardWins++
      const [m2, e] = playOut(4, (s) => aiMove(s, 'medium', r), (s) => aiMove(s, 'easy', r), (i % 2) as 0 | 1)
      if (m2 > e) medWins++
    }
    expect(hardWins).toBeGreaterThanOrEqual(13)
    expect(medWins).toBeGreaterThanOrEqual(16)
  }, 60000)

  it('hard hands back the last two boxes of a chain to keep control when that pays', () => {
    // A 2×3 board as two chains of three: each row has its top and bottom drawn, both ends open.
    const g = geometry(2, 3)
    let s = newGame(2, 3)
    const across = [...new Set(g.boxEdges.flatMap((es) => [es[0], es[1]]))]
    s = { ...s, lines: s.lines.map((x, i) => (across.includes(i) ? 0 : x)), turn: 0 }
    // The opponent (player 0) opens the top chain at its left end.
    s = play(s, g.boxEdges[0][2]).state
    expect(s.turn).toBe(1)
    // The computer takes box 0, then hands back boxes 1 and 2, keeping control of the bottom chain.
    s = play(s, aiMove(s, 'hard')).state
    expect(s.boxes[0]).toBe(1)
    const e = aiMove(s, 'hard')
    const next = play(s, e)
    expect(next.claimed).toBe(0) // declined
    expect(next.state.turn).toBe(0)
  })
})
