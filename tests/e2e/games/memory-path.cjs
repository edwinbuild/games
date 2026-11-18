module.exports = async ({ page, B }) => {
  await page.clock.install()
  await page.goto(B + '/memory-path/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.clock.runFor(5000)
  await page.locator('.qg-stage button').nth(0).dispatchEvent('pointerdown')
  await page.locator('.qg-stage button').nth(15).dispatchEvent('pointerdown')
  await page.locator('.qg-stage button').nth(5).dispatchEvent('pointerdown')
  await page.locator('.qg-ticket').waitFor()
}
