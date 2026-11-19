import { describe, expect, it } from 'vitest'
import { count } from './plural'

describe('count', () => {
  it('uses the singular only for exactly one', () => {
    expect(count(1, 'mirror')).toBe('1 mirror')
    expect(count(0, 'mirror')).toBe('0 mirrors')
    expect(count(2, 'block')).toBe('2 blocks')
    expect(count(1, 'try', 'tries')).toBe('1 try')
    expect(count(3, 'try', 'tries')).toBe('3 tries')
  })
})
