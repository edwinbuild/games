// Auto play: today's run from home moves on to the next puzzle by itself; an arcade game starts
// again after "Again in 3…"; "Stay here" stops that; the profile switch turns it off.
module.exports = async (args) => {
  let stage = 'start'
  try { await run(args, (x) => { stage = x }) } catch (e) { throw new Error(`[${stage}] ${String(e.message || e).split('\n')[0]}`) }
}
async function run({ page, B }, at) {
  await page.context().addInitScript(() => { if (!sessionStorage.getItem('set')) { localStorage.setItem('qg:autoplay', JSON.stringify({ run: true, replay: true })); sessionStorage.setItem('set', '1') } })
  await page.context().route('**/rest/v1/rpc/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }))

  at("today's run")
  await page.goto(B + '/')
  const go = page.getByRole('button', { name: /Play all \d+ of today’s puzzles/ })
  await go.click()
  await page.waitForURL(/\/blind-timer\/$/)
  await page.getByRole('button', { name: 'Start' }).dispatchEvent('pointerdown')
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'Stop' }).dispatchEvent('pointerdown')
  await page.locator('.qg-ticket').waitFor()
  const card = page.locator('.qg-autonext')
  await card.getByText(/Next in today’s run \(2 of \d+\): .+ in [1-5]…/).waitFor()
  const nextTitle = await card.locator('strong').innerText()
  await page.waitForURL((u) => !u.pathname.startsWith('/blind-timer/'), { timeout: 9000 })
  await page.getByRole('heading', { level: 1, name: nextTitle }).waitFor()

  at('arcade replay')
  await page.goto(B + '/orbit-drop/')
  const st = page.locator('.od-stage')
  const waitAim = (want) => page.waitForFunction((w) => document.querySelector('.od-stage')?.getAttribute('data-aim') === w, want, { timeout: 15000, polling: 'raf' })
  await waitAim('miss')
  await st.dispatchEvent('pointerdown')
  await page.locator('.qg-ticket').waitFor({ timeout: 8000 })
  await page.getByText(/Again in [1-3]…/).waitFor()
  await page.waitForFunction(() => !document.querySelector('.qg-ticket'), null, { timeout: 6000 })
  if ((await st.getAttribute('data-planet')) !== '0') throw new Error('replay should start a fresh run')

  at('stay here')
  await waitAim('miss')
  await st.dispatchEvent('pointerdown')
  await page.locator('.qg-ticket').waitFor({ timeout: 8000 })
  await page.getByRole('button', { name: 'Stay here' }).click()
  await page.waitForTimeout(4000)
  if (!(await page.locator('.qg-ticket').count())) throw new Error('Stay here should keep the result')

  at('profile switch')
  await page.goto(B + '/me/')
  await page.getByLabel(/Arcade games: start again/).uncheck()
  await page.goto(B + '/orbit-drop/')
  await waitAim('miss')
  await st.dispatchEvent('pointerdown')
  await page.locator('.qg-ticket').waitFor({ timeout: 8000 })
  await page.waitForTimeout(1500)
  if (await page.getByText(/Again in/).count()) throw new Error('replay should be off')
}
