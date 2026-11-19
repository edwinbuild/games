const { challengeLink } = require('../helpers.cjs')

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

  // A challenge link plays its own grid (the same each time it opens); playing again after it gets a new one.
  const grid = () => page.locator('.qg-stage button').evaluateAll((bs) => bs.map((b) => b.textContent + getComputedStyle(b).backgroundColor).join('|'))
  const link = challengeLink(B, 'odd-one-out', 'e2e-replay')
  await page.goto(link)
  await page.waitForSelector('.qg-stage button')
  const first = await grid()
  await page.goto(link)
  await page.waitForSelector('.qg-stage button')
  if ((await grid()) !== first) throw new Error('a challenge link should always open the same grid')
  const wrong = await page.evaluate(() => {
    const bs = [...document.querySelectorAll('.qg-stage button')]; const c = {}
    bs.forEach((b) => (c[b.textContent] = (c[b.textContent] || 0) + 1)); return bs.findIndex((b) => c[b.textContent] > 1)
  })
  await page.locator('.qg-stage button').nth(wrong).dispatchEvent('pointerdown') // the clock starts on the first tap
  await page.clock.runFor(61000)
  await page.locator('.qg-ticket').waitFor()
  await page.locator('.qg-ticket').getByRole('button', { name: /again/i }).first().click()
  await page.waitForSelector('.qg-stage button')
  if ((await grid()) === first) throw new Error('playing again after a challenge reused the challenge grid')
}
