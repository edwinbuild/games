// Hidden Word: a short word and an unknown word are refused (no guess used), a wrong guess is
// marked, the answer wins, a refresh shows the finished day again (one game a day).
const setup = require('../hidden-word-common.cjs')
module.exports = async (args) => {
  let stage = 'start'
  try { await run(args, (x) => { stage = x }) } catch (e) { const t = await args.page.locator('body').innerText().catch(() => ''); throw new Error(`[${stage}] ${String(e.message || e).split('\n')[0]} | ${t.replace(/\s+/g, ' ').slice(0, 300)}`) }
}
async function run({ page, B }, at) {
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

  // Practice rounds after the daily: new words, not on the board, then back to today's result.
  const boardCalls = []
  page.on('request', (r) => { if (/submit_score/.test(r.url())) boardCalls.push(r.url()) })
  at('practice start')
  await page.getByRole('button', { name: 'Practice round (new words)' }).click()
  await page.getByText('Practice round · not on the board').waitFor()
  const practice = (await page.locator('.hw-boards').getAttribute('data-answers')).split(' ')
  if (practice[0] === answer) throw new Error('a practice round should have a new word')
  await page.keyboard.type(practice[0]); await page.keyboard.press('Enter')
  await page.getByRole('button', { name: /See my result/ }).click()
  at('practice result')
  await page.getByText('Practice: found it in 1/6').waitFor()
  await page.waitForTimeout(800)
  if (boardCalls.length) throw new Error('a practice round should not go on the board')
  at('back')
  await page.getByRole('button', { name: 'Back to today’s result' }).click()
  await page.getByText('Found it in 2/6').waitFor()
}
