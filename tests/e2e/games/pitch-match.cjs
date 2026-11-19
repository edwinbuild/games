const { assertReopenQuiet, finishes } = require('../helpers.cjs')

module.exports = async ({ page, B }) => {
  await page.goto(B + '/pitch-match/')
  const wave = page.locator('.pitch-wave canvas')
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: /Listen/ }).click()
    if (i === 0) {
      // With the sound off you can play by sight: the target's wave shows while it plays…
      if ((await wave.getAttribute('data-showing')) !== 'target') throw new Error('the target wave should show while it plays')
      const hz = +(await wave.getAttribute('data-cycles')) * 40
      // …then the wave follows your slider. Matching the waves matches the tone.
      await page.waitForFunction(() => document.querySelector('.pitch-wave canvas')?.getAttribute('data-showing') === 'mine', null, { timeout: 3000 })
      const v = Math.round((1000 * Math.log(hz / 200)) / Math.log(5))
      await page.locator('#pitch').fill(String(v))
      if (Math.abs(+(await wave.getAttribute('data-cycles')) * 40 - hz) > hz * 0.01) throw new Error('your wave should follow the slider')
    } else {
      await page.locator('#pitch').fill(String(300 + i * 100))
    }
    await page.getByRole('button', { name: 'Lock in' }).click()
    if (i === 0 && !(await page.getByText('Spot on').count())) throw new Error('matching the wave should be spot on')
  }
  await page.locator('.qg-ticket').waitFor()
  if ((await finishes(page)) !== 1) throw new Error('a finished try should send one finish')
  await assertReopenQuiet(page)
}
