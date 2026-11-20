import { describe, expect, it } from 'vitest'
import { answersFor, keyMarks, mark, MODES, scoreOf, scoreText, solvedAt, type Mode } from './rules'
import { parseWords } from './words'
import { isBlocked } from '../../shell/filter'
import list from '../../../public/words/hidden-word.txt?raw'

const { guesses: GUESSES, answers: ANSWERS } = parseWords(list)
const M = (s: string) => [...s].map((c) => ({ R: 'right', E: 'elsewhere', O: 'out' })[c])

describe('marks', () => {
  it('right spot, elsewhere, out', () => {
    expect(mark('crane', 'trace')).toEqual(M('ERROR')) // c elsewhere, r a right, n out, e right
    expect(mark('crane', 'crane')).toEqual(M('RRRRR'))
    expect(mark('ghost', 'crane')).toEqual(M('OOOOO'))
  })
  it('never marks a double letter twice for a single one in the word', () => {
    expect(mark('speed', 'abide')).toEqual(M('OOEOE')) // one e in "abide": only the first e counts
    expect(mark('eerie', 'there')).toEqual(M('EOEOR'))
    expect(mark('llama', 'hello')).toEqual(M('EEOOO')) // two l's elsewhere, matching hello's two
    expect(mark('lolly', 'hello')).toEqual(M('OERRO')) // the right spots use up both l's first
  })
})

describe('games', () => {
  it('the same hidden words for everyone, all different, all common words', () => {
    for (const mode of Object.keys(MODES) as Mode[]) {
      const a = answersFor(mode, '2027-01-05', ANSWERS)
      expect(answersFor(mode, '2027-01-05', ANSWERS)).toEqual(a)
      expect(new Set(a).size).toBe(MODES[mode].boards)
      for (const w of a) expect(GUESSES.has(w)).toBe(true)
    }
    expect(answersFor('hidden-word', '2027-01-05', ANSWERS)).not.toEqual(answersFor('hidden-word', '2027-01-06', ANSWERS))
  })
  it('scores: guesses used when all are solved, else past the limit by the boards missed', () => {
    expect(scoreOf('hidden-word', ['crane', 'trace'], ['trace'])).toBe(2)
    expect(scoreText('hidden-word', 2)).toBe('2/6')
    expect(scoreText('hidden-word', scoreOf('hidden-word', Array(6).fill('crane'), ['trace']))).toBe('X/6')
    const four = ['about', 'react', 'solve', 'three']
    expect(scoreOf('four-words', ['about', 'react', 'solve', 'three'], four)).toBe(4)
    expect(scoreText('four-words', scoreOf('four-words', ['about', 'react', ...Array(7).fill('crane')], four))).toBe('2 of 4 words')
    expect(solvedAt(['react', 'about'], four)).toEqual([1, 0, null, null])
  })
  it('the keyboard keeps the best mark per board and ignores guesses after a board is solved', () => {
    const k = keyMarks(['trace', 'crane'], ['trace', 'cramp'])
    expect(k.t).toEqual(['right', 'out'])
    expect(k.n[0]).toBeNull() // "crane" came after board 1 was solved
    expect(k.n[1]).toBe('out')
    expect(k.c).toEqual(['right', 'right'])
  })
  it('the lists: 890 answers, about 5,000 guesses, nothing rude', () => {
    expect(ANSWERS.length).toBeGreaterThan(800)
    expect(GUESSES.size).toBeGreaterThan(4500)
    expect([...GUESSES].filter((w) => isBlocked(w))).toEqual([])
    expect(ANSWERS.every((w) => GUESSES.has(w))).toBe(true)
  })
})
