// Paints today's hidden grid (shown to the page in test mode only), which every rule holds for, so
// the levels arrive one after another up to twelve. Before that: an empty square breaks the first
// rule, painting works by tap and by keyboard, a refresh keeps the grid; a second try with new
// rules is stopped early and the best try still counts.
module.exports = async ({ page, B }) => {
  await page.context().addInitScript(() => localStorage.setItem('qg:test-solutions', 'true'))
  await page.goto(B + '/rule-stack/')
  const grid = page.locator('.rs-grid')
  await grid.waitFor()
  const hidden = [...(await grid.getAttribute('data-solution'))].map(Number)
  const cells = page.locator('.rs-cell')
  const paints = page.locator('.rs-paint')
  if (!(await page.locator('.rs-rule').first().getByText('✗').count())) throw new Error('an empty grid should break the first rule')
  // Squares 0–14 by tap, colour by colour (a refresh in the middle); the last by keyboard.
  for (let c = 0; c < 4; c++) {
    await paints.nth(c).click()
    for (let i = 0; i < 15; i++) if (hidden[i] === c) await cells.nth(i).click()
    if (c === 1) { await page.reload(); await grid.waitFor() }
  }
  if ((await page.locator('.rs-cell[data-colour]').count()) !== 15) throw new Error('a refresh lost painted squares')
  // Keyboard: focus the top-left square, walk to the bottom right with arrows (focus follows), paint with a number key.
  await cells.nth(0).focus()
  for (let k = 0; k < 3; k++) { await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight') }
  if (!(await cells.nth(15).evaluate((el) => el === document.activeElement))) throw new Error('focus did not follow the arrow keys')
  await page.keyboard.press(String(hidden[15] + 1))
  // Every rule holds for this grid: the levels arrive one by one to the end.
  await page.getByRole('button', { name: /See my result \(12\/12/ }).waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: /See my result/ }).click()
  await page.locator('.qg-ticket').waitFor()

  // A second try: twelve new rules; stop after clearing a couple.
  await page.getByRole('button', { name: /Try again/ }).click()
  await grid.waitFor()
  const hidden2 = [...(await grid.getAttribute('data-solution'))].map(Number)
  if (hidden2.join() === hidden.join()) throw new Error('try 2 should have new rules')
  await paints.nth(0).click()
  for (let i = 0; i < 16; i++) await cells.nth(i).click() // all red: fills the grid, so the first rule clears
  await page.getByText(/^Level [2-9]/).waitFor({ timeout: 5000 })
  await page.getByRole('button', { name: /^Stop here/ }).click()
  await page.getByRole('button', { name: /See my result/ }).click()
  await page.locator('.qg-ticket').waitFor()
  await page.waitForTimeout(1200)
  const t = await page.locator('.qg-ticket').innerText()
  if (!/All 12 rules in \d+:\d\d/.test(t) || !/best of 2 tries/i.test(t)) throw new Error('ticket wrong: ' + t)
}
