// Real Supabase Realtime: three players race; a fourth is turned away mid-race; one leaves mid-race.
const opts = { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true }
async function clear(p, n) {
  for (let l = 0; l < n; l++) {
    await p.waitForSelector('.qg-stage .grid button')
    const idx = await p.evaluate(() => {
      const bs = [...document.querySelectorAll('.qg-stage .grid button')]; const c = {}
      bs.forEach((b) => (c[b.textContent] = (c[b.textContent] || 0) + 1)); return bs.findIndex((b) => c[b.textContent] === 1)
    })
    await p.locator('.qg-stage .grid button').nth(idx).dispatchEvent('pointerdown')
    await p.waitForTimeout(80)
  }
}
module.exports = async ({ page, B, browser, scheme }) => {
  if (scheme === 'dark') return // one full online run is enough per suite
  const A = page
  await A.goto(B + '/spot-race/')
  await A.getByRole('button', { name: 'Create a room' }).click()
  await A.waitForURL(/room=/)
  const code = new URL(A.url()).searchParams.get('room')
  await A.locator('.qg-room-code').waitFor({ timeout: 15000 })
  const ctxs = []
  const join = async () => { const c = await browser.newContext(opts); ctxs.push(c); const p = await c.newPage(); await p.goto(`${B}/spot-race/?room=${code}`); return p }
  const Bp = await join()
  const C = await join()
  await A.getByText('Waiting for everyone to be ready').waitFor({ timeout: 20000 })
  await A.locator('.qg-lobby li:not(.qg-lobby-empty)').nth(2).waitFor({ timeout: 20000 })
  for (const p of [A, Bp, C]) await p.getByRole('button', { name: 'Ready', exact: true }).click()
  await A.getByRole('button', { name: 'Start the race (3 players)' }).click({ timeout: 15000 })

  // A fourth player arriving mid-race is turned away.
  const D = await join()
  await D.getByText(/already started/).waitFor({ timeout: 20000 })

  // Everyone gets the same first grid.
  await Promise.all([A, Bp, C].map((p) => p.locator('.qg-stage .grid').waitFor({ timeout: 15000 })))
  const grids = await Promise.all([A, Bp, C].map((p) => p.locator('.qg-stage .grid').innerText()))
  if (new Set(grids).size !== 1) throw new Error('players got different grids')

  await clear(A, 4)
  await clear(Bp, 2)
  await clear(C, 3)
  // A sees the others' levels live.
  await A.locator('.qg-scorestrip').getByText('Lv 3').waitFor({ timeout: 10000 })
  await A.locator('.qg-scorestrip').getByText('Lv 2').waitFor({ timeout: 10000 })
  // C leaves mid-race: shown as left, kept in the ranking at level 3.
  await C.context().close()
  await A.locator('.qg-scorestrip').getByText('left').waitFor({ timeout: 30000 })

  await A.locator('.qg-ticket').waitFor({ timeout: 70000 })
  await Bp.locator('.qg-ticket').waitFor({ timeout: 15000 })
  await A.locator('.qg-ticket-headline', { hasText: 'of 3' }).waitFor({ timeout: 15000 })
  const ra = await A.locator('.sr-ranking').innerText()
  if (!/1st[\s\S]*You[\s\S]*Lv 4[\s\S]*2nd[\s\S]*Lv 3 · left[\s\S]*3rd[\s\S]*Lv 2/.test(ra)) throw new Error('wrong ranking on A: ' + ra)
  await Bp.locator('.qg-ticket-headline', { hasText: '3rd of 3' }).waitFor({ timeout: 15000 })

  // Rematch reopens the room: a new player can join the lobby again.
  await A.getByRole('button', { name: 'Rematch' }).click()
  const E = await join()
  await E.locator('.qg-room-code').waitFor({ timeout: 20000 })
  await A.locator('.qg-lobby li:not(.qg-lobby-empty)').nth(1).waitFor({ timeout: 20000 })
  for (const c of ctxs) await c.close().catch(() => {})
}
