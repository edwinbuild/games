module.exports = async ({ page, B }) => {
  await page.goto(B + '/tap-duel/')
  await page.getByRole('button', { name: 'Start the duel' }).click()
  const halves = page.locator('.qg-split-half')
  // Round 1: Coral taps early and loses it.
  await page.getByText('Wait…').first().waitFor()
  await halves.nth(0).dispatchEvent('pointerdown')
  await page.getByText(/tapped too early/).first().waitFor()
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
}
