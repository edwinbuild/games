// The archive: pick a past day, open a game's puzzle from that day; it says it's just for fun.
module.exports = async ({ page, B }) => {
  await page.context().route('**/rest/v1/rpc/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }))
  await page.goto(B + '/archive/')
  await page.getByRole('heading', { name: 'Archive', level: 1 }).waitFor()
  await page.getByLabel('Day').fill('2026-11-18')
  await page.getByRole('heading', { level: 2, name: /18 November|November 18/ }).waitFor()
  await page.getByRole('link', { name: /Garden Path/ }).click()
  await page.getByRole('heading', { level: 1, name: 'Garden Path' }).waitFor()
  await page.getByText(/From the archive: the puzzle from Nov 18\. Just for fun/).waitFor()
  // Out of range: a note instead of games.
  await page.goto(B + '/archive/')
  await page.getByLabel('Day').fill('2020-01-01')
  await page.getByText('Pick a day between launch and yesterday.').waitFor()
}
