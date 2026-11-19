// Finds today's exact recipe by search (the same paint maths as src/games/paint-mix/mix.ts) and mixes
// it for a 100% match; a wrong mix scores lower; keyboard, Undo, Empty and a refresh mid-mix.
const REFLECT = [[0.8, 0.055, 0.07], [0.92, 0.75, 0.05], [0.035, 0.16, 0.7], [0.92, 0.92, 0.92], [0.03, 0.03, 0.035]]
const toSrgb = (c) => Math.round(Math.max(0, Math.min(1, c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)) * 255)
const mix = (d) => { const n = d.reduce((a, b) => a + b, 0); return [0, 1, 2].map((ch) => toSrgb(Math.exp(d.reduce((s, k, i) => s + k * Math.log(REFLECT[i][ch]), 0) / n))) }
function recipeFor(rgb) {
  const want = rgb.join()
  const d = [0, 0, 0, 0, 0]
  const rec = (i, left) => {
    if (i === 5) return d.some(Boolean) && mix(d).join() === want ? [...d] : null
    for (let k = 0; k <= left; k++) { d[i] = k; const r = rec(i + 1, left - k); if (r) return r }
    d[i] = 0; return null
  }
  return rec(0, 8)
}
module.exports = async ({ page, B }) => {
  await page.goto(B + '/paint-mix/')
  const pots = page.locator('.pm-pot')
  await pots.first().waitFor()
  const target = (await page.locator('.pm-disc[aria-label="Today’s colour"]').evaluate((el) => getComputedStyle(el).backgroundColor)).match(/\d+/g).slice(0, 3).map(Number)
  const recipe = recipeFor(target)
  if (!recipe) throw new Error('no recipe of up to 8 drops makes today’s colour ' + target)

  // A first try with plain red: a poor match.
  await pots.nth(0).click()
  await page.getByRole('button', { name: 'Lock in my mix' }).click()
  const first = +(await page.locator('.pm-verdict .score').innerText()).replace('%', '')
  if (first >= 95) throw new Error('plain red should not match: ' + first)
  await page.getByRole('button', { name: 'See my result' }).click()
  await page.locator('.qg-ticket').waitFor()

  // Second try: keyboard, Undo and Empty, then a refresh mid-mix keeps the drops.
  await page.getByRole('button', { name: 'Try again' }).click()
  await pots.first().waitFor()
  await page.locator('body').click({ position: { x: 2, y: 2 } })
  await page.keyboard.press('3'); await page.keyboard.press('3')
  await page.keyboard.press('Backspace')
  if (!(await page.getByText('1 drop · up to 12').count())) throw new Error('keyboard drop + undo not counted')
  await page.getByRole('button', { name: 'Empty the bowl' }).click()
  if (!(await page.getByText('0 drops · up to 12').count())) throw new Error('empty did not empty')
  let first = true
  for (let i = 0; i < 5; i++) for (let k = 0; k < recipe[i]; k++) {
    await pots.nth(i).click()
    if (first) { first = false; await page.reload(); await pots.first().waitFor() }
  }
  const n = recipe.reduce((a, b) => a + b, 0)
  if (!(await page.getByText(`${n} drop${n === 1 ? '' : 's'} · up to 12`).count())) throw new Error('drops lost on refresh')
  await page.waitForTimeout(1000) // the swirl settles
  const bowl = (await page.locator('.pm-bowl').getAttribute('data-rgb')).split(',').map(Number)
  if (bowl.join() !== target.join()) throw new Error(`mixed ${bowl} for ${target}`)
  await page.getByRole('button', { name: 'Lock in my mix' }).click()
  if ((await page.locator('.pm-verdict .score').innerText()) !== '100%') throw new Error('exact recipe should be 100%')
  await page.getByRole('button', { name: 'See my result' }).click()
  await page.locator('.qg-ticket').waitFor()
  await page.waitForTimeout(1200)
  const t = await page.locator('.qg-ticket').innerText()
  if (!/100% match/.test(t) || !/best of 2 tries/i.test(t)) throw new Error('ticket wrong: ' + t)
}
