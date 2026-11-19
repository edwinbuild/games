// Copies each shape exactly with the mouse (high match), then a lazy straight line on a second try.
module.exports = async ({ page, B }) => {
  await page.goto(B + '/shape-recall/')
  const cv = page.locator('.sr2-canvas')
  await cv.waitFor()
  const drawIt = async (pts) => {
    await cv.scrollIntoViewIfNeeded()
    const box = await cv.boundingBox()
    const at = ([x, y]) => [box.x + (x / 300) * box.width, box.y + (y / 300) * box.height]
    await page.mouse.move(...at(pts[0])); await page.mouse.down()
    for (const p of pts.slice(1)) await page.mouse.move(...at(p), { steps: 2 })
    await page.mouse.up()
  }
  const scores = []
  for (let k = 0; k < 3; k++) {
    await page.getByRole('button', { name: k === 0 ? 'Show the first shape' : /Next shape/ }).click()
    await page.waitForSelector('.sr2-canvas[data-shape]')
    const shape = JSON.parse(await cv.getAttribute('data-shape'))
    await page.waitForSelector('.sr2-canvas:not([data-shape])', { timeout: 4000 })
    await drawIt(shape)
    scores.push(+(await page.locator('.sr2-score').innerText()).replace('%', ''))
  }
  if (scores.some((s) => s < 90)) throw new Error('exact copies should match closely: ' + scores)
  await page.getByRole('button', { name: 'See my result' }).click()
  await page.locator('.qg-ticket').waitFor()
  await page.getByRole('button', { name: 'Try again' }).click()
  for (let k = 0; k < 3; k++) {
    await page.getByRole('button', { name: k === 0 ? 'Show the first shape' : /Next shape/ }).click()
    await page.waitForSelector('.sr2-canvas[data-shape]', { timeout: 5000 })
    await page.waitForSelector('.sr2-canvas:not([data-shape])', { timeout: 4000 })
    await page.waitForTimeout(100)
    await drawIt([[40, 150], [260, 150]])
    const s = +(await page.locator('.sr2-score').innerText()).replace('%', '')
    if (s >= 90) throw new Error('a straight line should not match well: ' + s)
  }
  await page.getByRole('button', { name: 'See my result' }).click()
  const t = await page.locator('.qg-ticket').innerText()
  if (!/best of 2 tries/i.test(t)) throw new Error('tries not counted: ' + t)
}
