// Taps by keyboard and by pointer on the same bubble (same chain), then another bubble.
module.exports = async ({ page, B }) => {
  await page.goto(B + '/chain-pop/')
  const stage = page.locator('.cp-stage')
  await stage.waitFor()
  await page.waitForTimeout(300)
  const lastTap = async () => +(await page.locator('.qg-stage p').first().innerText()).match(/Last tap: (\d+)/)[1]
  // Try again scrolls the game back into view (smoothly): let it settle before tapping.
  // The scroll can start a moment late, so wait until the stage has stopped moving.
  const settled = async () => { let last = ''; for (let i = 0; i < 40; i++) { const b = JSON.stringify(await stage.boundingBox()); if (b === last) return; last = b; await page.waitForTimeout(150) } }
  const again = async () => { await page.getByRole('button', { name: 'Try again' }).click(); await stage.waitFor(); await page.waitForTimeout(900); await settled() }

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

  // Refresh while the chain is still popping: the tap was recorded when it happened.
  await again()
  await page.locator('body').click({ position: { x: 2, y: 2 } })
  await page.keyboard.press('Space')
  await page.waitForTimeout(150)
  await page.reload()
  await page.locator('.qg-ticket').waitFor({ timeout: 10000 })
  if (!/best of 4 tries/i.test(await page.locator('.qg-ticket').innerText())) throw new Error('the tap before the refresh was lost')
}
