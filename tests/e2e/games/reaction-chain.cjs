module.exports = async ({ page, B }) => {
  await page.goto(B + '/reaction-chain/')
  const panel = page.locator('.qg-stage[role=button]')
  for (let i = 0; i < 5; i++) {
    await panel.dispatchEvent('pointerdown')
    await page.getByText('TAP!').waitFor({ timeout: 6000 })
    await page.waitForTimeout(150)
    await panel.dispatchEvent('pointerdown')
  }
  await page.locator('.qg-ticket').waitFor()
}
