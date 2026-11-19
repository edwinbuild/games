// Solves the board with its own search (mirrors placed along the beam), placing mirrors by tap and one by keyboard.
const N = 7
function trace(cells, laser) {
  let r = Math.floor(laser / N), c = laser % N, dx = 1, dy = 0
  const path = [], lit = new Set(), seen = new Set()
  for (let s = 0; s < 400; s++) {
    r += dy; c += dx
    if (r < 0 || r >= N || c < 0 || c >= N) break
    const i = r * N + c, cell = cells[i]
    if (cell === 'wall' || cell === 'laser' || seen.has(`${i}:${dx}:${dy}`)) break
    seen.add(`${i}:${dx}:${dy}`); path.push(i)
    if (cell === 'target') lit.add(i)
    if (cell === '/') [dx, dy] = [-dy, -dx]
    if (cell === '\\') [dx, dy] = [dy, dx]
  }
  return { path, lit }
}
function solve(cells, laser, left) {
  const goal = cells.flatMap((c, i) => (c === 'target' ? [i] : []))
  const { path, lit } = trace(cells, laser)
  if (goal.every((i) => lit.has(i))) return []
  if (!left) return null
  for (const i of path) {
    if (cells[i] !== '') continue
    for (const m of ['/', '\\']) {
      const nb = cells.slice(); nb[i] = m
      const rest = solve(nb, laser, left - 1)
      if (rest) return [[i, m], ...rest]
    }
  }
  return null
}
module.exports = async ({ page, B }) => {
  await page.goto(B + '/light-path/')
  const grid = page.locator('.lp-grid')
  await grid.waitFor()
  const { cells, laser } = JSON.parse(await grid.getAttribute('data-board'))
  let plan = null
  for (let k = 1; k <= 3 && !plan; k++) plan = solve(cells, laser, k)
  if (!plan) throw new Error('no solution')
  const btn = page.locator('.lp-cell')
  let moves = 0
  for (const [n, [i, m]] of plan.entries()) {
    const clicks = m === '/' ? 1 : 2
    for (let c = 0; c < clicks; c++) {
      if (n === 0 && c === 0) { await btn.nth(i).focus(); await page.keyboard.press('Space') }
      else await btn.nth(i).click()
      moves++
    }
  }
  await page.locator('.qg-ticket').waitFor({ timeout: 5000 })
  await page.getByText(/on par/).waitFor({ timeout: 5000 })
  // The headline counts up; wait for its final value.
  await page.locator('.qg-ticket').getByText(`${plan.length} mirror${plan.length === 1 ? '' : 's'}, ${moves} moves`, { exact: true }).waitFor({ timeout: 5000 })
}
