// Five colours a day from one tube of paint. Finds each colour's exact recipe by search (the same
// paint maths as src/games/paint-mix/mix.ts) and checks: exact = 100% and a star, a wrong mix
// scores lower, paint can't be taken out, the tube counts down, refreshes mid-colour and on the
// last reveal keep everything, and a new try brings five new colours.
const REFLECT = [[0.8, 0.055, 0.07], [0.92, 0.75, 0.05], [0.035, 0.16, 0.7], [0.92, 0.92, 0.92], [0.03, 0.03, 0.035]]
const toSrgb = (c) => Math.round(Math.max(0, Math.min(1, c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)) * 255)
const mix = (d) => { const n = d.reduce((a, b) => a + b, 0); return [0, 1, 2].map((ch) => toSrgb(Math.exp(d.reduce((s, k, i) => s + k * Math.log(REFLECT[i][ch]), 0) / n))) }
function recipeFor(rgb) {
  const want = rgb.join(), d = [0, 0, 0, 0, 0]
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
  const target = async () => (await page.locator('.pm-disc[role="img"]').first().evaluate((el) => getComputedStyle(el).backgroundColor)).match(/\d+/g).slice(0, 3).map(Number)
  const left = async () => +(await page.locator('.pm-tube-text').innerText()).match(/(\d+) drops?/)[1]
  const lock = () => page.getByRole('button', { name: /^Lock in colour/ }).click()
  const score = async () => +(await page.locator('.pm-verdict .score').innerText()).replace('%', '')
  const nextKey = () => page.getByRole('button', { name: /^Next colour|^See my result/ }).click()
  const start = await left()
  if (await page.getByRole('button', { name: /undo|empty/i }).count()) throw new Error('paint must not come back out')

  for (let round = 0; round < 5; round++) {
    const t = await target()
    const recipe = recipeFor(t)
    if (!recipe) throw new Error(`colour ${round + 1} (${t}) has no recipe of up to 8 drops`)
    const before = await left()
    if (round === 2) {
      // A deliberately wrong colour: one drop of whichever paint the recipe doesn't use most.
      const wrong = recipe.indexOf(Math.min(...recipe))
      await pots.nth(wrong).click()
      if ((await left()) !== before - 1) throw new Error('the tube should count each drop')
      await page.keyboard.press('Backspace')
      if ((await left()) !== before - 1) throw new Error('Backspace must not take paint out')
      await lock()
      if ((await score()) >= 95) throw new Error('a wrong single paint should not score 95+')
    } else {
      let firstDrop = true
      for (let i = 0; i < 5; i++) for (let k = 0; k < recipe[i]; k++) {
        if (round === 4) { await page.locator('body').click({ position: { x: 2, y: 2 } }); await page.keyboard.press(String(i + 1)) }
        else await pots.nth(i).click()
        // Colour 2: a refresh with paint in the bowl keeps the bowl and the tube.
        if (round === 1 && firstDrop) { firstDrop = false; await page.reload(); await pots.first().waitFor() }
      }
      await page.waitForTimeout(950) // the swirl settles
      await lock()
      if ((await score()) !== 100) throw new Error(`colour ${round + 1}: the exact recipe should score 100, got ${await score()}`)
      if (!(await page.getByText('Exact! ⭐').count())) throw new Error('an exact match earns a star')
      const used = recipe.reduce((a, b) => a + b, 0)
      if ((await left()) !== before - used) throw new Error(`tube: ${before} - ${used} should be ${before - used}, shows ${await left()}`)
    }
    // The last reveal: refresh before "See my result"; the day is already saved.
    if (round === 4) { await page.reload(); await page.locator('.qg-ticket').waitFor({ timeout: 5000 }); break }
    await nextKey()
  }
  await page.waitForTimeout(1200)
  const ticket = await page.locator('.qg-ticket').innerText()
  if (!/% match/.test(ticket) || !/4 exact/.test(ticket) || !/best of 1 try/i.test(ticket)) throw new Error('ticket wrong: ' + ticket)
  if (start <= 10) throw new Error('budget should be the recipes plus 10')

  // A new try starts fresh: its own five colours (unit-tested in mix.test.ts; the first, a simple tint,
  // can repeat by chance), an empty record of scores and a full tube.
  await page.getByRole('button', { name: /Try again/ }).click()
  await pots.first().waitFor()
  if (!(await page.getByText(/Colour 1 of 5 · try 2/).count())) throw new Error('try 2 should start at colour 1')
  if ((await page.locator('.qg-tile--empty').count()) !== 5) throw new Error('try 2 starts with no scores')
  if ((await left()) <= 10) throw new Error('try 2 starts with a full tube')
}
