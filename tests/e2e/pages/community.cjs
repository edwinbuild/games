// Votes, comments, play counts and players online, with stand-ins for the database.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = (p) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(p)}.sig`
const CFG = { disabled: [], featured: [], new: [], banner: null, maintenance: null, rooms: true, signups: true, comments: 'review', autoplay: { run: true, replay: true }, counters: { plays: 100, online: 5, gameOnline: 3 }, rerolls: {} }

module.exports = async (args) => {
  let stage = 'start'
  try { await run(args, (x) => { stage = x }) } catch (e) { throw new Error(`[${stage}] ${String(e.message || e).split('\n')[0]}`) }
}
async function run({ page, B }, at) {
  const ctx = page.context()
  const calls = []
  let comments = [
    { id: 1, username: 'Kai', icon: 'frog', colour: 'sky', body: 'Nice ladder today', likes: 2, liked: false, mine: false, pending: false, created_at: new Date(Date.now() - 3600e3).toISOString() },
  ]
  await ctx.addInitScript((cfg) => { localStorage.setItem('qg:config', JSON.stringify(cfg)); localStorage.setItem('qg:config-at', JSON.stringify(Date.now())) }, CFG)
  await ctx.route('**/rest/v1/rpc/**', async (r) => {
    const fn = new URL(r.request().url()).pathname.split('/').pop()
    const body = JSON.parse(r.request().postData() || '{}')
    calls.push({ fn, body })
    const json = (v, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(v) })
    switch (fn) {
      case 'game_stats': return json({ plays: { 'word-ladder': 1500, 'rule-stack': 40 }, likes: { 'word-ladder': { pct: 92, n: 30 } }, online: 12, onlineByGame: { 'word-ladder': 4 } })
      case 'game_comments': return json(comments)
      case 'post_comment':
        if (/http|www\./.test(body.p_body)) return json({ message: 'comment link' }, 400)
        comments = [{ id: 9, username: 'Sam_42', icon: 'fox', colour: 'grape', body: body.p_body, likes: 0, liked: false, mine: true, pending: true, created_at: new Date().toISOString() }, ...comments]
        return json({ id: 9, status: 'pending' })
      case 'my_game_vote': return json(0)
      default: return json(true)
    }
  })

  at('home numbers')
  await page.goto(B + '/')
  await page.getByText('12 playing now').waitFor()
  const card = await page.locator('a.qg-card[href="/word-ladder/"]').innerText()
  if (!/92% liked · 1\.5k plays/.test(card)) throw new Error('card line: ' + card)
  if (/plays/.test(await page.locator('a.qg-card[href="/rule-stack/"]').innerText())) throw new Error('plays under the threshold should not show')

  at('game page numbers and comments as a guest')
  await page.goto(B + '/word-ladder/')
  await page.getByText('4 playing now · 92% liked · 1.5k plays').waitFor()
  const section = page.getByRole('region', { name: 'Comments' })
  await section.scrollIntoViewIfNeeded()
  await section.getByText('Nice ladder today').waitFor()
  await section.getByRole('button', { name: 'Sign in' }).waitFor()

  at('signed in: post, like, report, delete')
  const exp = Math.floor(Date.now() / 1000) + 3600
  await page.evaluate(([token, exp]) => {
    localStorage.setItem('qg:session', JSON.stringify({ access: token, refresh: 'r1', expires: exp, user: { id: 'u1', email: 'sam@example.com' } }))
    localStorage.setItem('qg:profile', JSON.stringify({ username: 'Sam_42', icon: 'fox', colour: 'grape', incoming: 0, news: 0 }))
    localStorage.setItem('qg:synced-at', JSON.stringify(Date.now()))
  }, [jwt({ sub: 'u1', exp }), exp])
  await page.reload()
  await section.scrollIntoViewIfNeeded()
  const box = section.getByLabel('Say something about this game')
  await box.fill('see www.example.com')
  await section.getByRole('button', { name: 'Post' }).click()
  await section.getByText('Links aren’t allowed in comments.').waitFor()
  await box.fill('Loved it!')
  await section.getByRole('button', { name: 'Post' }).click()
  await section.getByText(/Your comment shows once it’s been checked/).waitFor()
  await section.getByText('waiting to be checked', { exact: false }).waitFor()
  await section.getByRole('button', { name: 'Like this comment (2)' }).click()
  if (!calls.some((c) => c.fn === 'like_comment' && c.body.p_id === 1 && c.body.p_on === true)) throw new Error('like not sent')
  page.once('dialog', (d) => d.accept())
  await section.getByRole('button', { name: 'Report' }).click()
  await section.getByText('Thanks, it’ll be checked.').waitFor()
  page.once('dialog', (d) => d.accept())
  await section.getByRole('button', { name: 'Delete' }).click()
  await page.waitForTimeout(300)
  if (!calls.some((c) => c.fn === 'remove_my_comment' && c.body.p_id === 9)) throw new Error('delete not sent')

  at('vote after a game')
  await page.goto(B + '/blind-timer/')
  await page.getByRole('button', { name: 'Start' }).dispatchEvent('pointerdown')
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'Stop' }).dispatchEvent('pointerdown')
  await page.locator('.qg-ticket').waitFor()
  const yes = page.getByRole('button', { name: 'Yes, I enjoyed it' })
  await yes.click()
  await page.getByText('Thanks for telling us!').waitFor()
  if ((await yes.getAttribute('aria-pressed')) !== 'true') throw new Error('vote not shown')
  await yes.click()
  await page.waitForTimeout(300)
  const votes = calls.filter((c) => c.fn === 'vote_game').map((c) => c.body.p_vote)
  if (JSON.stringify(votes) !== '[1,0]') throw new Error('votes sent: ' + JSON.stringify(votes))
}
