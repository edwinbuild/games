// Plays ten rounds. Regression checks: a refresh mid-run resumes it, and a refresh after the tenth
// answer (before "See your total") keeps the finished run and its record.
module.exports = async ({ page, B }) => {
  await page.goto(B + '/angle-eye/')
  const board = page.locator('.ae-board')
  const plays = () => page.evaluate(() => JSON.parse(localStorage.getItem('qg:stats:angle-eye') ?? '{"plays":0}').plays)
  for (let i = 0; i < 10; i++) {
    if (i === 4) {
      await page.reload()
      await page.getByText('Round 5 of 10').waitFor({ timeout: 5000 })
    }
    const box = await board.boundingBox()
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4)
    await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45); await page.mouse.up()
    if (i === 0) { await board.focus(); await page.keyboard.press('ArrowRight') }
    await page.getByRole('button', { name: 'Lock in' }).click()
    await page.getByText(/\/10 ·/).waitFor()
    if (i < 9) await page.getByRole('button', { name: 'Next round' }).click()
  }
  if ((await plays()) !== 1) throw new Error('the run should be recorded at the tenth answer')
  await page.reload()
  await page.locator('.qg-ticket').waitFor({ timeout: 5000 })
  if (!/\/ 100/.test(await page.locator('.qg-ticket').innerText())) throw new Error('no total after refresh')
  if ((await plays()) !== 1) throw new Error('a refresh must not record the run twice')
  // Play again starts new rounds (the last run's answers were shown).
  await page.getByRole('button', { name: 'Play again' }).click()
  await page.getByText('Round 1 of 10').waitFor()
}
