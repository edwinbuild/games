// Builds today's shortest ladder (shown to the page in test mode only), after refused steps:
// not a word, two letters changed, too short; Take back; a refresh keeps the ladder; on par.
module.exports = async ({ page, B }) => {
  await page.context().addInitScript(() => localStorage.setItem('qg:test-solutions', 'true'))
  await page.goto(B + '/word-ladder/')
  const ladder = page.locator('.wl-ladder')
  await ladder.waitFor()
  const path = (await ladder.getAttribute('data-ladder')).split(' ')
  const par = +(await page.getByText(/^Par \d/).innerText()).match(/Par (\d)/)[1]
  if (path.length !== par) throw new Error(`shortest ladder ${path.length} vs par ${par}`)
  const input = page.locator('#wl-input')
  const add = async (w) => { await input.fill(w); await input.press('Enter') }
  const msg = () => page.locator('#wl-msg').innerText()

  await add('zzzz')
  if (!/isn’t in the word list/.test(await msg())) throw new Error('nonsense should be refused: ' + (await msg()))
  const start = (await ladder.locator('.wl-word').first().getAttribute('aria-label'))
  // A real word that changes two letters (the second step of the ladder, from the start).
  if (path.length > 1) {
    await add(path[1])
    if (!/Change exactly one letter/.test(await msg())) throw new Error('two letters changed should be refused: ' + (await msg()))
  }
  // A good step, taken back, then the whole ladder with a refresh in the middle.
  await add(path[0])
  await page.getByRole('button', { name: 'Take back the last word' }).click()
  if ((await ladder.locator('.wl-word--step').count()) !== 0) throw new Error('take back should remove the step')
  for (let i = 0; i < path.length; i++) {
    await add(path[i])
    if (i === 0) { await page.reload(); await input.waitFor(); if ((await ladder.locator('.wl-word').nth(1).getAttribute('aria-label')) !== path[0]) throw new Error('refresh lost the ladder') }
  }
  await page.getByRole('button', { name: /See my result/ }).click()
  await page.locator('.qg-ticket').waitFor()
  await page.waitForTimeout(1200)
  const t = await page.locator('.qg-ticket').innerText()
  if (!new RegExp(`${start.toUpperCase()} to .+ in ${par} steps`).test(t) || !/on par/.test(t)) throw new Error('ticket wrong: ' + t)
}
