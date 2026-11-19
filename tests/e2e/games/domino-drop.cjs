// A push with no spares stops early; then spares in every gap (four by tap, one by keyboard) bring all 40 down.
module.exports = async ({ page, B }) => {
  await page.goto(B + '/domino-drop/')
  const cv = page.locator('.dd-canvas')
  await cv.waitFor()
  await page.waitForTimeout(300)
  const line = JSON.parse(await cv.getAttribute('data-line'))
  const gaps = []
  for (let k = 1; k < line.length; k++) {
    const [a, b] = [line[k - 1], line[k]]
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 40) gaps.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])
  }
  if (gaps.length !== 5) throw new Error('expected 5 gaps, found ' + gaps.length)
  const lastRun = async () => +(await page.locator('.qg-stage p').first().innerText()).match(/Last run: (\d+)/)[1]

  // No spares: the run stops at the first gap.
  await page.locator('body').click({ position: { x: 2, y: 2 } })
  await page.keyboard.press('Space')
  await page.locator('.qg-ticket').waitFor({ timeout: 20000 })
  if ((await lastRun()) >= 40) throw new Error('the run should stop at a gap')

  await page.getByRole('button', { name: 'Try again' }).click()
  await cv.waitFor()
  await page.waitForTimeout(300)
  // Enter with no cursor yet brings the cursor out; it never presses Push.
  await page.locator('body').click({ position: { x: 2, y: 2 } })
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  if (await page.locator('.qg-ticket').count() || !(await page.getByRole('button', { name: 'Push' }).isEnabled())) throw new Error('Enter pressed Push')
  const box = await cv.boundingBox()
  // Clicks relative to the board, so scrolling doesn't matter.
  const tapAt = ([x, y]) => cv.click({ position: { x: (x / 300) * box.width, y: (y / 420) * box.height } })
  // A tap on a standing domino is refused.
  await tapAt(line[3])
  if (!(await page.getByText('Spares left: 5').count())) throw new Error('a spare went on top of a domino')
  for (const g of gaps.slice(0, 4)) { await tapAt(g); await page.waitForTimeout(50) }
  await page.getByText('Spares left: 1').waitFor()
  // The fifth by keyboard: the cursor starts on the first domino and moves 1 unit per Shift+arrow.
  await page.locator('body').click({ position: { x: 2, y: 2 } })
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft') // show the cursor at the first domino
  let cx = line[0][0], cy = line[0][1]
  const [tx, ty] = gaps[4]
  const big = (d) => Math.trunc(d / 4)
  for (let i = 0; i < Math.abs(big(tx - cx)); i++) await page.keyboard.press(tx > cx ? 'ArrowRight' : 'ArrowLeft')
  cx += big(tx - cx) * 4
  for (let i = 0; i < Math.abs(big(ty - cy)); i++) await page.keyboard.press(ty > cy ? 'ArrowDown' : 'ArrowUp')
  cy += big(ty - cy) * 4
  await page.keyboard.press('Enter')
  await page.getByText('Spares left: 0').waitFor()
  await page.keyboard.press('Space')
  // Refresh while they fall: the run was recorded at the push.
  await page.waitForTimeout(400)
  await page.reload()
  await page.locator('.qg-ticket').waitFor({ timeout: 10000 })
  await page.waitForTimeout(1200) // the headline counts up
  const t = await page.locator('.qg-ticket').innerText()
  if (!/40 of 40 fell/.test(t) || !/best of 2 tries/i.test(t)) throw new Error('ticket wrong: ' + t)
}
