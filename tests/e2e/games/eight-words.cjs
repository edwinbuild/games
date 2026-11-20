// Eight Words: thirteen guesses without finding them all ends the game, shows how many were found
// and reveals the words that weren't.
const setup = require('../hidden-word-common.cjs')
module.exports = async ({ page, B }) => {
  const { answers, guesses, type } = await setup(page, B, 'eight-words')
  if (answers.length !== 8) throw new Error('eight words expected')
  await type(answers[0]); await type(answers[1])
  const others = guesses.filter((w) => !answers.includes(w)).slice(0, 11)
  for (const w of others) await type(w)
  await page.getByRole('button', { name: /See my result/ }).click()
  await page.getByText('2 of 8 words found').first().waitFor()
  await page.getByText(answers[5].toUpperCase(), { exact: true }).first().waitFor()
}

// On a big computer screen every board is on screen at once, four across, above the keyboard.
const desktop = module.exports
module.exports = async (args) => {
  await desktop(args)
  if (args.scheme === 'dark') return
  const ctx = await args.browser.newContext({ viewport: { width: 1774, height: 1260 } })
  try {
    await ctx.route('**/rest/v1/rpc/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }))
    const p = await ctx.newPage()
    await p.goto(args.B + '/eight-words/')
    await p.locator('.hw-boards.is-fit').waitFor({ timeout: 15000 })
    await p.waitForTimeout(500)
    const r = await p.evaluate(() => {
      const boards = [...document.querySelectorAll('.hw-board')].map((b) => b.getBoundingClientRect())
      const keys = document.querySelector('.hw-bottom').getBoundingClientRect()
      return { across: new Set(boards.map((b) => Math.round(b.top))).size, last: Math.max(...boards.map((b) => b.bottom)), keys: keys.top, cols: getComputedStyle(document.querySelector('.hw-boards')).getPropertyValue('--cols') }
    })
    if (r.cols.trim() !== '4' || r.across !== 2) throw new Error(`expected two rows of four boards: ${JSON.stringify(r)}`)
    if (r.last > r.keys) throw new Error(`boards should end above the keyboard: ${JSON.stringify(r)}`)
  } finally { await ctx.close() }
}
