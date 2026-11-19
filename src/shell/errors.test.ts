import { describe, expect, it } from 'vitest'
import { firstLine, pageFor } from './errors'

describe('error reports', () => {
  it('name the page by its first path part', () => {
    expect(pageFor('/')).toBe('home')
    expect(pageFor('/rule-stack/')).toBe('rule-stack')
    expect(pageFor('/c/logic/')).toBe('category')
    expect(pageFor('/about/')).toBe('about')
  })
  it('keep only the first line, up to 160 characters', () => {
    expect(firstLine('TypeError: x\n  at f (game.js:1:2)')).toBe('TypeError: x')
    expect(firstLine('z'.repeat(300))).toHaveLength(160)
  })
})
