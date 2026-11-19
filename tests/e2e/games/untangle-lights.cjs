// Drags every light to the untangled layout the puzzle was built from (the page shows it in test
// mode only), with the real mouse: a tiny wobble isn't a move, a refresh keeps the lights and the
// moves, the keyboard moves a light, and untangling all of them lands on par.
module.exports = async ({ page, B }) => {
  await page.context().addInitScript(() => localStorage.setItem('qg:test-solutions', 'true'))
  await page.goto(B + '/untangle-lights/')
  const svg = page.locator('.ul-svg')
  await svg.waitFor()
  const solution = JSON.parse(await svg.getAttribute('data-solution'))
  const n = solution.length
  const now = async () => JSON.parse(await svg.getAttribute('data-start'))
  const moves = async () => +(await page.getByText(/^\d+ moves? ·/).innerText()).match(/^(\d+)/)[1]
  if (+(await svg.getAttribute('data-crossings')) < n) throw new Error('the day should start tangled')
  const screen = async ([x, y]) => { const b = await svg.boundingBox(); return [b.x + (x / 320) * b.width, b.y + (y / 320) * b.height] }
  const dragTo = async (i, to) => {
    const [fx, fy] = await screen((await now())[i]), [tx, ty] = await screen(to)
    await page.mouse.move(fx, fy); await page.mouse.down()
    await page.mouse.move((fx + tx) / 2, (fy + ty) / 2, { steps: 4 }); await page.mouse.move(tx, ty, { steps: 4 })
    await page.mouse.up()
  }

  // A wobble of a pixel or two is not a move.
  const [wx, wy] = await screen((await now())[0])
  await page.mouse.move(wx, wy); await page.mouse.down(); await page.mouse.move(wx + 1, wy); await page.mouse.up()
  if ((await moves()) !== 0) throw new Error('a wobble should not count')

  // Light 0 by keyboard: Tab to it, arrows, then leave it: one move.
  await page.locator('.ul-hit').first().focus()
  for (let k = 0; k < 3; k++) await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  if ((await moves()) !== 1) throw new Error('a keyboard move should count once')

  // The rest by mouse, with a refresh halfway. A light covered by another is moved later.
  const todo = Array.from({ length: n }, (_, i) => i)
  let refreshed = false
  for (let guard = 0; todo.length && guard < n * 3; guard++) {
    const pos = await now()
    const k = todo.findIndex((i) => !pos.some((p, j) => j > i && Math.hypot(p[0] - pos[i][0], p[1] - pos[i][1]) < 24))
    const i = todo.splice(k === -1 ? 0 : k, 1)[0]
    await dragTo(i, solution[i])
    if (!refreshed && todo.length === Math.floor(n / 2)) {
      refreshed = true
      const before = [await moves(), JSON.stringify(await now())]
      await page.reload()
      await svg.waitFor()
      if ((await moves()) !== before[0] || JSON.stringify(await now()) !== before[1]) throw new Error('a refresh lost the lights or the moves')
    }
  }
  await page.getByRole('button', { name: /See my result/ }).waitFor({ timeout: 5000 })
  if (+(await svg.getAttribute('data-crossings')) !== 0) throw new Error('should be untangled')
  const total = await moves()
  if (total !== n + 1) throw new Error(`expected ${n + 1} moves (the keyboard nudge plus one per light), got ${total}`)
  await page.getByRole('button', { name: /See my result/ }).click()
  await page.locator('.qg-ticket').waitFor()
  await page.waitForTimeout(1200)
  const t = await page.locator('.qg-ticket').innerText()
  if (!new RegExp(`Untangled in ${n + 1} moves`).test(t) || !new RegExp(`par ${n}`).test(t)) throw new Error('ticket wrong: ' + t)
}
