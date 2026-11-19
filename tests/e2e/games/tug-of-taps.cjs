// Two fingers at once: pointer events with different ids on the two halves must both count.
module.exports = async ({ page, B }) => {
  await page.clock.install()
  await page.goto(B + '/tug-of-taps/')
  await page.getByRole('button', { name: 'Start the tug' }).click()
  const halves = page.locator('.qg-split-half')
  await halves.nth(0).dispatchEvent('pointerdown', { pointerId: 1 }) // before Go: must not count
  await page.clock.runFor(2200)
  for (let i = 0; i < 30 && !(await page.locator('.qg-ticket').count()); i++) {
    await Promise.all([
      halves.nth(1).dispatchEvent('pointerdown', { pointerId: 2 }),
      i % 3 === 0 ? halves.nth(0).dispatchEvent('pointerdown', { pointerId: 3 }) : Promise.resolve(),
    ])
  }
  await page.locator('.qg-ticket').waitFor()
  const text = await page.locator('.qg-ticket').innerText()
  if (!/Aqua wins/.test(text)) throw new Error('unexpected winner: ' + text.slice(0, 80))
  const coralTaps = Number((/(\d+) taps/.exec(await halves.nth(0).innerText()) || [])[1])
  if (coralTaps !== 10) throw new Error(`Coral taps should be 10 (early tap ignored), got ${coralTaps}`)
  // Regression: a finished match shows in "Your record" (it used to say "Nothing yet").
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('qg:stats:tug-of-taps') ?? '{"plays":0}').plays === 1)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.reload()
  await page.locator('.game-info').getByText('1 match played').waitFor({ timeout: 5000 })
}
