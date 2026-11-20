// Draws the solver's path (shown in test mode only) with the mouse, after a wrong turn to the end:
// the total counts, a wrong total at the end says so, tapping back cuts the path, a refresh keeps
// it, the keyboard steps, and the solver's path lands on par.
module.exports = async ({ page, B }) => {
  await page.context().addInitScript(() => localStorage.setItem('qg:test-solutions', 'true'))
  await page.goto(B + '/sum-path/')
  const grid = page.locator('.sp-grid')
  await grid.waitFor()
  const sol = JSON.parse(await grid.getAttribute('data-solution'))
  const path = async () => JSON.parse(await grid.getAttribute('data-path'))
  const n = Math.round(Math.sqrt(await page.locator('.sp-cell').count()))
  const box = await grid.boundingBox()
  const at = (c) => [box.x + ((c % n) + 0.5) * (box.width / n), box.y + (Math.floor(c / n) + 0.5) * (box.height / n)]
  const target = +(await page.locator('.sp-of').innerText()).match(/\d+/)[0]

  // The straight way along the top and down the side: usually the wrong total.
  const straight = [...Array(n).keys(), ...Array.from({ length: n - 1 }, (_, i) => (i + 2) * n - 1)]
  await page.mouse.move(...at(0)); await page.mouse.down()
  for (const c of straight.slice(1)) await page.mouse.move(...at(c), { steps: 3 })
  await page.mouse.up()
  if ((await path()).length !== straight.length) throw new Error('drawing should follow the mouse')
  const sum = +(await page.locator('.sp-sum').innerText())
  if (sum !== target) await page.getByText(`That adds up to ${sum}, not ${target}.`).waitFor()

  // Tap the start to cut back, then the solution by mouse up to halfway, then refresh, then keys.
  await page.mouse.click(...at(0))
  if ((await path()).length !== 1) throw new Error('tapping the start should cut the path back')
  const half = Math.floor(sol.length / 2)
  await page.mouse.move(...at(0)); await page.mouse.down()
  for (const c of sol.slice(1, half)) await page.mouse.move(...at(c), { steps: 3 })
  await page.mouse.up()
  await page.reload()
  await grid.waitFor()
  if ((await path()).length !== half) throw new Error('a refresh should keep the path')
  for (let i = half; i < sol.length; i++) {
    const a = sol[i - 1], b = sol[i]
    await page.keyboard.press(b === a + 1 ? 'ArrowRight' : b === a - 1 ? 'ArrowLeft' : b > a ? 'ArrowDown' : 'ArrowUp')
  }
  await page.getByRole('button', { name: /See my result/ }).click()
  await page.getByText(new RegExp(`${target} in ${sol.length} squares`)).waitFor()
  await page.getByText(/on par/).waitFor()
}
