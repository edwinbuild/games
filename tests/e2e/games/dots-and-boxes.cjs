// Dots & Boxes: a whole game against the easy computer (by tap and by keyboard, with a refresh in
// the middle), the computer starting the rematch, a whole game on one phone, and (light only) a
// whole match between two phones in a real room.
const drawn = (p) => p.locator('.db-line').count()
const hits = (p) => p.locator('.db-hit')

async function playUntilDone(p, { keyboard = false, onMove } = {}) {
  for (let n = 0; n < 80; n++) {
    if (await p.locator('.qg-ticket').count()) return
    const live = p.locator('.db-board.is-live')
    if (!(await live.count())) { await p.waitForTimeout(150); continue }
    const free = hits(p)
    if (!(await free.count())) { await p.waitForTimeout(150); continue }
    const before = await drawn(p)
    if (keyboard && n % 2) { await free.first().focus(); await p.keyboard.press('Enter') }
    else await free.first().click()
    await p.waitForFunction((b) => document.querySelectorAll('.db-line').length > b, before, { timeout: 5000 })
    if (onMove) await onMove(n)
  }
  await p.locator('.qg-ticket').waitFor({ timeout: 15000 })
}

module.exports = async ({ page, B, browser, scheme }) => {
  await page.goto(B + '/dots-and-boxes/')
  await page.getByRole('button', { name: 'Computer', exact: true }).click()
  await page.getByRole('button', { name: 'Easy', exact: true }).click()
  if ((await hits(page).count()) !== 24) throw new Error('easy should be a 3×3 board (24 lines)')
  let reloaded = false
  await playUntilDone(page, {
    keyboard: true,
    onMove: async (n) => {
      if (n !== 4 || reloaded) return
      reloaded = true
      const before = await drawn(page)
      await page.reload()
      await page.locator('.db-board').waitFor()
      await page.waitForTimeout(800)
      if ((await drawn(page)) < before) throw new Error('a refresh lost lines')
    },
  })
  const head = await page.locator('.qg-ticket').innerText()
  if (!/You beat the computer|The computer won|A draw/.test(head)) throw new Error('unexpected result: ' + head)
  const boxes = await page.locator('.db-box').count()
  if (boxes !== 9) throw new Error(`every box should be claimed, got ${boxes}`)

  // The rematch: the computer draws first.
  await page.getByRole('button', { name: /Play again \(computer starts\)/ }).click()
  await page.waitForFunction(() => document.querySelectorAll('.db-line').length >= 1, null, { timeout: 5000 })

  // One phone: two players take turns until every box is claimed.
  await page.getByRole('button', { name: 'Start over' }).click().catch(() => {})
  await page.getByRole('button', { name: 'One phone', exact: true }).click()
  if ((await hits(page).count()) !== 40) throw new Error('one phone should be a 4×4 board (40 lines)')
  await playUntilDone(page, { keyboard: true })
  if (!/(Coral|Aqua) wins|A draw/.test(await page.locator('.qg-ticket').innerText())) throw new Error('one-phone result missing')

  if (scheme === 'dark') return // one online match per suite
  await page.goto(B + '/dots-and-boxes/')
  await page.getByRole('button', { name: 'Online', exact: true }).click()
  await page.getByRole('button', { name: 'Create a room' }).click()
  await page.waitForURL(/room=/)
  const code = new URL(page.url()).searchParams.get('room')
  await page.locator('.qg-room-code').waitFor({ timeout: 15000 })
  const ctxB = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true })
  const other = await ctxB.newPage()
  await other.goto(`${B}/dots-and-boxes/?room=${code}`)
  await page.getByText('Waiting for both to be ready').waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: 'Ready', exact: true }).click()
  await other.getByRole('button', { name: 'Ready', exact: true }).click()
  await page.getByRole('button', { name: 'Start the match' }).click({ timeout: 20000 })
  await other.locator('.db-board').waitFor({ timeout: 15000 })
  // Whoever's turn it is draws the first free line, until both phones show the result.
  for (let n = 0; n < 200; n++) {
    if ((await page.locator('.qg-ticket').count()) && (await other.locator('.qg-ticket').count())) break
    for (const p of [page, other]) {
      if (await p.locator('.db-board.is-live').count()) {
        const before = await drawn(p)
        await hits(p).first().click()
        await p.waitForFunction((b) => document.querySelectorAll('.db-line').length > b, before, { timeout: 5000 })
      }
    }
    await page.waitForTimeout(120)
  }
  await page.locator('.qg-ticket').waitFor({ timeout: 15000 })
  await other.locator('.qg-ticket').waitFor({ timeout: 15000 })
  const [a, b] = [await page.locator('.qg-ticket').innerText(), await other.locator('.qg-ticket').innerText()]
  const won = /You beat/.test(a), lost = /won \d+–\d+/.test(a)
  if (won && !/won \d+–\d+/.test(b)) throw new Error('the phones disagree: ' + a + ' / ' + b)
  if (lost && !/You beat/.test(b)) throw new Error('the phones disagree: ' + a + ' / ' + b)
  if ((await page.locator('.db-line').count()) !== 40 || (await other.locator('.db-line').count()) !== 40) throw new Error('both boards should be full')
  await ctxB.close()
}
