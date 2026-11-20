// Tilts the day's board along the solver's way (shown in test mode only): keys, a swipe and the
// buttons all tilt, undo goes back, a refresh keeps the board, and the solver's way lands on par.
module.exports = async ({ page, B }) => {
  await page.context().addInitScript(() => localStorage.setItem('qg:test-solutions', 'true'))
  await page.goto(B + '/tilt/')
  const board = page.locator('.tl-board')
  await board.waitFor()
  const way = (await board.getAttribute('data-solution')).split(' ')
  const state = async () => board.getAttribute('data-state')
  const start = await state()
  const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }
  const settle = () => page.waitForTimeout(700)

  // A tilt that moves nothing isn't counted; find one that moves something, then undo it.
  for (const d of ['up', 'down', 'left', 'right']) {
    await page.keyboard.press(KEY[d]); await settle()
    if ((await state()) !== start) break
  }
  if (!(await page.getByText(/^1 tilt ·/).count())) throw new Error('a tilt should count')
  await page.getByRole('button', { name: /^Undo/ }).click()
  if ((await state()) !== start) throw new Error('undo should go back to the start')
  await page.getByText(/^0 tilts ·/).waitFor()

  // The way: first tilt by swipe, second by button, the rest by keys; a refresh halfway keeps it.
  const box = await board.boundingBox()
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2
  const vec = { up: [0, -80], down: [0, 80], left: [-80, 0], right: [80, 0] }[way[0]]
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + vec[0], cy + vec[1], { steps: 5 }); await page.mouse.up()
  await settle()
  if (way.length > 1) { await page.getByRole('button', { name: `Tilt ${way[1]}` }).click(); await settle() }
  const half = await state()
  await page.reload()
  await board.waitFor()
  if ((await state()) !== half) throw new Error('a refresh should keep the board')
  for (const d of way.slice(2)) { await page.keyboard.press(KEY[d]); await settle() }
  await page.getByRole('button', { name: /See my result/ }).click()
  await page.getByText(new RegExp(`All in with ${way.length} tilts?`)).waitFor()
  await page.getByText(/on par/).waitFor()
}
