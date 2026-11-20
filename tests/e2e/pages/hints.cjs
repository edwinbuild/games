// Hints: the first tap asks once, then each tap gives a correct next step. A hinted result says so
// on the ticket and isn't sent to today's board.
module.exports = async (args) => {
  let stage = 'start'
  try { await run(args, (x) => { stage = x }) } catch (e) { throw new Error(`[${stage}] ${String(e.message || e).split('\n')[0]}`) }
}
async function run({ page, B }, at) {
  const calls = []
  await page.context().route('**/rest/v1/rpc/**', (r) => { calls.push(new URL(r.request().url()).pathname.split('/').pop()); return r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }) })
  const hintUntil = async (done, max) => {
    for (let i = 0; i < max && !(await done()); i++) await page.getByRole('button', { name: '💡 Hint' }).click()
  }

  at('garden path')
  await page.goto(B + '/garden-path/')
  await page.getByRole('button', { name: '💡 Hint' }).click()
  await page.getByText('A hint keeps today’s result off the board.').waitFor()
  await page.getByRole('button', { name: 'Show a hint' }).click()
  const len = async () => JSON.parse(await page.locator('.gp-grid').getAttribute('data-path')).length
  if ((await len()) !== 2) throw new Error('first hint should take one step')
  await hintUntil(() => page.getByRole('button', { name: /See my result/ }).count(), 80)
  await page.getByRole('button', { name: /See my result/ }).click()
  await page.getByText(/with a hint 💡/).waitFor()
  await page.waitForTimeout(800)
  if (calls.some((c) => /submit/.test(c))) throw new Error('a hinted result went to the board')

  at('word ladder')
  await page.goto(B + '/word-ladder/')
  await page.getByRole('button', { name: '💡 Hint' }).click()
  await page.getByRole('button', { name: 'Show a hint' }).click()
  await page.getByText(/^Hint: try [A-Z]{4}\.$/).waitFor()
  await hintUntil(async () => {
    if (await page.getByRole('button', { name: /See my result/ }).count()) return true
    if ((await page.locator('#wl-input').inputValue()).length === 4) await page.getByRole('button', { name: 'Add' }).click()
    return page.getByRole('button', { name: /See my result/ }).count()
  }, 20)
  await page.getByRole('button', { name: /See my result/ }).click()
  await page.getByText(/with a hint 💡/).waitFor()

  at('rule stack')
  await page.goto(B + '/rule-stack/')
  await page.getByRole('button', { name: '💡 Hint' }).click()
  await page.getByRole('button', { name: 'Never mind' }).click()
  if (await page.locator('.rs-cell[data-colour]').count()) throw new Error('never mind should give no hint')
  await page.getByRole('button', { name: '💡 Hint' }).click()
  await page.getByRole('button', { name: 'Show a hint' }).click()
  if ((await page.locator('.rs-cell[data-colour]').count()) !== 1) throw new Error('a rule stack hint should paint one square')

  at('untangle lights')
  await page.goto(B + '/untangle-lights/')
  await page.getByRole('button', { name: '💡 Hint' }).click()
  await page.getByRole('button', { name: 'Show a hint' }).click()
  await hintUntil(() => page.getByRole('button', { name: /See my result/ }).count(), 14)
  await page.getByRole('button', { name: /See my result/ }).click()
  await page.getByText(/with a hint 💡/).waitFor()
}
