// Privacy page: the footer links to it; "Download my data" saves this browser's data as JSON;
// "Delete everything" asks first, calls the (stand-in) database function with the board key,
// and clears the device.
module.exports = async ({ page, B }) => {
  const calls = []
  await page.context().route('**/rest/v1/rpc/forget_me', async (r) => { calls.push(JSON.parse(r.request().postData())); await r.fulfill({ status: 200, contentType: 'application/json', body: '3' }) })
  await page.goto(B + '/')
  await page.evaluate(() => {
    localStorage.setItem('qg:board-key', JSON.stringify('0123456789abcdef0123456789abcdef'))
    localStorage.setItem('qg:stats:word-ladder', JSON.stringify({ plays: 2, best: 4 }))
    sessionStorage.setItem('qg:run:test', '1')
  })
  await page.locator('.qg-footer a[href="/privacy/"]').click()
  await page.waitForURL(/\/privacy\/$/)
  await page.getByRole('heading', { name: 'Privacy' }).waitFor()

  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download my data' }).click()])
  const data = JSON.parse(require('node:fs').readFileSync(await dl.path(), 'utf8'))
  if (data.device['stats:word-ladder']?.best !== 4 || data.thisTab['run:test'] !== 1) throw new Error('download is missing data: ' + JSON.stringify(data))

  await page.getByRole('button', { name: 'Delete everything' }).click()
  await page.getByRole('button', { name: 'Keep it' }).click()
  if (calls.length) throw new Error('deleted without confirming')
  await page.getByRole('button', { name: 'Delete everything' }).click()
  await page.getByRole('button', { name: 'Yes, delete everything' }).click()
  await page.getByText(/Done. Everything is deleted/).waitFor()
  if (calls.length !== 1 || calls[0].p_key !== '0123456789abcdef0123456789abcdef') throw new Error('forget_me not called once with the key: ' + JSON.stringify(calls))
  const left = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter((k) => k.startsWith('qg:')))
  if (left.length) throw new Error('left on the device: ' + left)
}
