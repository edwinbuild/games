const { assertFullyVisible, assertReopenQuiet, finishes, SMALL_PHONE } = require('../helpers.cjs')

module.exports = async ({ page, B }) => {
  await page.clock.install()
  await page.goto(B + '/blind-timer/')
  for (let i = 0; i < 2; i++) {
    if (i) await page.getByRole('button', { name: 'Try again' }).click()
    await page.getByRole('button', { name: 'Start' }).dispatchEvent('pointerdown')
    await page.clock.runFor(2000)
    await page.getByRole('button', { name: 'Stop' }).dispatchEvent('pointerdown')
    await page.clock.runFor(1000)
    await page.locator('.qg-ticket').waitFor()
  }
  if (!(await page.getByText(/best of 2 tries/).count())) throw new Error('tries not counted')
  if ((await finishes(page)) !== 2) throw new Error('each finished try should send one finish')
  await assertReopenQuiet(page)

  // On a small phone, after Try again the timer (visible for its first second only) is fully on screen.
  const ctx = await page.context().browser().newContext(SMALL_PHONE)
  const p = await ctx.newPage()
  try {
    await p.goto(B + '/blind-timer/')
    await p.getByRole('button', { name: 'Start' }).tap()
    await p.waitForTimeout(1500)
    await p.getByRole('button', { name: 'Stop' }).tap()
    await p.locator('.qg-ticket').waitFor()
    await p.waitForTimeout(1200) // the ticket scrolls into view
    await p.getByRole('button', { name: 'Try again' }).tap()
    await p.waitForTimeout(1000)
    await assertFullyVisible(p, '.qg-stage', 'the timer after Try again')
  } finally { await ctx.close() }
}
