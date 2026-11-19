// Real Supabase Realtime: two players in a fresh room, plus a third who must be turned away.
module.exports = async ({ page, B, browser, scheme }) => {
  if (scheme === 'dark') return // one full online run is enough per suite
  const A = page
  await A.goto(B + '/reaction-online/')
  await A.getByRole('button', { name: 'Create a room' }).click()
  await A.waitForURL(/room=/)
  const code = new URL(A.url()).searchParams.get('room')
  await A.locator('.qg-room-code').waitFor({ timeout: 15000 })
  const ctxB = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true })
  const Bp = await ctxB.newPage()
  await Bp.goto(`${B}/reaction-online/?room=${code}`)
  await A.getByText('Waiting for both to be ready').waitFor({ timeout: 20000 })
  await A.getByRole('button', { name: 'Ready', exact: true }).click()
  await Bp.getByRole('button', { name: 'Ready', exact: true }).click()
  // Regression: a refresh in the lobby keeps Ready (it used to fall back to Not ready).
  await Bp.reload()
  await Bp.getByRole('button', { name: 'Not ready', exact: true }).waitFor({ timeout: 20000 })
  await A.getByRole('button', { name: 'Start the duel' }).waitFor({ timeout: 20000 })
  await A.getByRole('button', { name: 'Start the duel' }).click({ timeout: 15000 })

  // A third player arriving mid-match is turned away.
  const ctxC = await browser.newContext({ viewport: { width: 412, height: 915 } })
  const C = await ctxC.newPage()
  await C.goto(`${B}/reaction-online/?room=${code}`)
  await C.getByText(/already (started|has two players)/).waitFor({ timeout: 20000 })
  await ctxC.close()

  for (let r = 0; r < 3; r++) {
    await A.getByText('TAP!').waitFor({ timeout: 10000 })
    await A.waitForTimeout(120)
    await A.locator('.qg-stage[role=button]').dispatchEvent('pointerdown')
    await Bp.getByText('TAP!').waitFor({ timeout: 10000 })
    await Bp.waitForTimeout(400)
    await Bp.locator('.qg-stage[role=button]').dispatchEvent('pointerdown')
  }
  await A.locator('.qg-ticket').waitFor({ timeout: 15000 })
  await Bp.locator('.qg-ticket').waitFor({ timeout: 15000 })
  const a = await A.locator('.qg-ticket-headline').getAttribute('aria-label') || await A.locator('.qg-ticket-headline').innerText()
  const b = await Bp.locator('.qg-ticket-headline').innerText()
  if (!/You beat .* 3–0/.test(await A.locator('.qg-ticket').innerText())) throw new Error('A should have won 3–0: ' + a)
  if (!/won 3–0/.test(b)) throw new Error('B should see a 3–0 loss: ' + b)

  // Rematch, then B leaves: A is told the match ended.
  await A.getByRole('button', { name: 'Rematch' }).click()
  await Bp.getByRole('button', { name: 'Rematch' }).click()
  await A.getByRole('button', { name: 'Start the duel' }).click({ timeout: 15000 })
  await A.getByText(/Wait…|TAP!/).first().waitFor()
  await ctxB.close()
  await A.getByText(/left the match/).waitFor({ timeout: 30000 })
}
