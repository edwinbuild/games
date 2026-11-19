// Traces the channel with the mouse: once all the way, once veering off halfway.
module.exports = async ({ page, B }) => {
  await page.goto(B + '/steady-line/')
  const cv = page.locator('.sl-canvas')
  await cv.waitFor()
  await page.waitForTimeout(300)
  const trace = async (veer) => {
    const path = JSON.parse(await cv.getAttribute('data-path'))
    await cv.scrollIntoViewIfNeeded()
    const box = await cv.boundingBox()
    const at = ([x, y]) => [box.x + (x / 300) * box.width, box.y + (y / 420) * box.height]
    const [sx, sy] = at(path[0])
    await page.mouse.move(sx, sy)
    await page.mouse.down()
    for (let i = 1; i < path.length; i++) {
      const [x, y] = at(path[i])
      if (veer && i === Math.floor(path.length / 2)) { await page.mouse.move(x + box.width * 0.3, y, { steps: 6 }); break }
      await page.mouse.move(x, y, { steps: 2 })
    }
    await page.mouse.up()
  }
  await trace(false)
  await page.getByText(/^All the way in \d+\.\ds!$/).waitFor({ timeout: 5000 })
  await page.locator('.qg-ticket').waitFor({ timeout: 5000 })
  await page.getByRole('button', { name: 'Try again' }).click()
  await cv.waitFor()
  await page.waitForTimeout(300)
  await trace(true)
  await page.getByText(/^Touched the edge at \d+%$/).waitFor({ timeout: 5000 })
  await page.locator('.qg-ticket').waitFor({ timeout: 5000 })
  if (!/best of 2 tries/i.test(await page.locator('.qg-ticket').innerText())) throw new Error('tries not counted')
  await page.locator('.qg-ticket').getByText(/^All the way in/).waitFor({ timeout: 5000 })
}
