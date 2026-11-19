const { assertFullyVisible, SMALL_PHONE } = require('../helpers.cjs')

module.exports = async ({ page, B }) => {
  await page.clock.install()
  await page.goto(B + '/memory-path/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.clock.runFor(5000)
  await page.locator('.qg-stage button').nth(0).dispatchEvent('pointerdown')
  await page.locator('.qg-stage button').nth(15).dispatchEvent('pointerdown')
  await page.locator('.qg-stage button').nth(5).dispatchEvent('pointerdown')
  await page.locator('.qg-ticket').waitFor()

  // Small phone: after Play again, the grid is fully on screen when the path starts showing.
  const ctx = await page.context().browser().newContext(SMALL_PHONE)
  const p = await ctx.newPage()
  try {
    await p.goto(B + '/memory-path/')
    for (let round = 0; round < 2; round++) {
      await p.getByRole('button', { name: 'Start' }).tap()
      await p.getByText(/^Watch: /).waitFor({ timeout: 8000 })
      await assertFullyVisible(p, '.mp-grid', round ? 'the grid after Play again' : 'the grid')
      await p.getByText(/Your turn|Repeat/i).first().waitFor({ timeout: 10000 }).catch(() => {})
      await p.waitForTimeout(2500)
      await p.locator('.qg-stage button').nth(0).dispatchEvent('pointerdown')
      await p.locator('.qg-stage button').nth(15).dispatchEvent('pointerdown')
      await p.locator('.qg-stage button').nth(5).dispatchEvent('pointerdown')
      await p.locator('.qg-ticket').waitFor({ timeout: 8000 })
      if (!round) { await p.waitForTimeout(1200); await p.getByRole('button', { name: 'Play again' }).tap() }
    }
  } finally { await ctx.close() }
}
