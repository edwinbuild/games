// Rapid drops at the edges narrow the tower until a block misses; checks tap, click and Space all drop.
module.exports = async ({ page, B }) => {
  await page.goto(B + '/stack-tower/')
  const stage = page.locator('.st-stage')
  await stage.waitFor()
  await page.waitForTimeout(300)
  for (let t = 0; t < 2; t++) {
    if (t === 1) {
      await page.getByRole('button', { name: 'Try again' }).click()
      await stage.waitFor()
    }
    // Start with a tap, then drop with Space, a click and a tap in turn until the try ends.
    await stage.tap()
    for (let i = 0; i < 40 && !(await page.locator('.qg-ticket').count()); i++) {
      if (i % 3 === 0) await page.keyboard.press('Space')
      else if (i % 3 === 1) await stage.dispatchEvent('pointerdown')
      else await stage.tap()
      await page.waitForTimeout(60)
    }
    await page.locator('.qg-ticket').waitFor({ timeout: 5000 })
  }
  const text = await page.locator('.qg-ticket').innerText()
  if (!/best of 2 tries/i.test(text) || !/blocks? high/.test(text)) throw new Error('ticket wrong: ' + text)
}
