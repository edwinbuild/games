// Tidies the whole tray: one deliberate wrong-slot drop, drags by touch-like pointer, the last thing by keyboard.
module.exports = async ({ page, B }) => {
  await page.goto(B + '/tidy-up/')
  await page.locator('.tu-item').first().waitFor()
  await page.waitForTimeout(300)
  const kinds = await page.locator('.tu-item').evaluateAll((els) => els.map((e) => e.dataset.kind))
  const centre = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } }
  const turnTo = async (kind) => {
    const item = page.locator(`.tu-item[data-kind="${kind}"]`)
    const want = +(await page.locator(`.tu-slot[data-kind="${kind}"]`).getAttribute('data-turns'))
    for (let i = 0; i < 4 && +(await item.getAttribute('data-turns')) !== want; i++) {
      const p = await grabPoint(kind)
      await page.mouse.click(p.x, p.y)
      await page.waitForTimeout(60)
    }
  }
  // Things in the mess can overlap: grab a point where this thing is the one on top.
  const grabPoint = (kind) => page.evaluate((kind) => {
    const el = document.querySelector(`.tu-item[data-kind="${kind}"]`)
    const r = el.getBoundingClientRect()
    for (const fy of [0.5, 0.35, 0.65, 0.2, 0.8]) for (const fx of [0.5, 0.35, 0.65, 0.2, 0.8]) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy
      if (document.elementFromPoint(x, y)?.closest('.tu-item') === el) return { x, y }
    }
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, kind)
  const dragTo = async (kind, slotKind) => {
    const from = await grabPoint(kind)
    const to = await centre(page.locator(`.tu-slot[data-kind="${slotKind}"]`))
    await page.mouse.move(from.x, from.y); await page.mouse.down()
    for (let i = 1; i <= 5; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / 5, from.y + ((to.y - from.y) * i) / 5)
    await page.mouse.up()
    await page.waitForTimeout(320)
  }
  // Wrong slot: sent back, counted.
  await dragTo(kinds[0], kinds[1])
  if (await page.locator('.tu-item.is-placed').count()) throw new Error('a wrong slot accepted a thing')
  // Everything but the last by pointer.
  for (const k of kinds.slice(0, -1)) {
    await turnTo(k)
    await dragTo(k, k)
    if (!(await page.locator(`.tu-item[data-kind="${k}"].is-placed`).count())) throw new Error(k + ' did not snap')
  }
  // The last one by keyboard: R to turn, arrows to move, Enter to drop.
  const last = kinds[kinds.length - 1]
  const item = page.locator(`.tu-item[data-kind="${last}"]`)
  await item.focus()
  const want = +(await page.locator(`.tu-slot[data-kind="${last}"]`).getAttribute('data-turns'))
  for (let i = 0; i < 4 && +(await item.getAttribute('data-turns')) !== want; i++) await page.keyboard.press('r')
  const board = await page.locator('.tu-board').boundingBox()
  const k = 320 / board.width
  const a = await centre(item), b = await centre(page.locator(`.tu-slot[data-kind="${last}"]`))
  const dx = Math.round(((b.x - a.x) * k) / 8), dy = Math.round(((b.y - a.y) * k) / 8)
  for (let i = 0; i < Math.abs(dx); i++) await page.keyboard.press(dx > 0 ? 'ArrowRight' : 'ArrowLeft')
  for (let i = 0; i < Math.abs(dy); i++) await page.keyboard.press(dy > 0 ? 'ArrowDown' : 'ArrowUp')
  await page.keyboard.press('Enter')
  await page.locator('.qg-ticket').waitFor({ timeout: 5000 })
  const t = await page.locator('.qg-ticket').innerText()
  if (!/12 things tidied · 1 wrong slot \(\+2s\)/.test(t)) throw new Error('ticket wrong: ' + t)
}
