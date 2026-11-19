// Solves today's board with an independent path search, turning pipes by tap and one by keyboard.
const N = 6, D = [[1, -1, 0, 4], [2, 0, 1, 8], [4, 1, 0, 1], [8, 0, -1, 2]]
const turn = (m, k) => { for (let i = 0; i < k; i++) m = ((m << 1) | (m >> 3)) & 15; return m }
function solve({ pieces, source, sink }) {
  const seen = new Set()
  const go = (i, from, acc) => {
    if (seen.has(i)) return null
    seen.add(i)
    for (let k = 0; k < 4; k++) {
      const m = turn(pieces[i], k)
      if (!(m & from)) continue
      if (i === sink && m & 2) return [...acc, [i, k]]
      for (const [d, dr, dc, back] of D) {
        if (d === from || !(m & d)) continue
        const r = Math.floor(i / N) + dr, c = (i % N) + dc
        if (r < 0 || r >= N || c < 0 || c >= N) continue
        const got = go(r * N + c, back, [...acc, [i, k]])
        if (got) return got
      }
    }
    seen.delete(i)
    return null
  }
  return go(source, 8, [])
}
module.exports = async ({ page, B }) => {
  await page.goto(B + '/pipe-turn/')
  const grid = page.locator('.pt-grid')
  await grid.waitFor()
  const board = JSON.parse(await grid.getAttribute('data-board'))
  const plan = solve(board)
  if (!plan) throw new Error('no solution found')
  const cells = page.locator('.pt-cell')
  let total = 0
  // The first needed turn by keyboard: focus the source cell's grid and press Space.
  const first = plan.find(([, k]) => k > 0)
  for (const [i, k] of plan) {
    for (let n = 0; n < k; n++) {
      if (first && i === first[0] && n === 0) { await cells.nth(i).focus(); await page.keyboard.press('Space') }
      else await cells.nth(i).click()
      total++
    }
  }
  await page.locator('.pt-plant.is-bloom').waitFor({ timeout: 3000 })
  await page.locator('.qg-ticket').waitFor({ timeout: 5000 })
  const t = await page.locator('.qg-ticket').innerText()
  if (!t.includes(`${total} turns`)) throw new Error(`expected ${total} turns: ` + t)
}
