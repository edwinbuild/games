const { assertReopenQuiet, finishes } = require('../helpers.cjs')

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
}
