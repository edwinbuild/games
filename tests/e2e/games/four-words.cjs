// Four Words: every guess goes on every board, a found board stops, the keyboard splits each key
// into four, a refresh mid-game keeps the guesses, and finding all four wins.
const setup = require('../hidden-word-common.cjs')
module.exports = async ({ page, B }) => {
  const { answers, type, played } = await setup(page, B, 'four-words')
  if (answers.length !== 4 || new Set(answers).size !== 4) throw new Error('four different words expected')
  await type(answers[2])
  await page.locator('.hw-board.is-solved').first().waitFor()
  if ((await page.locator('.hw-board.is-solved').count()) !== 1) throw new Error('one board should be solved')
  if ((await page.locator('.hw-keymap--4').count()) < 26) throw new Error('each key should show four boards')
  await page.reload()
  await page.locator('.hw-board.is-solved').first().waitFor({ timeout: 15000 })
  if ((await played()).join() !== answers[2]) throw new Error('a refresh should keep the guesses')
  for (const w of [answers[0], answers[1], answers[3]]) await type(w)
  await page.getByRole('button', { name: /See my result/ }).click()
  await page.getByText('All 4 words in 4/9').waitFor()
}
