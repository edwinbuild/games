// Taps by keyboard and by pointer on the same bubble (same chain), then another bubble.
module.exports = async ({ page, B }) => {
  await page.goto(B + '/chain-pop/')
  const stage = page.locator('.cp-stage')
  await stage.waitFor()
  await page.waitForTimeout(300)
  const lastTap = async () => +(await page.locator('.qg-stage p').first().innerText()).match(/Last tap: (\d+)/)[1]
  const again = async () => { await page.getByRole('button', { name: 'Try again' }).click(); await stage.waitFor(); await page.waitForTimeout(300) }

  await page.locator('body').click({ position: { x: 2, y: 2 } })
  await page.keyboard.press('Space')
  await page.locator('.qg-ticket').waitFor({ timeout: 20000 })
  const first = await lastTap()
  if (!(first >= 1 && first <= 60)) throw new Error('bad count ' + first)

  // The same bubble by pointer gives the same chain.
  await again()
  const x = +(await stage.getAttribute('data-cursor-x')), y = +(await stage.getAttribute('data-cursor-y'))
  await stage.tap({ position: { x, y } })
  await page.locator('.qg-ticket').waitFor({ timeout: 20000 })
  if ((await lastTap()) !== first) throw new Error(`pointer tap gave ${await lastTap()}, keyboard gave ${first}`)

  // Another bubble, chosen with the arrows.
  await again()
  await page.locator('body').click({ position: { x: 2, y: 2 } })
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Space')
  await page.locator('.qg-ticket').waitFor({ timeout: 20000 })
  const third = await lastTap()
  const t = await page.locator('.qg-ticket').innerText()
  if (!/best of 3 tries/i.test(t) || !t.includes(`${Math.max(first, third)} of 60`)) throw new Error('ticket wrong: ' + t)
}
