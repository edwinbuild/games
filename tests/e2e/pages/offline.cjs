// Installable and offline: the page links the manifest and icons; with the service worker on
// (a test flag; the live site always has it), any-time games open with no connection, even ones
// never visited, and a visited page comes back offline too.
module.exports = async ({ page, B }) => {
  await page.context().addInitScript(() => localStorage.setItem('qg:sw-test', 'true'))
  await page.goto(B + '/')
  const manifest = await page.locator('link[rel="manifest"]').getAttribute('href')
  const m = await (await page.request.get(B + manifest)).json()
  if (m.display !== 'standalone' || !m.icons.some((i) => i.purpose === 'maskable')) throw new Error('manifest incomplete')
  for (const i of m.icons) if ((await page.request.get(B + i.src)).status() !== 200) throw new Error('missing icon ' + i.src)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 })
  await page.goto(B + '/about/') // visited online, so cached
  await page.context().setOffline(true)
  try {
    await page.goto(B + '/orbit-drop/')
    await page.locator('.qg-stage').first().waitFor({ timeout: 10000 })
    await page.goto(B + '/dots-and-boxes/')
    await page.locator('.db-board').waitFor({ timeout: 10000 })
    await page.goto(B + '/about/')
    await page.getByRole('heading', { name: /About/ }).waitFor({ timeout: 10000 })
  } finally {
    await page.context().setOffline(false)
  }
}
