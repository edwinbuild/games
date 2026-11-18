import { describe, expect, it } from 'vitest'
import { decodeChallenge, encodeChallenge, mergeRow, MAX_ROWS, type Row } from './challenge'

const row = (i: string, x: number, n = ''): Row => ({ n, i, x, t: String(x) })

describe('challenge links', () => {
  it('round-trips through the link, names with any characters included', () => {
    const c = { g: 'blind-timer', s: '2027-01-04', r: [row('a1', 0.04, 'Ana'), row('b2', 0.1, 'Jürgen 🎯')] }
    expect(decodeChallenge(encodeChallenge(c))).toEqual(c)
  })

  it('rejects broken or hostile links', () => {
    expect(decodeChallenge('not-base64!')).toBeNull()
    expect(decodeChallenge(btoa(JSON.stringify({ g: '../x', s: '1', r: [] })))).toBeNull()
    const sneaky = { g: 'memory-path', s: 'x', r: [{ n: '<b>hi</b>', i: 'zz', x: 3, t: '3' }, { n: 'x', i: 'y', x: 'NaN', t: '' }] }
    const d = decodeChallenge(btoa(JSON.stringify(sneaky)))
    expect(d?.r).toEqual([{ n: 'bhi/b', i: 'zz', x: 3, t: '3' }])
  })

  it('keeps each player once, at their best, best first, at most 8', () => {
    let rows: Row[] = []
    rows = mergeRow(rows, row('me', 300), true)
    rows = mergeRow(rows, row('sam', 250, 'Sam'), true)
    rows = mergeRow(rows, row('me', 320), true) // worse: kept at 300
    expect(rows.map((r) => [r.i, r.x])).toEqual([['sam', 250], ['me', 300]])
    rows = mergeRow(rows, row('me', 200), true) // better: replaces
    expect(rows[0]).toMatchObject({ i: 'me', x: 200 })
    for (let k = 0; k < 12; k++) rows = mergeRow(rows, row(`p${k}`, 400 + k), true)
    expect(rows.length).toBe(MAX_ROWS)
    expect(rows[0].i).toBe('me')
  })

  it('ranks higher-is-better games the other way', () => {
    const rows = mergeRow([row('a', 5), row('b', 9)], row('me', 7), false)
    expect(rows.map((r) => r.x)).toEqual([9, 7, 5])
  })
})
