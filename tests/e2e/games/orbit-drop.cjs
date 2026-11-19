// Lets go when the ball is aimed at the next planet three times (each one caught), then when it
// isn't (lost): the ticket shows 3 planets and the best is recorded. Space works too.
const { stats } = require('../helpers.cjs')
module.exports = async ({ page, B }) => {
  await page.goto(B + '/orbit-drop/')
  const stage = page.locator('.od-stage')
  await stage.waitFor()
  const waitAim = (want) => page.waitForFunction((w) => document.querySelector('.od-stage')?.getAttribute('data-aim') === w, want, { timeout: 15000, polling: 'raf' })
  for (let n = 1; n <= 3; n++) {
    await waitAim('hit')
    if (n === 2) { await stage.focus(); await page.keyboard.press('Space') } else await stage.dispatchEvent('pointerdown')
    await page.waitForFunction((n) => document.querySelector('.od-stage')?.getAttribute('data-planet') === String(n), n, { timeout: 5000 })
  }
  await waitAim('miss')
  await stage.dispatchEvent('pointerdown')
  await page.locator('.qg-ticket').waitFor({ timeout: 8000 })
  await page.waitForTimeout(1000)
  const t = await page.locator('.qg-ticket').innerText()
  if (!/3 planets reached/.test(t)) throw new Error('ticket wrong: ' + t)
  const st = await stats(page, 'orbit-drop')
  if (st.best !== 3 || st.plays !== 1) throw new Error('stats wrong: ' + JSON.stringify(st))
  // Play again starts a fresh run at 0.
  await page.getByRole('button', { name: 'Play again' }).click()
  await page.waitForFunction(() => document.querySelector('.od-stage')?.getAttribute('data-planet') === '0')
}
