// Home: filter chips show one section and are remembered; the progress ring counts today's daily games.
module.exports = async ({ page, B }) => {
  await page.goto(B + '/')
  const sections = () => page.locator('main h2, .page--home h2').allInnerTexts()
  const ring = page.locator('.qg-ring')
  if (!/^0 of \d+ daily games played today$/.test(await ring.getAttribute('aria-label'))) throw new Error('ring label: ' + (await ring.getAttribute('aria-label')))
  const all = await sections()
  if (!all.includes('Today’s puzzles') || !all.includes('Play with friends')) throw new Error('All should show every section: ' + all)

  await page.getByRole('button', { name: /^With friends/ }).click()
  let now = await sections()
  if (now.includes('Today’s puzzles') || !now.includes('Play with friends')) throw new Error('With friends filter: ' + now)
  if ((await page.getByRole('button', { name: /^With friends/ }).getAttribute('aria-pressed')) !== 'true') throw new Error('chip not pressed')

  // Remembered after a reload; then play one daily game's worth of stats and the ring moves.
  await page.evaluate(() => {
    const d = new Date(); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    localStorage.setItem('qg:stats:blind-timer', JSON.stringify({ plays: 0, best: null, lastDaily: k, streak: 1, maxStreak: 1, daily: { [k]: 0.1 }, dailyText: { [k]: '0.10s' } }))
  })
  await page.reload()
  now = await sections()
  if (now.includes('Today’s puzzles')) throw new Error('filter not remembered: ' + now)
  if (!/^1 of \d+ daily games played today$/.test(await ring.getAttribute('aria-label'))) throw new Error('ring did not count the played game')

  await page.getByRole('button', { name: /^Daily/ }).click()
  now = await sections()
  if (now.length !== 1 || now[0] !== 'Today’s puzzles') throw new Error('Daily filter: ' + now)
  await page.getByRole('button', { name: /^All/ }).click()
  if ((await sections()).length !== all.length) throw new Error('All did not bring every section back')
  await page.evaluate(() => localStorage.clear())
}
