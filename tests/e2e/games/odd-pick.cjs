// Stand-in crowd functions (never real picks): yesterday's results, today's one pick, and the too-few message.
module.exports = async ({ page, B }) => {
  let picks = [], counts = [40, 30, 5, 20, 25]
  await page.context().route('**/rest/v1/rpc/crowd_pick', async (r) => { picks.push(JSON.parse(r.request().postData())); await r.fulfill({ status: 204, body: '' }) })
  await page.context().route('**/rest/v1/rpc/crowd_picks', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(counts) }))
  await page.goto(B + '/odd-pick/')
  // Pretend we picked option 2 yesterday.
  await page.evaluate(() => {
    const d = new Date(); d.setDate(d.getDate() - 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    localStorage.setItem('qg:odd-pick:' + key, JSON.stringify({ id: 0, choice: 2 }))
  })
  await page.reload()
  await page.getByText(/Your pick was the rarest! Only 4% chose/).waitFor({ timeout: 10000 })
  if ((await page.locator('.qg-splitbars li').count()) !== 5) throw new Error('split bars missing')

  // Today's pick: choose, lock in, one call with that choice.
  await page.locator('.op-option').nth(3).click()
  await page.getByRole('button', { name: /^Lock in/ }).click()
  await page.locator('.qg-ticket').waitFor()
  if (picks.length !== 1 || picks[0].p_choice !== 3 || picks[0].p_game !== 'odd-pick') throw new Error('pick not sent once: ' + JSON.stringify(picks))
  if (!/^[0-9a-f]{32}$/.test(picks[0].p_key)) throw new Error('pick sent without the device key')
  if (!/Locked in:/.test(await page.locator('.qg-ticket').innerText())) throw new Error('ticket wrong')

  // Coming back today: still locked, no second pick; with few picks yesterday, no split.
  counts = [1, 2, 0, 3, 1]
  await page.reload()
  await page.locator('.qg-ticket').waitFor()
  if (await page.locator('.op-option').count()) throw new Error('could pick twice')
  await page.getByText(/Only 7 picks yesterday, too few/).waitFor()
  if (picks.length !== 1) throw new Error('picked again')
}
