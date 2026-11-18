module.exports = async ({ page, B }) => {
  await page.goto(B + '/angle-eye/')
  const board = page.locator('.ae-board')
  for (let i = 0; i < 10; i++) {
    const box = await board.boundingBox()
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4)
    await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45); await page.mouse.up()
    if (i === 0) { await board.focus(); await page.keyboard.press('ArrowRight') }
    await page.getByRole('button', { name: 'Lock in' }).click()
    await page.getByText(/\/10 ·/).waitFor()
    await page.getByRole('button', { name: /Next round|See your total/ }).click()
  }
  await page.locator('.qg-ticket').waitFor()
  if (!/\/ 100/.test(await page.locator('.qg-ticket').innerText())) throw new Error('no total')
}
