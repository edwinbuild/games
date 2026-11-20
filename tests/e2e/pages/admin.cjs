// The admin page and what its settings do to the site, with stand-ins for the database (nothing
// real is changed, and the PIN here is a test one).
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = (p) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(p)}.sig`
const BASE = { disabled: [], featured: [], new: [], banner: null, maintenance: null, rooms: true, signups: true, comments: 'review', autoplay: { run: true, replay: true }, counters: { plays: 100, online: 5, gameOnline: 3 }, rerolls: {} }

module.exports = async (args) => {
  let stage = 'start'
  try { await run(args, (x) => { stage = x }) } catch (e) { throw new Error(`[${stage}] ${String(e.message || e).split('\n')[0]}`) }
}
async function run({ page, B, browser }, at) {
  const ctx = page.context()
  const calls = []
  let cfg = { ...BASE }
  await ctx.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  await ctx.route('**/rest/v1/rpc/**', async (r) => {
    const fn = new URL(r.request().url()).pathname.split('/').pop()
    const body = JSON.parse(r.request().postData() || '{}')
    calls.push({ fn, body })
    const json = (v, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(v) })
    switch (fn) {
      case 'site_config': return json(cfg)
      case 'admin_unlock': return json(body.p_pin === '24680' ? { token: 't0ken', expires: Math.floor(Date.now() / 1000) + 3600 } : { error: 'wrong', left: 3 })
      case 'admin_check': return json(body.p_token === 't0ken')
      case 'admin_dashboard': return json({ games: [{ game: 'word-ladder', starts: 10, finishes: 8, shares: 2, play_next: 1, finishes_all: 40, daily: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 8] }], today: { starts: 4, finishes: 3 }, finishesAll: 87, accounts: 2, accounts7: 2, named: 2, friendships: 1, boardsToday: { 'word-ladder': 5 }, errors7: 0, reports: 1, banned: 0 })
      case 'admin_set_config': cfg = { ...cfg, ...body.p_patch }; return json(cfg)
      case 'admin_reroll': cfg = { ...cfg, rerolls: { [`${body.p_game}:${body.p_day}`]: 1 } }; return json(cfg)
      case 'admin_player': return json({ username: 'Robin', icon: 'owl', colour: 'mint', joined: '2026-11-20T08:00:00Z', changesUsed: 1, email: 'r***@example.com', results: 3, friends: 2, reports: 1, banned: false, banReason: null })
      case 'admin_reveal_email': return json('robin@example.com')
      case 'admin_reports': return json([{ username: 'Robin', reports: 1, last: '2026-11-20T09:00:00Z', banned: false }])
      case 'admin_words': return json({ blocked: ['badword'], reserved: ['admin'] })
      case 'admin_errors': return json([])
      case 'admin_security': return json({ attempts: [{ ok: true, at: '2026-11-20T10:00:00Z', mine: true }], sessions: 1, log: [{ action: 'unlocked', detail: null, at: '2026-11-20T10:00:00Z' }] })
      default: return json(true)
    }
  })

  at('Signed out:')
  // Signed out: asked to sign in first.
  await page.goto(B + '/admin/')
  await page.getByText('Sign in with the admin account first.').waitFor()

  at('Signed in:')
  // Signed in: the PIN pad; a wrong PIN says how many tries are left.
  const exp = Math.floor(Date.now() / 1000) + 3600
  await page.evaluate(([token, exp]) => {
    localStorage.setItem('qg:session', JSON.stringify({ access: token, refresh: 'r1', expires: exp, user: { id: 'u1', email: 'boss@example.com' } }))
    localStorage.setItem('qg:profile', JSON.stringify({ username: 'Boss', icon: 'fox', colour: 'grape', incoming: 0, news: 0 }))
    localStorage.setItem('qg:synced-at', JSON.stringify(Date.now()))
  }, [jwt({ sub: 'u1', exp }), exp])
  await page.reload()
  await page.getByLabel('PIN').fill('11111')
  await page.getByRole('button', { name: 'Unlock' }).click()
  await page.getByText('That’s not it (3 tries left).').waitFor()
  await page.getByLabel('PIN').fill('24680')
  await page.getByRole('button', { name: 'Unlock' }).click()
  await page.getByText('Finished, all time').waitFor()
  await page.getByText('87', { exact: true }).waitFor()

  at('Games:')
  // Games: switch Rule Stack off, mark Dots & Boxes new, re-roll Garden Path.
  await page.getByRole('button', { name: 'Games' }).click()
  await page.getByRole('checkbox', { name: 'Rule Stack on' }).uncheck()
  await page.getByRole('checkbox', { name: 'Dots & Boxes new' }).check()
  page.once('dialog', (d) => d.accept())
  await page.getByRole('row', { name: /Garden Path/ }).getByRole('button', { name: /Re-roll today/ }).click()
  await page.getByText('Garden Path has a new puzzle for today.').waitFor()
  if (!cfg.disabled.includes('rule-stack') || !cfg.new.includes('dots-and-boxes')) throw new Error('game switches not saved: ' + JSON.stringify(cfg))

  at('Site:')
  // Site: a banner.
  await page.getByRole('button', { name: 'Site' }).click()
  await page.getByLabel('Banner text (empty hides it)').fill('New game: Dots & Boxes!')
  await page.getByLabel(/^Link/).fill('/dots-and-boxes/')
  await page.getByRole('button', { name: 'Save banner' }).click()
  await page.getByText('Saved.').waitFor()
  if (cfg.banner?.text !== 'New game: Dots & Boxes!' || cfg.banner?.link !== '/dots-and-boxes/') throw new Error('banner not saved: ' + JSON.stringify(cfg.banner))
  await page.getByRole('checkbox', { name: 'Online rooms open' }).uncheck()
  await page.waitForFunction(() => true)

  at('Players:')
  // Players: find, reveal the email, ban with a reason.
  await page.getByRole('button', { name: 'Players' }).click()
  await page.getByLabel('Exact username').fill('Robin')
  await page.getByRole('button', { name: 'Find' }).click()
  await page.getByText('r***@example.com', { exact: false }).waitFor()
  await page.getByRole('button', { name: 'Reveal (logged)' }).click()
  await page.getByText('robin@example.com', { exact: false }).waitFor()
  page.once('dialog', (d) => d.accept('rude name'))
  await page.getByRole('button', { name: 'Ban' }).click()
  await page.getByText(/^Banned/).waitFor()
  if (!calls.some((c) => c.fn === 'admin_ban' && c.body.p_on === true && c.body.p_reason === 'rude name')) throw new Error('ban not sent')

  at('Security:')
  // Security: change the PIN.
  await page.getByRole('button', { name: 'Security' }).click()
  await page.getByLabel('Current PIN').fill('24680')
  await page.getByLabel(/^New PIN/).fill('97531')
  await page.getByRole('button', { name: 'Change PIN' }).click()
  await page.getByText(/PIN changed/).waitFor()
  if (!calls.some((c) => c.fn === 'admin_set_pin' && c.body.p_old === '24680' && c.body.p_new === '97531')) throw new Error('pin change not sent')

  at('What the settings')
  // What the settings do to the site (a fresh visitor).
  const v = await browser.newContext({ viewport: { width: 412, height: 900 } })
  await v.route('**/rest/v1/rpc/site_config', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cfg) }))
  await v.route('**/rest/v1/rpc/**', (r) => (r.request().url().endsWith('/site_config') ? r.fallback() : r.fulfill({ status: 200, contentType: 'application/json', body: 'null' })))
  const p = await v.newPage()
  await p.goto(B + '/')
  await p.waitForTimeout(800)
  await p.reload() // settings from the first visit apply at once on the next
  await p.getByText('New game: Dots & Boxes!').waitFor()
  if (await p.locator('a.qg-card[href="/rule-stack/"]').count()) throw new Error('a switched-off game still has a card')
  if (!/\bnew\b/i.test(await p.locator('a.qg-card[href="/dots-and-boxes/"]').innerText())) throw new Error('no New tag')
  await p.getByRole('button', { name: 'Dismiss' }).click()
  await p.reload()
  await p.waitForTimeout(500)
  if (await p.getByText('New game: Dots & Boxes!').count()) throw new Error('a dismissed banner came back')
  await p.goto(B + '/rule-stack/')
  await p.getByText('Back soon').waitFor()
  await p.goto(B + '/dots-and-boxes/?room=K7MQ2')
  await p.getByRole('button', { name: 'Online', exact: true }).click()
  await p.getByText(/Online rooms are taking a short break/).waitFor()
  await v.close()
}
