// Walks today's one answer (shown to the page in test mode only): the first squares by dragging
// with the mouse, the rest with the arrow keys; dragging back undoes a step, tapping a square on
// the path cuts it back, a refresh keeps the path and the clock; the solved garden is timed.
module.exports = async ({ page, B }) => {
  await page.context().addInitScript(() => localStorage.setItem('qg:test-solutions', 'true'))
  await page.goto(B + '/garden-path/')
  const grid = page.locator('.gp-grid')
  await grid.waitFor()
  const sol = JSON.parse(await grid.getAttribute('data-solution'))
  const [w, h] = (await page.getByText(/^\d×\d garden/).innerText()).match(/(\d)×(\d)/).slice(1).map(Number)
  const path = async () => JSON.parse(await grid.getAttribute('data-path'))
  const center = async (c) => { const b = await grid.boundingBox(); return [b.x + ((c % w) + 0.5) * (b.width / w), b.y + (Math.floor(c / w) + 0.5) * (b.height / h)] }

  // Drag through the first four squares of the answer, then back one (undo), then on again.
  let [x, y] = await center(sol[0])
  await page.mouse.move(x, y); await page.mouse.down()
  for (const c of sol.slice(1, 4)) { [x, y] = await center(c); await page.mouse.move(x, y, { steps: 3 }) }
  ;[x, y] = await center(sol[2]); await page.mouse.move(x, y, { steps: 3 })
  await page.mouse.up()
  if ((await path()).length !== 3) throw new Error('dragging back should undo a step: ' + (await path()))
  // Tap the first square on the path: cut back to it.
  ;[x, y] = await center(sol[1]); await page.mouse.click(x, y)
  if ((await path()).length !== 2) throw new Error('tapping a square on the path should cut back to it')

  // The rest with the arrow keys, with a refresh halfway.
  const key = (a, b) => (b === a + 1 ? 'ArrowRight' : b === a - 1 ? 'ArrowLeft' : b === a + w ? 'ArrowDown' : 'ArrowUp')
  await page.locator('body').click({ position: { x: 2, y: 2 } })
  for (let i = 2; i < sol.length; i++) {
    await page.keyboard.press(key(sol[i - 1], sol[i]))
    if (i === Math.floor(sol.length / 2)) {
      await page.reload(); await grid.waitFor()
      if ((await path()).length !== i + 1) throw new Error('a refresh lost the path')
      await page.locator('body').click({ position: { x: 2, y: 2 } })
    }
  }
  await page.getByRole('button', { name: /See my result/ }).click()
  await page.locator('.qg-ticket').waitFor()
  await page.waitForTimeout(1200)
  if (!/Path found in \d+:\d\d/.test(await page.locator('.qg-ticket').innerText())) throw new Error('ticket wrong')
}
