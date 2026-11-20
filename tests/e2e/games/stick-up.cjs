// Stick Up: a tap starts it, the stick falls in a few seconds if nobody moves the ball, the ticket
// shows the time; the arrow keys and the mouse move the ball.
module.exports = async ({ page, B }) => {
  await page.goto(B + '/stick-up/')
  const stage = page.locator('.su-stage'), svg = page.locator('.su-svg')
  await page.getByText('Touch the ball to start').waitFor()
  const x = async () => +(await svg.getAttribute('data-x'))
  const th = async () => +(await svg.getAttribute('data-theta'))

  // Untouched, it leans further and falls.
  const box = await stage.boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 30)
  await page.waitForTimeout(400)
  if (Math.abs(await th()) < 0.03) throw new Error('the stick should start leaning')
  await page.locator('.qg-ticket').waitFor({ timeout: 8000 })
  const head = await page.locator('.qg-ticket').innerText()
  if (!/Up for \d+\.\d s/.test(head)) throw new Error('ticket: ' + head.slice(0, 80))

  // Play again: the arrow keys start it and move the ball right.
  await page.getByRole('button', { name: 'Play again' }).click()
  await page.getByText('Touch the ball to start').waitFor()
  const x0 = await x()
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(350); await page.keyboard.up('ArrowRight')
  if (!((await x()) > x0 + 30)) throw new Error('the right arrow should move the ball right')
  // The mouse moves it too.
  const b2 = await stage.boundingBox()
  await page.mouse.move(b2.x + b2.width * 0.2, b2.y + b2.height / 2, { steps: 4 })
  await page.waitForTimeout(250)
  if (!((await x()) < 360 * 0.45)) throw new Error('the ball should follow the mouse left')
  await page.locator('.qg-ticket').waitFor({ timeout: 15000 })
}
