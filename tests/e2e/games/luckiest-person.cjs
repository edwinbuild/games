module.exports = async ({ page, B }) => {
  await page.goto(B + '/luckiest-person/')
  await page.locator('.lucky-card').nth(1).click()
  await page.locator('.qg-ticket').waitFor()
  await page.reload()
  await page.locator('.qg-ticket').waitFor()
  if (await page.locator('.lucky-card:not([disabled])').count()) throw new Error('cards pickable after reload')
}
