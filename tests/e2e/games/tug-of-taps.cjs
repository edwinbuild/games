// Two fingers at once on the two halves; thumbs must alternate: mashing one side pulls once,
// alternating left and right pulls every time. Taps before Go don't count.
module.exports = async ({ page, B }) => {
  await page.clock.install()
  await page.goto(B + '/tug-of-taps/')
  await page.getByRole('button', { name: 'Start the tug' }).click()
  const halves = page.locator('.qg-split-half')
  const boxes = [await halves.nth(0).boundingBox(), await halves.nth(1).boundingBox()]
  // A tap on one side of a half (real coordinates, so the game can tell left from right).
  const tap = (h, side, id) => halves.nth(h).dispatchEvent('pointerdown', { pointerId: id, clientX: boxes[h].x + boxes[h].width * (side === 'left' ? 0.25 : 0.75), clientY: boxes[h].y + boxes[h].height / 2 })
  await tap(0, 'left', 1) // before Go: must not count
  await page.clock.runFor(2200)
  for (let i = 0; i < 40 && !(await page.locator('.qg-ticket').count()); i++) {
    await Promise.all([
      tap(1, i % 2 ? 'right' : 'left', 2), // Aqua alternates
      i % 3 === 0 ? tap(0, 'left', 3) : Promise.resolve(), // Coral mashes the same side
    ])
  }
  await page.locator('.qg-ticket').waitFor()
  const text = await page.locator('.qg-ticket').innerText()
  if (!/Aqua wins/.test(text)) throw new Error('unexpected winner: ' + text.slice(0, 80))
  const coral = await halves.nth(0).innerText()
  if (!/\b1 pull\b/.test(coral)) throw new Error('mashing one side should pull once: ' + coral.replace(/\s+/g, ' '))
  // Regression: a finished match shows in "Your record" (it used to say "Nothing yet").
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('qg:stats:tug-of-taps') ?? '{"plays":0}').plays === 1)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.reload()
  await page.locator('.game-info').getByText('1 match played').waitFor({ timeout: 5000 })
}
