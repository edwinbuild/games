const { assertFullyVisible, SMALL_PHONE } = require('../helpers.cjs')

// A paused clock makes timing exact: one try tapping on every silent beat, one 60 ms late with a missed beat.
module.exports = async ({ page, B, browser }) => {
  await page.clock.install()
  await page.goto(B + '/beat-keeper/')
  await page.getByRole('button', { name: 'Start the beat' }).waitFor()
  await page.clock.pauseAt(Date.now() + 60_000)
  const bpm = +(await page.getByText(/beats per minute/).innerText()).match(/(\d+) beats/)[1]
  const p = 60000 / bpm
  const play = async (offset, skip = -1) => {
    await page.keyboard.press('Space') // starts: the first beat is 700 ms away
    let t = 0
    const go = async (to) => { await page.clock.runFor(Math.round(to - t)); t = Math.round(to) }
    for (let k = 0; k < 8; k++) { await go(700 + k * p); await page.keyboard.press('Space') } // tap along with the lead-in
    for (let k = 0; k < 8; k++) { if (k === skip) continue; await go(700 + (8 + k) * p + offset); await page.keyboard.press('Space') }
    await go(700 + 16 * p + p / 2 + 100)
    await page.getByText(/^±\d+ ms$/).waitFor()
  }
  await page.locator('body').click({ position: { x: 2, y: 2 } })
  await play(0)
  const first = +(await page.getByText(/^±\d+ ms$/).innerText()).match(/\d+/)[0]
  if (first > 2) throw new Error('perfect taps should score about 0 ms, got ' + first)
  if (!(await page.getByText('Steady all the way').count())) throw new Error('should be steady')
  await page.getByRole('button', { name: 'See my result' }).click()
  await page.locator('.qg-ticket').waitFor()

  await page.getByRole('button', { name: 'Try again' }).click()
  await page.getByRole('button', { name: 'Try again' }).waitFor() // the start key on the game screen
  await page.locator('body').click({ position: { x: 2, y: 2 } })
  await play(60, 5)
  if (!(await page.getByText(/1 missed/).count())) throw new Error('missed beat not shown')
  await page.getByRole('button', { name: 'See my result' }).click()
  const t = await page.locator('.qg-ticket').innerText()
  if (!/best of 2 tries/i.test(t) || !t.includes(`±${first} ms`)) throw new Error('ticket wrong: ' + t)

  // Small phone: after Try again the beat circle is fully on screen before you start.
  const ctx = await browser.newContext(SMALL_PHONE)
  const sp = await ctx.newPage()
  try {
    await sp.clock.install()
    await sp.goto(B + '/beat-keeper/')
    await sp.getByRole('button', { name: 'Start the beat' }).tap()
    await sp.clock.runFor(20000)
    await sp.getByRole('button', { name: 'See my result' }).tap()
    await sp.locator('.qg-ticket').waitFor()
    await sp.clock.runFor(1500)
    await sp.locator('.qg-ticket').getByRole('button', { name: 'Try again' }).tap()
    await sp.clock.runFor(1000)
    await sp.waitForTimeout(800) // the page's own smooth scroll back to the game runs in real time
    await assertFullyVisible(sp, '.bk-stage', 'the beat circle after Try again')
  } finally { await ctx.close() }
}
