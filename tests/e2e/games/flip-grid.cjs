// Solves today's grid by chasing lights: every solution is fixed by its first-row taps.
const N = 5
const flip = (g, i) => { const r = Math.floor(i / N), c = i % N; for (const [dr, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N) g[rr * N + cc] = !g[rr * N + cc] } return g }
function solve(start) {
  let best = null
  for (let m = 0; m < 32; m++) {
    const g = [...start], taps = []
    for (let c = 0; c < N; c++) if ((m >> c) & 1) { flip(g, c); taps.push(c) }
    for (let r = 1; r < N; r++) for (let c = 0; c < N; c++) if (g[(r - 1) * N + c]) { flip(g, r * N + c); taps.push(r * N + c) }
    if (g.every((x) => !x) && (!best || taps.length < best.length)) best = taps
  }
  return best
}
module.exports = async ({ page, B }) => {
  await page.goto(B + '/flip-grid/')
  const tiles = page.locator('.fg-grid .fg-tile')
  await tiles.first().waitFor()
  const read = async () => (await tiles.evaluateAll((els) => els.map((e) => e.classList.contains('is-dark'))))
  const start = await read()
  const sol = solve(start)
  const par = +(await page.locator('.qg-score', { hasText: 'Par' }).locator('.qg-score-value').innerText())
  if (sol.length !== par) throw new Error(`par ${par} but shortest is ${sol.length}`)
  // Undo restores the grid, by button and by key.
  await tiles.nth(0).click()
  await page.getByRole('button', { name: /Undo/ }).click()
  await tiles.nth(6).click()
  await page.keyboard.press('z')
  if (JSON.stringify(await read()) !== JSON.stringify(start)) throw new Error('undo did not restore the grid')
  // Try 1: one wasted pair of taps, then the solution, played by keyboard for the first move.
  await tiles.nth(24).click(); await tiles.nth(24).click()
  for (const i of sol) await tiles.nth(i).click()
  await page.locator('.qg-ticket').waitFor()
  if (!/Par \d+, 2 over par/.test(await page.locator('.qg-ticket').innerText())) throw new Error('first try not scored')
  // Try 2: the solution with the keyboard: move the cursor with arrows, flip with Space.
  await page.getByRole('button', { name: 'Try again' }).click()
  await tiles.first().waitFor()
  await page.locator('body').click({ position: { x: 2, y: 2 } })
  let at = 12
  for (const i of sol) {
    const dr = Math.floor(i / N) - Math.floor(at / N), dc = (i % N) - (at % N)
    for (let k = 0; k < Math.abs(dr); k++) await page.keyboard.press(dr > 0 ? 'ArrowDown' : 'ArrowUp')
    for (let k = 0; k < Math.abs(dc); k++) await page.keyboard.press(dc > 0 ? 'ArrowRight' : 'ArrowLeft')
    await page.keyboard.press('Space')
    at = i
  }
  await page.locator('.qg-ticket').waitFor()
  const t = await page.locator('.qg-ticket').innerText()
  if (!/on par/.test(t) || !/best of 2 tries/i.test(t)) throw new Error('second try not scored: ' + t)
}
