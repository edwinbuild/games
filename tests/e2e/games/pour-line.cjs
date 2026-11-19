// Pours by touch and by Space with a controlled clock: the same hold always gives the same result, and a long hold spills.
module.exports = async ({ page, B }) => {
  await page.clock.install()
  await page.goto(B + '/pour-line/')
  const stage = page.locator('.pl-stage')
  await stage.waitFor()
  // Stop the clock running by itself, so each hold lasts exactly as long as asked.
  await page.clock.pauseAt(Date.now() + 60_000)
  await page.clock.runFor(200)
  const lastTry = async () => (await page.locator('.qg-stage p').first().innerText()).replace('Last try: ', '')
  const touchPour = async (ms) => {
    await stage.dispatchEvent('pointerdown')
    await page.clock.runFor(ms)
    await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup')))
    await page.clock.runFor(2500)
    await page.locator('.qg-ticket').waitFor()
  }
  await touchPour(1200)
  const first = await lastTry()
  if (!/^\d+\.\d% off$/.test(first)) throw new Error('first pour not scored: ' + first)

  await page.getByRole('button', { name: 'Try again' }).click()
  await stage.waitFor()
  await page.clock.runFor(100)
  await touchPour(9000)
  if ((await lastTry()) !== 'spilled') throw new Error('a long pour should spill')

  // Same hold with Space: same result.
  await page.getByRole('button', { name: 'Try again' }).click()
  await stage.waitFor()
  await page.clock.runFor(100)
  await page.locator('body').click({ position: { x: 2, y: 2 } })
  await page.keyboard.down(' ')
  await page.clock.runFor(1200)
  await page.keyboard.up(' ')
  await page.clock.runFor(2500)
  await page.locator('.qg-ticket').waitFor()
  if ((await lastTry()) !== first) throw new Error(`same hold gave ${await lastTry()} not ${first}`)
  const t = await page.locator('.qg-ticket').innerText()
  if (!/best of 3 tries/i.test(t) || !t.includes(first)) throw new Error('ticket wrong: ' + t)
}
