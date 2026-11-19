// Plays a try of five fields. Regression checks: a refresh mid-try resumes it, a refresh after the
// fifth answer keeps the finished try, and on a small phone "Try again" never flashes off-screen.
const { assertFullyVisible, SMALL_PHONE } = require('../helpers.cjs')
/** Steps the paused clock until the dots appear (after the scroll and the 3-2-1). */
async function untilFlash(page) {
  for (let t = 0; t < 60; t++) {
    if (await page.locator('.cf-field').count()) return
    await page.clock.runFor(100)
  }
  throw new Error('the field never flashed')
}
async function playTry(page, { refreshAt = -1 } = {}) {
  const seen = []
  for (let i = 0; i < 5; i++) {
    if (i === refreshAt) {
      await page.reload()
      await page.getByRole('button', { name: `Flash field ${i + 1}` }).click()
    }
    await untilFlash(page)
    await assertFullyVisible(page, '.cf-box', 'the dot field')
    await page.clock.runFor(900)
    if (await page.locator('.cf-field').count()) throw new Error('dots still visible after the flash')
    await page.locator('#cf-guess').fill(String(50 + i * 40))
    await page.getByRole('button', { name: 'Lock in' }).click()
    seen.push(+(await page.getByText(/ dots · you said /).innerText()).match(/^(\d+) dots/)[1])
    if (i < 4) await page.getByRole('button', { name: /Next field/ }).click()
  }
  return seen
}
module.exports = async ({ page, B, browser }) => {
  await page.clock.install()
  await page.goto(B + '/count-flash/')
  await page.getByRole('button', { name: /Flash the first field/ }).click()
  await playTry(page, { refreshAt: 2 })
  await page.getByRole('button', { name: 'See your result' }).waitFor()
  await page.reload()
  await page.locator('.qg-ticket').waitFor({ timeout: 5000 })
  if (!/best of 1 try/i.test(await page.locator('.qg-ticket').innerText())) throw new Error('the finished try was lost on refresh')
  // The counts revealed after try 1 must not be the counts of try 2.
  const first = (await page.getByText(/Last try’s counts/).innerText()).match(/[\d, ]+(?=\.)/)[0].trim()
  await page.getByRole('button', { name: 'Try again' }).click()
  const second = (await playTry(page)).join(', ')
  if (second === first) throw new Error('try 2 reused the fields whose counts were just shown: ' + first)
  await page.getByRole('button', { name: 'See your result' }).click()
  const t = await page.locator('.qg-ticket').innerText()
  if (!/% off on average/.test(t) || !/best of 2 tries/i.test(t)) throw new Error('ticket wrong: ' + t)

  // Small phone: Try again from the result ticket must bring the field on screen before flashing.
  const ctx = await browser.newContext(SMALL_PHONE)
  const p = await ctx.newPage()
  await p.clock.install()
  await p.goto(B + '/count-flash/')
  await p.getByRole('button', { name: /Flash the first field/ }).click()
  await playTry(p)
  await p.getByRole('button', { name: 'See your result' }).click()
  await p.getByRole('button', { name: 'Try again' }).click()
  await untilFlash(p)
  await assertFullyVisible(p, '.cf-box', 'the dot field after Try again')
  await ctx.close()
}
