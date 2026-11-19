// Today's board under a daily result, with stand-in database functions (tests never write real
// scores): a new result is submitted with your best and your name, rank and percentile show, the
// top 50 opens with your row marked, reopening reads your place without submitting again, and a
// challenge for another day shows no board.
const { challengeLink } = require('../helpers.cjs')
module.exports = async ({ page, B }) => {
  const calls = { submit: [], rank: 0, board: 0 }
  await page.context().addInitScript(() => localStorage.setItem('qg:board-test', 'true'))
  const json = (r, body) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  await page.context().route('**/rest/v1/rpc/submit_score', (r) => { calls.submit.push(JSON.parse(r.request().postData())); json(r, [{ rank: 3, total: 120, better_than: 98 }]) })
  await page.context().route('**/rest/v1/rpc/my_rank', (r) => { calls.rank++; json(r, [{ rank: 3, total: 121, better_than: 98 }]) })
  await page.context().route('**/rest/v1/rpc/daily_board', (r) => { calls.board++; json(r, [{ rank: 1, nick: 'Sam', text: '0.01s', mine: false }, { rank: 2, nick: null, text: '0.02s', mine: false }, { rank: 3, nick: 'Me', text: '0.05s', mine: true }]) })

  await page.goto(B + '/blind-timer/')
  await page.evaluate(() => localStorage.setItem('qg:nick', JSON.stringify('Robin')))
  await page.getByRole('button', { name: 'Start' }).dispatchEvent('pointerdown')
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Stop' }).dispatchEvent('pointerdown')
  await page.locator('.qg-ticket').waitFor()
  try { await page.locator('.qg-board').getByText(/You’re #3 of 120 today, better than 98%/).waitFor({ timeout: 5000 }) } catch (e) {
    throw new Error('no board line; calls ' + JSON.stringify({ submits: calls.submit.length, rank: calls.rank }) + ' test flag ' + (await page.evaluate(() => localStorage.getItem('qg:board-test'))) + ' boards ' + (await page.locator('.qg-board').count()))
  }
  const sent = calls.submit[0]
  if (calls.submit.length !== 1 || sent.p_game !== 'blind-timer' || !/^[0-9a-f]{32}$/.test(sent.p_key) || sent.p_nick !== 'Robin' || !(sent.p_score >= 0)) throw new Error('submit wrong: ' + JSON.stringify(calls.submit))

  await page.getByRole('button', { name: 'See today’s top 50' }).click()
  await page.locator('.qg-board-list li').nth(2).waitFor()
  const rows = await page.locator('.qg-board-list li').allInnerTexts()
  if (!/Sam/.test(rows[0]) || !/A player/.test(rows[1]) || !/You/.test(rows[2])) throw new Error('board rows: ' + rows)
  if ((await page.locator('.qg-board-list li.is-me').count()) !== 1) throw new Error('your row should be marked')

  // Reopening today: your place is read, nothing is submitted again.
  await page.reload()
  await page.locator('.qg-board').getByText(/#3 of 121/).waitFor({ timeout: 5000 })
  if (calls.submit.length !== 1 || calls.rank < 1) throw new Error('reopen should read, not submit: ' + JSON.stringify({ submits: calls.submit.length, rank: calls.rank }))

  // Another day's puzzle from a challenge link: no board.
  await page.goto(challengeLink(B, 'blind-timer', '2026-11-01'))
  await page.getByRole('button', { name: 'Start' }).dispatchEvent('pointerdown')
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: 'Stop' }).dispatchEvent('pointerdown')
  await page.locator('.qg-ticket').waitFor()
  await page.waitForTimeout(800)
  if (await page.locator('.qg-board').count()) throw new Error('no board for another day')
  if (calls.submit.length !== 1) throw new Error('another day must not be submitted')
}
