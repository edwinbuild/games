module.exports = async ({ page, B }) => {
  await page.goto(B + '/tap-duel/')
  // One card, two modes: the switch goes to the online page and back.
  await page.getByRole('button', { name: 'Online', exact: true }).click()
  await page.waitForURL(/\/reaction-online\//, { waitUntil: 'load' })
  await page.getByRole('button', { name: 'Create a room' }).waitFor()
  await page.waitForTimeout(400) // let the page transition finish, as a person would
  await page.getByRole('button', { name: 'One phone', exact: true }).click()
  await page.waitForURL(/\/tap-duel\//, { waitUntil: 'load' })
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Start the duel' }).click()
  const halves = page.locator('.qg-split-half')
  // Round 1: Coral taps early and loses it.
  await page.getByText('Wait…').first().waitFor()
  await halves.nth(0).dispatchEvent('pointerdown')
  await page.getByText(/tapped too early/).first().waitFor()
  // Round 2: both tap within a few milliseconds of each other: a tie, played again.
  await page.getByText('TAP!').first().waitFor({ timeout: 8000 })
  await page.waitForTimeout(150)
  await halves.evaluateAll((els) => { for (const el of els) el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })) })
  await page.getByText('Tie! Same round again.').first().waitFor({ timeout: 3000 })
  // Then Aqua wins rounds until the match ends.
  for (let i = 0; i < 5 && !(await page.locator('.qg-ticket').count()); i++) {
    await page.getByText('TAP!').first().waitFor({ timeout: 8000 })
    await page.waitForTimeout(150)
    await halves.nth(1).dispatchEvent('pointerdown')
    await page.waitForTimeout(400)
  }
  await page.locator('.qg-ticket').waitFor()
  const h = await page.locator('.qg-ticket-headline').textContent()
  if (!/Aqua wins 3–0/.test(h)) throw new Error('unexpected result: ' + h)
  // Regression: a finished match shows in "Your record" (it used to say "Nothing yet").
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('qg:stats:tap-duel') ?? '{"plays":0}').plays === 1)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.reload()
  await page.locator('.game-info').getByText('1 match played').waitFor({ timeout: 5000 })
}
