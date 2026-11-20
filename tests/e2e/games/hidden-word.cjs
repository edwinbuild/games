// Hidden Word: a short word and an unknown word are refused (no guess used), a wrong guess is
// marked, the answer wins, a refresh shows the finished day again (one game a day).
const setup = require('../hidden-word-common.cjs')
module.exports = async ({ page, B }) => {
  const { answers, guesses, type, played } = await setup(page, B, 'hidden-word')
  const [answer] = answers
  await type('abc'); await page.getByText('Five letters, please.').waitFor()
  await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace')
  await type('qzxjv'); await page.getByText('That’s not in the word list.').waitFor()
  for (let i = 0; i < 5; i++) await page.keyboard.press('Backspace')
  if ((await played()).length) throw new Error('refused words should not use a guess')
  // A wrong guess that shares nothing in position, then the answer.
  const wrong = guesses.find((w) => w !== answer && [...w].every((c, i) => c !== answer[i]) && [...w].some((c) => answer.includes(c)))
  await type(wrong)
  await page.locator('.hw-cell.is-elsewhere').first().waitFor()
  if (await page.locator('.hw-cell.is-right').count()) throw new Error('no letter of the wrong guess should be in its spot')
  // The on-screen keyboard: the answer's first letter by tapping, the rest typed.
  await page.locator('.hw-key', { has: page.locator('.hw-keyletter', { hasText: new RegExp(`^${answer[0]}$`, 'i') }) }).click()
  await page.keyboard.type(answer.slice(1)); await page.keyboard.press('Enter')
  await page.getByRole('button', { name: /See my result/ }).click()
  await page.getByText('Found it in 2/6').waitFor()
  await page.reload()
  await page.getByText('Found it in 2/6').waitFor()
}
