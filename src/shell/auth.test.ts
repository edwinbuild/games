import { beforeEach, describe, expect, it } from 'vitest'

const store = new Map<string, string>()
beforeEach(() => {
  store.clear()
  globalThis.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } as Storage
})
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
const token = (p: object) => `${b64({ alg: 'HS256' })}.${b64(p)}.sig`

describe('sign-in session', () => {
  it('reads the player from a token', async () => {
    const { readToken } = await import('./auth')
    expect(readToken(token({ sub: 'u1', email: 'a@b.c', exp: 99 }))).toEqual({ id: 'u1', email: 'a@b.c', exp: 99 })
    expect(readToken('nonsense')).toBeNull()
  })
  it('stores the session from an email link and reports it once', async () => {
    const { captureRedirect, getSession, signedIn, takeAuthNotice } = await import('./auth')
    const exp = Math.floor(Date.now() / 1000) + 3600
    captureRedirect(`#access_token=${token({ sub: 'u1', email: 'a@b.c', exp })}&refresh_token=r1&expires_at=${exp}&token_type=bearer&type=magiclink`)
    expect(signedIn()).toBe(true)
    expect(getSession()?.user).toEqual({ id: 'u1', email: 'a@b.c' })
    expect(takeAuthNotice()).toEqual({ kind: 'signed-in' })
    expect(takeAuthNotice()).toBeNull()
  })
  it('explains an expired link', async () => {
    const { captureRedirect, signedIn, takeAuthNotice } = await import('./auth')
    captureRedirect('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')
    expect(signedIn()).toBe(false)
    expect(takeAuthNotice()).toEqual({ kind: 'error', message: expect.stringMatching(/expired/) })
  })
  it('ignores an address without sign-in details', async () => {
    const { captureRedirect, signedIn } = await import('./auth')
    captureRedirect('#section-2')
    expect(signedIn()).toBe(false)
  })
})
