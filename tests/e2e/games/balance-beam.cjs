// Reads the beams from the page, finds the fewest weights that level them (the same rules as
// src/games/balance-beam/beam.ts) and places them: the tray's two-of-each limit, a wrong weight
// and taking it off, a refresh mid-try, the keyboard. Today, and a Monday (one beam) via a challenge link.
const { challengeLink } = require('../helpers.cjs')
const PEGS = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5], LOW = [-3, -2, -1, 1, 2, 3]
const torques = (ws, hang) => {
  const low = ws.filter((w) => w.beam === 'low')
  return { top: ws.filter((w) => w.beam === 'top').reduce((s, w) => s + w.mass * w.pos, 0) + (hang == null ? 0 : hang * low.reduce((s, w) => s + w.mass, 0)), low: low.reduce((s, w) => s + w.mass * w.pos, 0) }
}
const slotsFor = (fixed, hang) => [
  ...PEGS.filter((x) => x !== hang && !fixed.some((w) => w.beam === 'top' && w.pos === x)).map((pos) => ({ beam: 'top', pos })),
  ...(hang == null ? [] : LOW.filter((x) => !fixed.some((w) => w.beam === 'low' && w.pos === x)).map((pos) => ({ beam: 'low', pos }))),
]
function solve(fixed, hang) {
  const slots = slotsFor(fixed, hang), left = [2, 2, 2, 2, 2], pick = []
  for (let n = 1; n <= 4; n++) {
    const rec = (start) => {
      if (pick.length === n) { const t = torques([...fixed, ...pick], hang); return t.top === 0 && t.low === 0 ? [...pick] : null }
      for (let i = start; i < slots.length; i++) for (let m = 1; m <= 5; m++) {
        if (!left[m - 1]) continue
        left[m - 1]--; pick.push({ ...slots[i], mass: m }); const r = rec(i + 1); pick.pop(); left[m - 1]++
        if (r) return r
      }
      return null
    }
    const r = rec(0)
    if (r) return r
  }
}
const side = (pos) => `${Math.abs(pos)} ${pos < 0 ? 'left' : 'right'}`
const name = (s) => new RegExp(`^${s.beam === 'low' ? 'Lower beam, peg' : 'Peg'} ${side(s.pos)}:`)

async function play(page, { keyboard }) {
  const svg = page.locator('.bb-svg')
  await svg.waitFor()
  const fixed = JSON.parse(await svg.getAttribute('data-fixed'))
  const hangRaw = await svg.getAttribute('data-hang')
  const hang = hangRaw === '' ? null : +hangRaw
  const sol = solve(fixed, hang)
  const par = +(await page.getByText(/^Par \d/).innerText()).match(/Par (\d)/)[1]
  if (!sol || sol.length !== par) throw new Error(`solver found ${sol && sol.length}, page says par ${par}`)
  const lock = page.getByRole('button', { name: /lock in/i })
  const peg = (s) => page.getByRole('button', { name: name(s) })
  const pick = (m) => page.getByRole('radio', { name: new RegExp(`^${m},`) })
  const slots = slotsFor(fixed, hang)
  const spare = slots.filter((s) => !sol.some((w) => w.beam === s.beam && w.pos === s.pos))

  // Two of each size: a third 1 is refused; tapping a weight again takes it off.
  await pick(1).click()
  for (const s of spare.slice(0, 3)) await peg(s).click()
  if (!(await page.getByText('2 weights placed').count())) throw new Error('a third weight of one size should be refused')
  if (!(await lock.isDisabled())) throw new Error('an unbalanced beam must not lock in')
  for (const s of spare.slice(0, 2)) await peg(s).click()
  if (!(await page.getByText('0 weights placed').count())) throw new Error('tapping again should take weights off')

  // The solution: the first by tap, then a refresh, the rest by tap or keyboard.
  await pick(sol[0].mass).click()
  await peg(sol[0]).click()
  await page.reload()
  await svg.waitFor()
  if (!(await page.getByText('1 weight placed').count())) throw new Error('placed weight lost on refresh')
  let cursor = 0 // after a reload the cursor starts on the first free peg
  if (keyboard) await page.locator('body').click({ position: { x: 2, y: 2 } })
  for (const w of sol.slice(1)) {
    if (keyboard) {
      const to = slots.findIndex((s) => s.beam === w.beam && s.pos === w.pos)
      for (let i = 0; i < Math.abs(to - cursor); i++) await page.keyboard.press(to > cursor ? 'ArrowRight' : 'ArrowLeft')
      await page.keyboard.press(String(w.mass))
      cursor = to
    } else {
      await pick(w.mass).click()
      await peg(w).click()
    }
  }
  await page.getByText(/^Level!/).waitFor({ timeout: 3000 })
  await page.waitForFunction(() => +document.querySelector('.bb-svg').getAttribute('data-tilt') < 0.05, null, { timeout: 6000 })
  await lock.click()
  await page.locator('.qg-ticket').waitFor()
  await page.waitForTimeout(1200)
  const t = await page.locator('.qg-ticket').innerText()
  if (!new RegExp(`Balanced with ${par} weights`).test(t) || !/on par/.test(t)) throw new Error('ticket wrong: ' + t)
  return hang
}

module.exports = async ({ page, B }) => {
  await page.goto(B + '/balance-beam/')
  await play(page, { keyboard: true })
  // A Monday's puzzle (one beam) through a challenge link.
  await page.goto(challengeLink(B, 'balance-beam', '2026-11-16'))
  const hang = await play(page, { keyboard: false })
  if (hang != null) throw new Error('Mondays have one beam')
}
