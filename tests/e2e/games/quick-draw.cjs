// Real Supabase Realtime, three players: strokes appear on other phones, wrong and rude guesses
// show (rude ones masked), a right guess ends the round with points, and a drawer who leaves is skipped.
const opts = { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true }
module.exports = async ({ page, B, browser, scheme }) => {
  if (scheme === 'dark') return // one full online run is enough per suite
  const A = page
  await A.goto(B + '/quick-draw/')
  await A.getByRole('button', { name: 'Create a room' }).click()
  await A.waitForURL(/room=/)
  const code = new URL(A.url()).searchParams.get('room')
  await A.locator('.qg-room-code').waitFor({ timeout: 15000 })
  const ctxs = []
  const join = async () => { const c = await browser.newContext(opts); ctxs.push(c); const p = await c.newPage(); await p.goto(`${B}/quick-draw/?room=${code}`); return p }
  const Bp = await join(), C = await join()
  await A.locator('.qg-lobby li:not(.qg-lobby-empty)').nth(2).waitFor({ timeout: 20000 })
  for (const p of [A, Bp, C]) await p.getByRole('button', { name: 'Ready', exact: true }).click()
  await A.getByRole('button', { name: 'Start drawing (3 players)' }).click({ timeout: 15000 })

  const drawOn = async (p) => {
    const cv = p.locator('.qd-canvas')
    await cv.waitFor()
    const box = await cv.boundingBox()
    await p.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5); await p.mouse.down()
    for (let i = 1; i <= 10; i++) await p.mouse.move(box.x + box.width * (0.2 + i * 0.06), box.y + box.height * (0.5 - Math.sin(i / 3) * 0.2))
    await p.mouse.up()
  }
  const guessOn = async (p, text) => { await p.locator('#qd-guess').fill(text); await p.locator('#qd-guess').press('Enter') }

  // Round 1: A draws.
  await A.getByText('Round 1 of 3 · you draw').waitFor({ timeout: 15000 })
  const word1 = await A.locator('.qd-word').innerText()
  await drawOn(A)
  await C.waitForFunction(() => +(document.querySelector('.qd-canvas')?.dataset.strokes ?? 0) >= 1, null, { timeout: 10000 })
  await guessOn(Bp, 'zzzz')
  await C.locator('.qd-feed').getByText('zzzz').waitFor({ timeout: 10000 })
  await guessOn(Bp, 'sh1t')
  await C.locator('.qd-feed').getByText('•••').waitFor({ timeout: 10000 })
  if (await C.locator('.qd-feed').getByText('sh1t').count()) throw new Error('a rude guess reached another phone')
  await guessOn(C, word1.toUpperCase() + (word1.endsWith('s') ? '' : 's'))
  await A.getByText(/It was “.+” · .+ got it/).waitFor({ timeout: 10000 })

  // Round 2: B draws, A guesses right.
  await Bp.getByText('Round 2 of 3 · you draw').waitFor({ timeout: 15000 })
  const word2 = await Bp.locator('.qd-word').innerText()
  await drawOn(Bp)
  await guessOn(A, word2)
  await Bp.getByText(/It was “.+” · .+ got it/).waitFor({ timeout: 10000 })

  // Round 3: C should draw, but leaves; the host moves on and the game ends.
  await C.getByText('Round 3 of 3 · you draw').waitFor({ timeout: 15000 })
  await C.context().close()
  await A.locator('.qg-ticket').waitFor({ timeout: 30000 })
  await Bp.locator('.qg-ticket').waitFor({ timeout: 30000 })
  const ra = await A.locator('.sr-ranking').innerText(), rb = await Bp.locator('.sr-ranking').innerText()
  const pts = (t) => [...t.matchAll(/(\d+) pts/g)].map((m) => +m[1]).sort((x, y) => x - y).join(',')
  if (pts(ra) !== pts(rb)) throw new Error(`phones disagree: ${pts(ra)} vs ${pts(rb)}`)
  // C guessed round 1 (2) and A drew it (1); A guessed round 2 (2) and B drew it (1): A 3, B 1, C 2.
  if (pts(ra) !== '1,2,3') throw new Error('wrong scores: ' + ra)
  if (!/left/.test(ra)) throw new Error('C should show as left')
  for (const c of ctxs) await c.close().catch(() => {})
}
