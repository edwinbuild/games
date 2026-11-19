// Stand-in crowd functions (never real answers): answer, guess, the crowd chart, coming back, and too few answers.
module.exports = async ({ page, B }) => {
  let sent = [], crowd = { n: 150, mean: 0.4, hist: [1, 2, 4, 7, 11, 16, 22, 25, 21, 18, 14, 12, 9, 7, 5, 4, 3, 2, 1, 1] }
  await page.route('**/rest/v1/rpc/crowd_answer', async (r) => { sent.push(JSON.parse(r.request().postData())); await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([crowd]) }) })
  await page.route('**/rest/v1/rpc/crowd_numbers', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([crowd]) }))
  await page.goto(B + '/guess-the-crowd/')
  const slider = page.locator('#gc-slider')
  await slider.waitFor()
  const setShare = async (f) => slider.evaluate((el, f) => {
    const min = +el.min, max = +el.max, step = +el.step
    const v = Math.round((min + f * (max - min)) / step) * step
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    set.call(el, String(v)); el.dispatchEvent(new Event('input', { bubbles: true }))
  }, f)
  await setShare(0.7)
  await page.getByRole('button', { name: 'That’s my answer' }).click()
  await setShare(0.42)
  await page.getByRole('button', { name: 'Lock in my guess' }).click()
  await page.locator('.qg-ticket').waitFor()
  if (sent.length !== 1 || Math.abs(sent[0].p_value - 0.7) > 0.05) throw new Error('answer not sent once as a share: ' + JSON.stringify(sent))
  if ((await page.locator('.qg-hist-mark').count()) !== 3) throw new Error('chart marks missing')
  if (!/% off/.test(await page.locator('.qg-ticket').innerText())) throw new Error('no score')

  // Coming back: the result again, read fresh; no second answer.
  await page.reload()
  await page.locator('.qg-hist').waitFor()
  if (sent.length !== 1 || (await page.locator('#gc-slider').count())) throw new Error('could answer twice')

  // Too few answers: say so, no chart, no score.
  crowd = { n: 6, mean: 0.5, hist: Array(20).fill(0) }
  await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('guess-the-crowd')).forEach((k) => localStorage.removeItem(k)))
  await page.reload()
  await setShare(0.3)
  await page.getByRole('button', { name: 'That’s my answer' }).click()
  await page.getByRole('button', { name: 'Lock in my guess' }).click()
  await page.getByText(/Only 6 answers so far, too few/).waitFor()
  if (await page.locator('.qg-hist').count()) throw new Error('chart shown with too few answers')
  if (!/Answer saved/.test(await page.locator('.qg-ticket').innerText())) throw new Error('ticket should wait for the crowd')
}
