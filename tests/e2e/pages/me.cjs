// The profile page and friends, with stand-ins for the database (nothing real is sent).
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = (p) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(p)}.sig`

module.exports = async ({ page, B }) => {
  const ctx = page.context()
  const calls = []
  const profile = { username: 'Sam_42', changesLeft: 3, icon: 'fox', colour: 'grape', unlocked: ['flame'], inviteCode: 'aaaaaaaaaa', streak: 4, incoming: 1, news: 1 }
  let friends = [
    { username: 'Robin', icon: 'owl', colour: 'mint', status: 'incoming', played_today: 0, streak: 0 },
    { username: 'Kai', icon: 'frog', colour: 'sky', status: 'friend', played_today: 2, streak: 6 },
  ]
  await ctx.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  await ctx.route('**/rest/v1/rpc/**', async (r) => {
    const fn = new URL(r.request().url()).pathname.split('/').pop()
    const body = JSON.parse(r.request().postData() || '{}')
    calls.push({ fn, body })
    const json = (v, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(v) })
    switch (fn) {
      case 'my_profile': return json(profile)
      case 'get_data': return json([])
      case 'my_friends': return json(friends)
      case 'my_inbox': return json({ invites: [{ username: 'Kai', icon: 'frog', colour: 'sky', game: 'dots-and-boxes', room: 'K7MQ2', at: new Date().toISOString() }], reactions: [] })
      case 'invite_owner': return json({ username: 'Lee', icon: 'cat', colour: 'peach', self: false, friends: false })
      case 'friend_by_invite': friends.push({ username: 'Lee', icon: 'cat', colour: 'peach', status: 'friend', played_today: 0, streak: 0 }); return json({ username: 'Lee' })
      case 'friend_respond': friends = friends.map((f) => (f.username === body.p_name ? { ...f, status: body.p_accept ? 'friend' : f.status } : f)); return json(body.p_accept)
      case 'friend_request': if (body.p_name === 'Nobody') return json({ message: 'no such player' }, 400); friends.push({ username: body.p_name, icon: 'ticket', colour: 'mint', status: 'outgoing', played_today: 0, streak: 0 }); return json('sent')
      case 'block_player': friends = friends.filter((f) => f.username !== body.p_name); return json(true)
      case 'check_username': return json(null)
      case 'set_username': profile.username = body.p_name; profile.changesLeft -= 1; return json(profile)
      case 'delete_account': return json(true)
      default: return json(null)
    }
  })
  const exp = Math.floor(Date.now() / 1000) + 3600
  await ctx.addInitScript(([token, exp, prof]) => {
    if (!localStorage.getItem('qg:session-set')) {
      localStorage.setItem('qg:session', JSON.stringify({ access: token, refresh: 'r1', expires: exp, user: { id: 'u1', email: 'sam@example.com' } }))
      localStorage.setItem('qg:profile', JSON.stringify(prof))
      localStorage.setItem('qg:synced-at', JSON.stringify(Date.now()))
      localStorage.setItem('qg:session-set', '1')
    }
  }, [jwt({ sub: 'u1', email: 'sam@example.com', exp }), exp, profile])

  // Arrive through Lee's invite link.
  await page.goto(B + '/me/?invite=bbbbbbbbbb')
  await page.getByRole('heading', { name: 'Sam_42' }).waitFor()
  await page.getByText('Signed in as sam@example.com').waitFor()
  await page.getByRole('link', { name: 'Your profile, Sam_42, 2 new' }).waitFor()
  await page.getByText('invited you to Dots & Boxes').waitFor()
  if ((await page.getByRole('link', { name: 'Join' }).getAttribute('href')) !== '/dots-and-boxes/?room=K7MQ2') throw new Error('join link wrong')
  await page.getByRole('button', { name: 'Add Lee' }).click()
  await page.getByText('You and Lee are now friends.').waitFor()
  if (page.url().includes('invite=')) throw new Error('invite stayed in the address')

  // Answer Robin's request; add by exact name; a wrong name explains itself.
  await page.getByRole('button', { name: 'Accept' }).click()
  await page.getByText('You and Robin are now friends.').waitFor()
  await page.getByLabel('Add by exact username').fill('Nobody')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByText('No player has that exact username.').waitFor()
  await page.getByLabel('Add by exact username').fill('Jo_99')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByText('Request sent to Jo_99.').waitFor()
  await page.getByText('request sent', { exact: true }).waitFor()

  // Block Kai from the friend's menu.
  await page.getByRole('button', { name: 'More for Kai' }).click()
  await page.getByRole('button', { name: 'Block' }).click()
  await page.getByText(/Blocked Kai/).waitFor()
  if (await page.getByText('Kai', { exact: true }).count()) throw new Error('Kai still listed')

  // Play with a friend: an invite goes to them and the room opens.
  await page.getByRole('button', { name: 'Play' }).first().click()
  await Promise.all([page.waitForURL(/\/dots-and-boxes\/\?room=[A-Z0-9]{5}$/), page.getByRole('button', { name: 'Dots & Boxes' }).click()])
  const inv = calls.find((c) => c.fn === 'invite_to_play')
  if (!inv || inv.body.p_game !== 'dots-and-boxes' || !/^[A-Z0-9]{5}$/.test(inv.body.p_room)) throw new Error('play invite wrong: ' + JSON.stringify(inv))

  // Change the username (asks to confirm), then delete the account (type the name).
  await page.goto(B + '/me/')
  await page.getByRole('button', { name: 'Change username (3 left)' }).click()
  const sheet = page.getByRole('dialog', { name: 'Your username' })
  await sheet.getByLabel('Username').fill('Sam_43')
  await sheet.getByText('✓ Available').waitFor()
  await sheet.getByRole('button', { name: 'Change username' }).click()
  await sheet.getByText(/Change to Sam_43\? You’ll have 2 changes left/).waitFor()
  await sheet.getByRole('button', { name: 'Yes, change it' }).click()
  await page.getByRole('heading', { name: 'Sam_43' }).waitFor()
  await page.getByRole('button', { name: 'Delete my account' }).click()
  const del = page.getByRole('dialog', { name: 'Delete your account' })
  const go = del.getByRole('button', { name: 'Delete my account' })
  if (!(await go.isDisabled())) throw new Error('delete without confirming')
  await del.getByLabel('Type Sam_43 to confirm').fill('Sam_43')
  await Promise.all([page.waitForURL(B + '/'), go.click()])
  if (!calls.some((c) => c.fn === 'delete_account')) throw new Error('not deleted')
  await page.getByRole('button', { name: 'Sign in' }).first().waitFor()
}
