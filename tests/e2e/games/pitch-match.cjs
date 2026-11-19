const { assertReopenQuiet, finishes } = require('../helpers.cjs')

module.exports = async ({ page, B }) => {
  await page.goto(B + '/pitch-match/')
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: /Listen/ }).click()
    await page.locator('#pitch').fill(String(300 + i * 100))
    await page.getByRole('button', { name: 'Lock in' }).click()
  }
  await page.locator('.qg-ticket').waitFor()
  if ((await finishes(page)) !== 1) throw new Error('a finished try should send one finish')
  await assertReopenQuiet(page)
}
