// Swipes by pointer (a miss is ignored, the square cut through its centre is perfect), then a full try by keyboard.
module.exports = async ({ page, B }) => {
  await page.goto(B + '/fair-slice/')
  const stage = page.locator('.fs-stage')
  await stage.waitFor()
  await page.waitForTimeout(300)
  const box = await stage.boundingBox()
  const swipe = async (x1, y1, x2, y2) => {
    await page.mouse.move(box.x + box.width * x1, box.y + box.height * y1)
    await page.mouse.down()
    for (let i = 1; i <= 6; i++) await page.mouse.move(box.x + box.width * (x1 + ((x2 - x1) * i) / 6), box.y + box.height * (y1 + ((y2 - y1) * i) / 6))
    await page.mouse.up()
  }
  // A swipe above the shape does nothing.
  await swipe(0.05, 0.03, 0.95, 0.03)
  await page.waitForTimeout(200)
  if (!(await page.getByText('Shape 1 of 5').count())) throw new Error('a missed swipe counted')
  // Any cut through the centre of the square is fair.
  await swipe(0.05, 0.5, 0.95, 0.5)
  await page.getByText(/^Perfect! 50\.0% \/ 50\.0%$/).waitFor({ timeout: 3000 })
  // The rest by keyboard.
  await page.getByText('Shape 2 of 5').waitFor({ timeout: 5000 })
  for (let s = 2; s <= 5; s++) {
    await page.locator('body').click({ position: { x: 2, y: 2 } })
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Shift+ArrowDown')
    await page.keyboard.press('Space')
    await page.getByText(/% off$|^Perfect!/).first().waitFor({ timeout: 3000 })
    if (s < 5) await page.getByText(`Shape ${s + 1} of 5`).waitFor({ timeout: 5000 })
  }
  await page.locator('.qg-ticket').waitFor({ timeout: 5000 })
  const t = await page.locator('.qg-ticket').innerText()
  if (!/% off/.test(t) || !/best of 1 try/i.test(t)) throw new Error('ticket wrong: ' + t)
}
