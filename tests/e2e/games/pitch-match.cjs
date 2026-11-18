module.exports = async ({ page, B }) => {
  await page.goto(B + '/pitch-match/')
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: /Listen/ }).click()
    await page.locator('#pitch').fill(String(300 + i * 100))
    await page.getByRole('button', { name: 'Lock in' }).click()
  }
  await page.locator('.qg-ticket').waitFor()
}
