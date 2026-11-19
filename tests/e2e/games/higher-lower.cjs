// Real Supabase Realtime: three players, a late joiner turned away, one player leaving mid-quiz,
// and both remaining phones agreeing on the final scores.
const opts = { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true }
module.exports = async ({ page, B, browser, scheme }) => {
  if (scheme === 'dark') return // one full online run is enough per suite
  const A = page
  await A.goto(B + '/higher-lower/')
  await A.getByRole('button', { name: 'Create a room' }).click()
  await A.waitForURL(/room=/)
  const code = new URL(A.url()).searchParams.get('room')
  await A.locator('.qg-room-code').waitFor({ timeout: 15000 })
  const ctxs = []
  const join = async () => { const c = await browser.newContext(opts); ctxs.push(c); const p = await c.newPage(); await p.goto(`${B}/higher-lower/?room=${code}`); return p }
  const Bp = await join(), C = await join()
  await A.locator('.qg-lobby li:not(.qg-lobby-empty)').nth(2).waitFor({ timeout: 20000 })
  for (const p of [A, Bp, C]) await p.getByRole('button', { name: 'Ready', exact: true }).click()
  await A.getByRole('button', { name: 'Start the quiz (3 players)' }).click({ timeout: 15000 })
  const D = await join()
  await D.getByText(/already started/).waitFor({ timeout: 20000 })

  // Everyone sees the same first question.
  const q = await Promise.all([A, Bp, C].map(async (p) => { await p.locator('.hl-cards').waitFor({ timeout: 15000 }); return p.locator('.hl-cards').innerText() }))
  if (new Set(q).size !== 1) throw new Error('players got different questions')

  for (let k = 0; k < 10; k++) {
    await A.getByText(`Question ${k + 1} of 10`).waitFor({ timeout: 20000 })
    if (k === 5) { await A.locator('body').click({ position: { x: 2, y: 2 } }); await A.keyboard.press('ArrowUp') }
    else await A.getByRole('button', { name: /▲ Higher/ }).click()
    await Bp.getByRole('button', { name: /▼ Lower/ }).click({ timeout: 20000 })
    if (k < 3) await C.getByRole('button', { name: /▲ Higher/ }).click({ timeout: 20000 })
    if (k === 3) {
      // Regression: C refreshes mid-quiz. They land back in the room, see the match is running, and the
      // others carry on instead of waiting for C's answers forever.
      await C.reload()
      await C.getByText(/already started/).waitFor({ timeout: 20000 })
    }
  }
  await A.locator('.qg-ticket').waitFor({ timeout: 30000 })
  await Bp.locator('.qg-ticket').waitFor({ timeout: 30000 })
  const ra = await A.locator('.sr-ranking').innerText(), rb = await Bp.locator('.sr-ranking').innerText()
  if (!/left/.test(ra)) throw new Error('the player who refreshed should show as left: ' + ra)
  // Rematch: nobody is still marked ready from the last start, so the host can't start straight away.
  await A.getByRole('button', { name: 'Rematch' }).click()
  await A.getByText('Waiting for everyone to be ready').waitFor({ timeout: 20000 })
  // Same totals on both phones (names differ: "You" on each).
  const pts = (t) => [...t.matchAll(/(\d+) pts/g)].map((m) => +m[1]).sort((x, y) => x - y).join(',')
  if (pts(ra) !== pts(rb)) throw new Error(`phones disagree: ${pts(ra)} vs ${pts(rb)}`)
  // A and B answered opposite ways every round, so between them they got all ten right: 3 points each.
  const [a, b] = [ra, rb].map((t) => +t.match(/You\s+(\d+) pts/)[1])
  if (a + b < 30) throw new Error(`A and B together should have at least 30 points, got ${a} + ${b}`)
  for (const c of ctxs) await c.close().catch(() => {})
}
