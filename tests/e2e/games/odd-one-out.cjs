module.exports = async ({ page, B }) => {
  await page.clock.install()
  await page.goto(B + '/odd-one-out/')
  await page.waitForSelector('.qg-stage button')
  for (let l = 0; l < 4; l++) {
    const idx = await page.evaluate(() => {
      const bs = [...document.querySelectorAll('.qg-stage button')]; const c = {}
      bs.forEach((b) => (c[b.textContent] = (c[b.textContent] || 0) + 1)); return bs.findIndex((b) => c[b.textContent] === 1)
    })
    await page.locator('.qg-stage button').nth(idx).dispatchEvent('pointerdown')
  }
  await page.clock.runFor(61000)
  await page.locator('.qg-ticket').waitFor()
}
