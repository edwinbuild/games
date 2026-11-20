// Signed in: under a daily result, today's results among friends with reactions; the board shows
// icons; the ticket uses the username and doesn't ask to sign in. Stand-ins only.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = (p) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(p)}.sig`

module.exports = async ({ page, B }) => {
  const ctx = page.context()
  const reacts = []
  let mine = null
  const exp = Math.floor(Date.now() / 1000) + 3600
  const profile = { username: 'Sam_42', changesLeft: 5, icon: 'fox', colour: 'grape', unlocked: [], inviteCode: 'aaaaaaaaaa', streak: 2, incoming: 0, news: 0 }
  await ctx.addInitScript(([token, exp, prof]) => {
    localStorage.setItem('qg:board-test', 'true')
    localStorage.setItem('qg:session', JSON.stringify({ access: token, refresh: 'r1', expires: exp, user: { id: 'u1', email: 'sam@example.com' } }))
    localStorage.setItem('qg:profile', JSON.stringify(prof))
    localStorage.setItem('qg:synced-at', JSON.stringify(Date.now()))
  }, [jwt({ sub: 'u1', exp }), exp, profile])
  await ctx.route('**/rest/v1/rpc/**', async (r) => {
    const fn = new URL(r.request().url()).pathname.split('/').pop()
    const body = JSON.parse(r.request().postData() || '{}')
    const json = (v) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(v) })
    if (fn === 'submit_score' || fn === 'my_rank') return json([{ rank: 2, total: 40, better_than: 97 }])
    if (fn === 'daily_board') return json([{ rank: 1, nick: 'Kai', text: '0.01s', mine: false, icon: 'frog', colour: 'sky' }, { rank: 2, nick: 'Sam_42', text: '0.05s', mine: true, icon: 'fox', colour: 'grape' }])
    if (fn === 'friends_results') return json([
      { username: 'Kai', icon: 'frog', colour: 'sky', text: '0.01s', rank: 1, mine: false, reactions: {}, my_reaction: mine },
      { username: 'Sam_42', icon: 'fox', colour: 'grape', text: '0.05s', rank: 2, mine: true, reactions: { '🔥': 1 }, my_reaction: null },
    ])
    if (fn === 'react') { reacts.push(body); mine = body.p_emoji; return json(true) }
    if (fn === 'put_data') return json(1)
    return json(null)
  })

  await page.goto(B + '/blind-timer/')
  await page.getByRole('button', { name: 'Start' }).dispatchEvent('pointerdown')
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Stop' }).dispatchEvent('pointerdown')
  await page.locator('.qg-ticket').waitFor()
  if (await page.locator('#nickname').count()) throw new Error('signed in: no name field, the username is used')
  if (await page.locator('.acct-prompt').count()) throw new Error('signed in: no sign-in prompt')
  const friends = page.getByRole('region', { name: 'Friends today' })
  await friends.getByText('Kai').waitFor({ timeout: 8000 })
  await friends.getByText('🔥 1').waitFor()
  await friends.getByRole('button', { name: 'React 👏 to Kai' }).click()
  await page.waitForTimeout(400)
  if (reacts.length !== 1 || reacts[0].p_name !== 'Kai' || reacts[0].p_emoji !== '👏') throw new Error('reaction not sent: ' + JSON.stringify(reacts))
  if ((await friends.getByRole('button', { name: 'React 👏 to Kai' }).getAttribute('aria-pressed')) !== 'true') throw new Error('reaction not shown')
  await friends.getByRole('button', { name: 'React 👏 to Kai' }).click()
  await page.waitForTimeout(400)
  if (reacts[1]?.p_emoji !== null) throw new Error('tapping again should remove it')

  await page.getByRole('button', { name: 'See today’s top 50' }).click()
  await page.locator('.qg-board-list .qg-avatar').first().waitFor()
  await page.getByText('You’re on the board as Sam_42.').waitFor()
}
