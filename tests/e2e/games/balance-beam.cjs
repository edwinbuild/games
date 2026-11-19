// Reads the fixed weights from the beam's label, finds the fewest weights that level it, and places
// them: a wrong weight first (tips, can't lock in), taking it off, a refresh mid-try, and the keyboard.
const PEGS = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]
function solve(fixed) {
  const t0 = fixed.reduce((s, w) => s + w.mass * w.pos, 0)
  const free = PEGS.filter((p) => !fixed.some((w) => w.pos === p))
  for (let n = 1; n <= 4; n++) {
    const pick = []
    const rec = (start, t) => {
      if (pick.length === n) return t === 0 ? [...pick] : null
      for (let i = start; i < free.length; i++) for (const m of [1, 2, 3]) { pick.push({ pos: free[i], mass: m }); const r = rec(i + 1, t + m * free[i]); pick.pop(); if (r) return r }
      return null
    }
    const r = rec(0, t0)
    if (r) return r
  }
}
const name = (pos) => `${Math.abs(pos)} ${pos < 0 ? 'left' : 'right'}`
module.exports = async ({ page, B }) => {
  await page.goto(B + '/balance-beam/')
  const svg = page.locator('.bb-svg')
  await svg.waitFor()
  const label = await svg.getAttribute('aria-label')
  const fixed = [...label.split('Yours')[0].matchAll(/(\d) at (\d) (left|right)/g)].map((m) => ({ mass: +m[1], pos: (m[3] === 'left' ? -1 : 1) * +m[2] }))
  const sol = solve(fixed)
  const par = +(await page.getByText(/^Par \d/).innerText()).match(/Par (\d)/)[1]
  if (!sol || sol.length !== par) throw new Error(`solver found ${sol && sol.length}, page says par ${par}`)
  const lock = page.getByRole('button', { name: /lock in/i })
  const peg = (pos) => page.getByRole('button', { name: new RegExp(`^Peg ${name(pos)}:`) })
  const pick = (m) => page.getByRole('radio', { name: new RegExp(`^${m}`) })

  // A wrong weight on a free peg tips the beam; tapping it again takes it off.
  const freePeg = PEGS.find((p) => !fixed.some((w) => w.pos === p) && !sol.some((w) => w.pos === p))
  await pick(3).click()
  await peg(freePeg).click()
  if (!(await page.getByText(/side is heavier/).count()) || (await lock.isEnabled())) throw new Error('an unbalanced beam should not lock in')
  await peg(freePeg).click()
  if (!(await page.getByText('0 weights placed').count())) throw new Error('tapping again should take it off')

  // The solution: the first weight by tap, then a refresh, the rest by keyboard (arrows + number).
  await pick(sol[0].mass).click()
  await peg(sol[0].pos).click()
  await page.reload()
  await svg.waitFor()
  if (!(await page.getByText('1 weight placed').count())) throw new Error('placed weight lost on refresh')
  let cursor = 1
  await page.locator('body').click({ position: { x: 2, y: 2 } })
  for (const w of sol.slice(1)) {
    const steps = PEGS.indexOf(w.pos) - PEGS.indexOf(cursor)
    for (let i = 0; i < Math.abs(steps); i++) await page.keyboard.press(steps > 0 ? 'ArrowRight' : 'ArrowLeft')
    await page.keyboard.press(String(w.mass))
    cursor = w.pos
  }
  await page.getByText(/^Level!/).waitFor({ timeout: 3000 })
  // The beam settles level.
  await page.waitForFunction(() => Math.abs(+document.querySelector('.bb-svg').getAttribute('data-tilt')) < 0.05, null, { timeout: 5000 })
  await lock.click()
  await page.locator('.qg-ticket').waitFor()
  await page.waitForTimeout(1200)
  const t = await page.locator('.qg-ticket').innerText()
  if (!new RegExp(`Balanced with ${par} weights`).test(t) || !/on par/.test(t)) throw new Error('ticket wrong: ' + t)
}
