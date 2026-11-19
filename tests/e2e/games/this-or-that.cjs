// The vote endpoint is replaced with a fixed split so test runs never add real votes.
module.exports = async ({ page, B }) => {
  let votes = 0
  await page.context().route('**/rest/v1/rpc/vote', (r) => { votes++; r.fulfill({ status: 200, contentType: 'application/json', body: '[{"a":62,"b":38}]' }) })
  await page.context().route('**/rest/v1/rpc/split', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[{"a":63,"b":38}]' }))
  await page.goto(B + '/this-or-that/')
  await page.locator('.tot-option').nth(1).click()
  await page.locator('#crowd-guess').fill('55')
  await page.getByRole('button', { name: /Lock in/ }).click()
  await page.locator('.qg-ticket').waitFor()
  const h = await page.locator('.qg-ticket-headline').getAttribute('aria-label') ?? await page.locator('.qg-ticket-headline').textContent()
  // 62–38 including your vote for the second option: the others split 62–37, so 63% picked the first; 55 is 8 points off.
  await page.waitForTimeout(1200) // the headline counts up
  const t = await page.locator('.qg-ticket').innerText()
  if (!/Within 8 points of the crowd/.test(t) || !/63% of the other players/.test(t)) throw new Error('score wrong: ' + h + ' / ' + t)
  await page.reload()
  await page.locator('.qg-ticket').waitFor()
  if (votes !== 1) throw new Error('voted ' + votes + ' times')
  if (await page.locator('.tot-option').count()) throw new Error('could vote again after reload')
  // The live split moved (63–38 now), but the score is the one from when you locked in.
  if (!/Within 8 points/.test(await page.locator('.qg-ticket').innerText())) throw new Error('score changed on reload')
  if (!/Live: 101 votes/.test(await page.locator('.qg-stage').innerText())) throw new Error('live count missing')
}
