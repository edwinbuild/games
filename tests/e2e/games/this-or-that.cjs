// The vote endpoint is replaced with a fixed split so test runs never add real votes.
module.exports = async ({ page, B }) => {
  let votes = 0
  await page.route('**/rest/v1/rpc/vote', (r) => { votes++; r.fulfill({ status: 200, contentType: 'application/json', body: '[{"a":62,"b":38}]' }) })
  await page.route('**/rest/v1/rpc/split', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[{"a":63,"b":38}]' }))
  await page.goto(B + '/this-or-that/')
  await page.locator('.tot-option').nth(1).click()
  await page.locator('#crowd-guess').fill('55')
  await page.getByRole('button', { name: /Lock in/ }).click()
  await page.locator('.qg-ticket').waitFor()
  const h = await page.locator('.qg-ticket-headline').getAttribute('aria-label') ?? await page.locator('.qg-ticket-headline').textContent()
  if (!/7%/.test(await page.locator('.qg-ticket').innerText())) throw new Error('score wrong: ' + h)
  await page.reload()
  await page.locator('.qg-ticket').waitFor()
  if (votes !== 1) throw new Error('voted ' + votes + ' times')
  if (await page.locator('.tot-option').count()) throw new Error('could vote again after reload')
}
