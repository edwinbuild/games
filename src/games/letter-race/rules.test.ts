import { describe, expect, it } from 'vitest'
import { allWords, canMake, check, lettersFor, pointsFor, score } from './rules'
import { parseWords } from './words'
import { isBlocked } from '../../shell/filter'
import list from '../../../public/words/letter-race.txt?raw'

const { words: WORDS, seeds: SEEDS } = parseWords(list)
const L = [...'garden'.padEnd(7, 's')] // g a r d e n s

describe('letters', () => {
  it('come from 1,350 starting words, all in the list', () => {
    expect(SEEDS).toHaveLength(1350)
    expect(SEEDS.every((w) => WORDS.has(w) && w.length === 7)).toBe(true)
  })
  it('are a shuffled common word, the same for everyone with the same seed', () => {
    for (const s of ['A', 'B', 'K7MQ2:1', 'xyz']) {
      const l = lettersFor(s, SEEDS)
      expect(l).toEqual(lettersFor(s, SEEDS))
      expect(l).toHaveLength(7)
      expect(SEEDS.some((w) => [...w].sort().join('') === [...l].sort().join(''))).toBe(true)
      expect(SEEDS).not.toContain(l.join(''))
    }
  })
  it('always have plenty of words inside', () => {
    for (let i = 0; i < 40; i++) expect(allWords(lettersFor(`s${i}`, SEEDS), WORDS).length).toBeGreaterThanOrEqual(20)
  })
})

describe('words', () => {
  it('uses each letter only as often as it appears', () => {
    expect(canMake('dangers', L)).toBe(true)
    expect(canMake('garage', L)).toBe(false)
  })
  it('says why a word doesn’t count', () => {
    expect(check('an', L, WORDS, [])).toBe('short')
    expect(check('dog', L, WORDS, [])).toBe('letters')
    expect(check('grand', L, WORDS, ['grand'])).toBe('again')
    expect(check('dnarg', L, WORDS, [])).toBe('unknown')
    expect(check('grand', L, WORDS, [])).toBe('ok')
  })
  it('scores longer words more', () => {
    expect([3, 4, 5, 6, 7].map((n) => pointsFor('x'.repeat(n)))).toEqual([1, 2, 4, 6, 10])
  })
  it('doubles words only one player found, and ignores words that don’t count', () => {
    const s = score({ a: ['grand', 'dear', 'zzz'], b: ['dear', 'red', 'red'] }, L, WORDS)
    const a = s.find((x) => x.id === 'a')!, b = s.find((x) => x.id === 'b')!
    expect(a.points).toBe(4 * 2 + 2)
    expect(b.points).toBe(2 + 1 * 2)
    expect(a.words.map((w) => w.word)).toEqual(['grand', 'dear'])
  })
  it('a player alone gets no doubles', () => {
    expect(score({ a: ['grand'] }, L, WORDS)[0].points).toBe(4)
  })
  it('the list has no rude words', () => {
    expect([...WORDS].filter((w) => isBlocked(w))).toEqual([])
  })
})
