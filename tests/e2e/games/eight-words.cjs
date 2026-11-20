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
