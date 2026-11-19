// Two tries of three colours. Regression: each colour starts only once the stage is fully on screen,
// including after "Try again" on a small phone.
const { assertFullyVisible, SMALL_PHONE } = require('../helpers.cjs')
async function untilShown(page) {
  for (let t = 0; t < 60; t++) {
    if (await page.locator('.cr-timer').count()) return
    await page.clock.runFor(100)
  }
  throw new Error('the colour never showed')
}
async function playTry(page, first) {
  if (first) await page.getByRole('button', { name: /Show the first colour/ }).click()
  else await page.getByRole('button', { name: 'Try again' }).click()
  for (let i = 0; i < 3; i++) {
    if (i > 0) await page.getByRole('button', { name: /Next colour/ }).click()
    await untilShown(page)
    await assertFullyVisible(page, '.cr-show', 'the colour')
    await page.clock.runFor(2200)
    await page.locator('#cr-h').fill(String(40 + i * 90))
    await page.locator('#cr-s').fill('60')
    await page.locator('#cr-l').fill('50')
    if (await page.locator('.cr-timer').count()) throw new Error('target still visible')
    await page.getByRole('button', { name: 'Lock in' }).click()
  }
  await page.locator('.qg-ticket').waitFor()
}
module.exports = async ({ page, B, browser }) => {
  await page.clock.install()
  await page.goto(B + '/color-recall/')
  await playTry(page, true)
  await playTry(page, false)
  if (!/best of 2 tries/i.test(await page.locator('.qg-ticket').innerText())) throw new Error('tries not counted')
  const ctx = await browser.newContext(SMALL_PHONE)
  const p = await ctx.newPage()
  await p.clock.install()
  await p.goto(B + '/color-recall/')
  await playTry(p, true)
  await p.getByRole('button', { name: 'Try again' }).click()
  await untilShown(p)
  await assertFullyVisible(p, '.cr-show', 'the colour after Try again')
  await ctx.close()
}
