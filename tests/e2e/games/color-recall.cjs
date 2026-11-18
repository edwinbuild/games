module.exports = async ({ page, B }) => {
  await page.clock.install()
  await page.goto(B + '/color-recall/')
  for (let t = 0; t < 2; t++) {
    if (t === 0) await page.getByRole('button', { name: /Show the first colour/ }).click()
    else await page.getByRole('button', { name: 'Try again' }).click()
    for (let i = 0; i < 3; i++) {
      if (i > 0) await page.getByRole('button', { name: /Next colour/ }).click()
      await page.locator('.cr-show').waitFor()
      await page.clock.runFor(2200)
      await page.locator('#cr-h').fill(String(40 + i * 90))
      await page.locator('#cr-s').fill('60')
      await page.locator('#cr-l').fill('50')
      // The target colour must not still be on screen while matching.
      if (await page.locator('.cr-show').count()) throw new Error('target still visible')
      await page.getByRole('button', { name: 'Lock in' }).click()
    }
    await page.locator('.qg-ticket').waitFor()
  }
  if (!/best of 2 tries/i.test(await page.locator('.qg-ticket').innerText())) throw new Error('tries not counted')
}
