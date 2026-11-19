// A paused clock: tap exactly when the pendulum is over the zone for three rounds, then miss on purpose.
module.exports = async ({ page, B }) => {
  await page.clock.install()
  await page.goto(B + '/pendulum-stop/')
  const stage = page.locator('.ps-stage')
  await stage.waitFor()
  await page.clock.pauseAt(Date.now() + 60_000)
  await page.clock.runFor(100)
  // Time into a swing (starting at the left extreme, -60°) when the angle equals the zone centre.
  const hitTime = (r) => (r.period / (2 * Math.PI)) * Math.acos(-r.center / 60)
  await stage.dispatchEvent('pointerdown') // start
  for (let k = 0; k < 3; k++) {
    const r = JSON.parse(await stage.getAttribute('data-round'))
    await page.clock.runFor(Math.round(hitTime(r)))
    if (k === 1) { await stage.focus(); await page.keyboard.press('Space') } else await stage.dispatchEvent('pointerdown')
    await page.clock.runFor(650) // the next swing starts 650 ms after a good stop
  }
  // Miss: tap right at the left extreme, far outside any zone.
  const r = JSON.parse(await stage.getAttribute('data-round'))
  await page.clock.runFor(r.period)
  await stage.dispatchEvent('pointerdown')
  await page.clock.runFor(1200)
  await page.locator('.qg-ticket').waitFor()
  await page.clock.runFor(2000) // let the headline finish counting up
  if (!/Stopped it in the zone 3 times in a row/.test(await page.locator('.qg-ticket').innerText())) throw new Error('should have cleared 3 rounds')
  await page.locator('.qg-ticket').getByText('3 rounds', { exact: true }).waitFor({ timeout: 5000 })
}
