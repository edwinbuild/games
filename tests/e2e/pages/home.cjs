// Home: the two filter rows (when, kind) show the right sections and are remembered; category
// pages open filtered; the desktop rail replaces the chips; the progress ring counts the day.
const sections = (page) => page.locator('.home-main h2').allInnerTexts()
module.exports = async ({ page, B, browser }) => {
  await page.goto(B + '/')
  const ring = page.locator('.today-line .qg-ring')
  if (!/^0 of \d+ daily games played today$/.test(await ring.getAttribute('aria-label'))) throw new Error('ring label: ' + (await ring.getAttribute('aria-label')))
  const all = await sections(page)
  if (!all.includes('Today’s puzzles') || !all.includes('Play with friends')) throw new Error('All should show every section: ' + all)

  // Kind: With friends shows one section of the six multiplayer games.
  await page.getByRole('button', { name: /^With friends/ }).click()
  let now = await sections(page)
  if (now.length !== 1 || now[0] !== 'With friends') throw new Error('With friends filter: ' + now)
  if ((await page.locator('.home-main .qg-card').count()) !== 5) throw new Error('expected 5 games with friends (the two reaction duels share one card)')

  // Remembered after a reload; a played daily game moves the ring.
  await page.evaluate(() => {
    const d = new Date(); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    localStorage.setItem('qg:stats:blind-timer', JSON.stringify({ plays: 0, best: null, lastDaily: k, streak: 1, maxStreak: 1, daily: { [k]: 0.1 }, dailyText: { [k]: '0.10s' } }))
  })
  await page.reload()
  if ((await sections(page))[0] !== 'With friends') throw new Error('filter not remembered')
  if (!/^1 of \d+ daily games played today$/.test(await ring.getAttribute('aria-label'))) throw new Error('ring did not count the played game')

  // When: Daily with every kind shows only today's puzzles; Daily + With friends is empty, with a way back.
  await page.getByRole('button', { name: /^Daily/ }).click()
  if (!/No games match/.test(await page.locator('.home-main').innerText())) throw new Error('Daily + With friends should be empty')
  await page.getByRole('button', { name: 'Show every game' }).click()
  await page.getByRole('button', { name: /^Daily/ }).click()
  now = await sections(page)
  if (now.length !== 1 || now[0] !== 'Today’s puzzles') throw new Error('Daily filter: ' + now)
  await page.getByRole('button', { name: /^All/ }).click()
  if ((await sections(page)).length !== all.length) throw new Error('All did not bring every section back')

  // A card opens its game with the page transition and no errors (the transition opt-in used to
  // arrive too late, with the JavaScript-loaded stylesheet, and every navigation logged an error).
  await page.locator('a.qg-card[href="/flip-grid/"]').click()
  await page.waitForURL(/\/flip-grid\//, { waitUntil: 'load' })
  await page.locator('.game-title').waitFor()
  await page.waitForTimeout(500)

  // A category page opens on its kind, with its own heading.
  await page.goto(B + '/c/logic/')
  await page.getByRole('heading', { name: 'Logic games' }).waitFor()
  const kinds = await page.locator('.home-main .qg-card').evaluateAll((cs) => cs.map((c) => c.getAttribute('href')))
  if (kinds.length < 5 || !kinds.includes('/flip-grid/') || kinds.includes('/blind-timer/')) throw new Error('logic page lists ' + kinds)
  await page.evaluate(() => localStorage.clear())

  // Desktop: the rail is there instead of the chips, and filters from it.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const d = await ctx.newPage()
  try {
    await d.goto(B + '/')
    await d.locator('.home-rail').waitFor()
    if (await d.locator('.home-chips').isVisible()) throw new Error('chips should hide beside the rail')
    await d.locator('.home-rail').getByRole('button', { name: /^Timing/ }).click()
    const t = await d.locator('.home-main h2').allInnerTexts()
    if (t.length !== 1 || t[0] !== 'Timing') throw new Error('rail filter: ' + t)
  } finally { await ctx.close() }
}
