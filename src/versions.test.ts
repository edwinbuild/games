import { describe, expect, it } from 'vitest'
import pkg from '../package.json?raw'
import { VERSION, VERSIONS } from './versions'

describe('site version', () => {
  it('matches package.json and runs newest first', () => {
    expect(JSON.parse(pkg).version).toBe(VERSION)
    const key = (v: string) => v.split('.').map((n) => n.padStart(4, '0')).join('.')
    expect(VERSIONS.map((x) => key(x.v))).toEqual([...VERSIONS.map((x) => key(x.v))].sort().reverse())
    for (const x of VERSIONS) expect(x.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
