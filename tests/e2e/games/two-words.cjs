// Two Words: both boards found in two guesses.
const setup = require('../hidden-word-common.cjs')
module.exports = async ({ page, B }) => {
  const { answers, type } = await setup(page, B, 'two-words')
  await type(answers[1]); await type(answers[0])
  await page.getByRole('button', { name: /See my result/ }).click()
  await page.getByText('All 2 words in 2/7').waitFor()
}
