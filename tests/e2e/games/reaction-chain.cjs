// A clean run gives an average and a record. Regression: five false starts give no result,
// no record and no "fastest round", but still count as played.
module.exports = async ({ page, B }) => {
  const stats = () => page.evaluate(() => JSON.parse(localStorage.getItem('qg:stats:reaction-chain') ?? '{"plays":0,"best":null}'))
  await page.goto(B + '/reaction-chain/')
  const panel = page.locator('.qg-stage[role=button]')
  for (let i = 0; i < 5; i++) {
    await panel.dispatchEvent('pointerdown') // arm
    await panel.dispatchEvent('pointerdown') // tap while still red
  }
  await page.locator('.qg-ticket').waitFor()
  const t = await page.locator('.qg-ticket').innerText()
  if (!/Too many early taps/.test(t) || /Fastest round/.test(t)) throw new Error('five false starts were scored: ' + t)
  let s = await stats()
  if (s.best != null || s.plays !== 1) throw new Error('five false starts should count as played without a record: ' + JSON.stringify(s))

  await page.getByRole('button', { name: 'Play again' }).click()
  for (let i = 0; i < 5; i++) {
    await panel.dispatchEvent('pointerdown')
    await page.getByText('TAP!').waitFor({ timeout: 6000 })
    await page.waitForTimeout(150)
    await panel.dispatchEvent('pointerdown')
  }
  await page.locator('.qg-ticket').getByText(/ms average/).first().waitFor()
  s = await stats()
  if (s.best == null || s.plays !== 2) throw new Error('a clean run should set a record: ' + JSON.stringify(s))
}
