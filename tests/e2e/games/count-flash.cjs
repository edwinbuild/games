module.exports = async ({ page, B }) => {
  await page.clock.install()
  await page.goto(B + '/count-flash/')
  await page.getByRole('button', { name: /Flash the first field/ }).click()
  for (let i = 0; i < 5; i++) {
    if (!(await page.locator('.cf-field').count())) throw new Error('no dots flashed')
    await page.clock.runFor(900)
    if (await page.locator('.cf-field').count()) throw new Error('dots still visible after the flash')
    const over = await page.evaluate(() => document.documentElement.scrollWidth - 412)
    if (over > 1) throw new Error(`horizontal overflow ${over}px while guessing`)
    await page.locator('#cf-guess').fill(String(50 + i * 40))
    await page.getByRole('button', { name: 'Lock in' }).click()
    await page.getByRole('button', { name: /Next field|See your result/ }).click()
  }
  await page.locator('.qg-ticket').waitFor()
}
