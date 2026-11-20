// Sign-in, end to end, with stand-ins for the sign-in service and the database (nothing real is
// sent): ask for an email link; come back through the link signed in; this device's progress is
// claimed and synced (a guest's 5-day streak survives); pick a username (live check) and an icon;
// the top bar shows the icon; a reload stays signed in and calls carry the token; an expired link
// explains itself.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = (p) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(p)}.sig`

module.exports = async ({ page, B }) => {
  const ctx = page.context()
  const calls = []
  const profile = { username: null, changesLeft: 5, icon: 'ticket', colour: 'mint', unlocked: [], inviteCode: 'abc123defg', streak: 0, incoming: 0 }
  const remote = { 'stats:word-ladder': { plays: 0, best: null, lastDaily: '2026-11-01', streak: 1, maxStreak: 2, daily: { '2026-11-01': 5 }, low: true } }
  await ctx.route('**/auth/v1/**', async (r) => {
    const url = r.request().url()
    calls.push({ fn: 'auth:' + new URL(url).pathname.split('/').pop(), url, body: r.request().postData() })
    await r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  await ctx.route('**/rest/v1/rpc/**', async (r) => {
    const fn = new URL(r.request().url()).pathname.split('/').pop()
    const body = JSON.parse(r.request().postData() || '{}')
    calls.push({ fn, body, auth: r.request().headers().authorization })
    const json = (v) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(v) })
    if (fn === 'my_profile') return json(profile)
    if (fn === 'check_username') return json(body.p_name.toLowerCase() === 'taken_name' ? 'taken' : null)
    if (fn === 'set_username') { profile.username = body.p_name; return json(profile) }
    if (fn === 'set_icon') { profile.icon = body.p_icon; profile.colour = body.p_colour; return json(profile) }
    if (fn === 'get_data') return json(Object.entries(remote).map(([key, value]) => ({ key, value })))
    if (fn === 'put_data') { Object.assign(remote, body.p_items); return json(Object.keys(body.p_items).length) }
    if (fn === 'claim_device') return json(1)
    return json(null)
  })

  // 1. Ask for a link.
  await page.goto(B + '/rule-stack/')
  await page.getByRole('button', { name: 'Sign in' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Sign in' })
  if (!(await dialog.getByRole('button', { name: 'Continue with Google' }).isDisabled())) throw new Error('Google should say coming soon')
  await dialog.getByLabel('Your email').fill('player@example.com')
  await dialog.getByRole('button', { name: 'Email me a sign-in link' }).click()
  await dialog.getByText(/Check your inbox at player@example.com/).waitFor()
  const otp = calls.find((c) => c.fn === 'auth:otp')
  if (!otp || !/redirect_to=.*%2Frule-stack%2F/.test(otp.url) || JSON.parse(otp.body).email !== 'player@example.com') throw new Error('link request wrong: ' + JSON.stringify(otp))

  // 2. Back through the link, as a guest with a 5-day streak and a board key on this device.
  await page.evaluate(() => {
    const days = {}
    for (const d of ['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19']) days[d] = 4
    localStorage.setItem('qg:stats:word-ladder', JSON.stringify({ plays: 0, best: null, lastDaily: '2026-11-19', streak: 5, maxStreak: 5, daily: days, low: true }))
    localStorage.setItem('qg:board-key', JSON.stringify('0123456789abcdef0123456789abcdef'))
  })
  const exp = Math.floor(Date.now() / 1000) + 3600
  const token = jwt({ sub: '11111111-2222-3333-4444-555555555555', email: 'player@example.com', exp, role: 'authenticated' })
  await page.goto(`${B}/rule-stack/#access_token=${token}&refresh_token=r1&expires_at=${exp}&expires_in=3600&token_type=bearer&type=magiclink`)
  const name = page.getByRole('dialog', { name: 'Your username' })
  await name.waitFor({ timeout: 10000 })
  if (page.url().includes('access_token')) throw new Error('the token stayed in the address')
  if (!calls.some((c) => c.fn === 'claim_device' && c.body.p_key === '0123456789abcdef0123456789abcdef')) throw new Error('device not claimed')
  const pushed = remote['stats:word-ladder']
  if (pushed.streak !== 5 || pushed.maxStreak !== 5 || !('2026-11-01' in pushed.daily)) throw new Error('merge lost progress: ' + JSON.stringify(pushed))
  const local = await page.evaluate(() => JSON.parse(localStorage.getItem('qg:stats:word-ladder')))
  if (!('2026-11-01' in local.daily)) throw new Error('the account’s days did not reach this device')

  // 3. Username with a live check, then an icon.
  const field = name.getByLabel('Username')
  await field.fill('ab')
  await name.getByText(/3 to 16 letters/).waitFor()
  await field.fill('taken_name')
  await name.getByText('Someone already has that name.').waitFor()
  await field.fill('Sam_42')
  await name.getByText('✓ Available').waitFor()
  await name.getByRole('button', { name: 'Use this name' }).click()
  const icons = page.getByRole('dialog', { name: 'Your icon' })
  await icons.waitFor()
  await icons.getByRole('radio', { name: 'fox' }).click()
  await icons.getByRole('radio', { name: 'grape' }).click()
  await icons.getByRole('radio', { name: /^crown, locked/ }).click()
  await icons.getByText(/30 days in a row to unlock/).waitFor()
  await icons.getByRole('button', { name: 'Use this icon' }).click()
  await icons.waitFor({ state: 'hidden' })
  const set = calls.find((c) => c.fn === 'set_icon')
  if (!set || set.body.p_icon !== 'fox' || set.body.p_colour !== 'grape') throw new Error('icon not saved: ' + JSON.stringify(set))
  await page.getByRole('link', { name: 'Your profile, Sam_42' }).waitFor()
  if (!calls.filter((c) => c.fn === 'set_username').every((c) => c.auth === `Bearer ${token}`)) throw new Error('calls without the token')

  // 4. A reload stays signed in; the result ticket no longer asks to sign in.
  await page.reload()
  await page.getByRole('link', { name: 'Your profile, Sam_42' }).waitFor()
  if (await page.getByRole('button', { name: 'Sign in' }).count()) throw new Error('signed out after a reload')

  // 5. An expired link: back as a guest, told why.
  await page.evaluate(() => localStorage.removeItem('qg:session'))
  await page.goto(`${B}/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`)
  await page.getByRole('dialog', { name: 'Sign in' }).getByText(/expired or was already used/).waitFor()
}
