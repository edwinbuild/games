// Plays a try of five fields. Regression checks: a refresh mid-try resumes it, and a refresh after
// the fifth answer (before "See your result") keeps the finished try.
module.exports = async ({ page, B }) => {
  await page.clock.install()
  await page.goto(B + '/count-flash/')
  await page.getByRole('button', { name: /Flash the first field/ }).click()
  for (let i = 0; i < 5; i++) {
    if (i === 2) {
      await page.reload()
      await page.getByRole('button', { name: 'Flash field 3' }).click()
    }
    await page.locator('.cf-field').waitFor({ timeout: 5000 })
    await page.clock.runFor(900)
    if (await page.locator('.cf-field').count()) throw new Error('dots still visible after the flash')
    const over = await page.evaluate(() => document.documentElement.scrollWidth - 412)
    if (over > 1) throw new Error(`horizontal overflow ${over}px while guessing`)
    await page.locator('#cf-guess').fill(String(50 + i * 40))
    await page.getByRole('button', { name: 'Lock in' }).click()
    if (i < 4) await page.getByRole('button', { name: /Next field/ }).click()
  }
  await page.getByRole('button', { name: 'See your result' }).waitFor()
  await page.reload()
  await page.locator('.qg-ticket').waitFor({ timeout: 5000 })
  if (!/best of 1 try/i.test(await page.locator('.qg-ticket').innerText())) throw new Error('the finished try was lost on refresh')
}
