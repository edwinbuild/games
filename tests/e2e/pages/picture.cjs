// Share as a picture: on a desktop browser the ticket downloads as a 1080 × 1080 PNG.
module.exports = async ({ page, B }) => {
  await page.context().route('**/rest/v1/rpc/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }))
  await page.goto(B + '/blind-timer/')
  await page.getByRole('button', { name: 'Start' }).dispatchEvent('pointerdown')
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: 'Stop' }).dispatchEvent('pointerdown')
  await page.locator('.qg-ticket').waitFor()
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Share as a picture/ }).click()])
  if (dl.suggestedFilename() !== 'blind-timer.png') throw new Error('file name: ' + dl.suggestedFilename())
  const buf = require('fs').readFileSync(await dl.path())
  if (buf.toString('ascii', 1, 4) !== 'PNG' || buf.readUInt32BE(16) !== 1080 || buf.readUInt32BE(20) !== 1080) throw new Error('not a 1080 PNG')
  await page.getByText('Picture saved.').waitFor()
}
