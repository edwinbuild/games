// Shared by the Hidden Word tests: read the day's words (shown in test mode only) and type guesses.
module.exports = async function setup(page, B, slug) {
  await page.context().addInitScript(() => localStorage.setItem('qg:test-solutions', 'true'))
  await page.goto(`${B}/${slug}/`)
  const boards = page.locator('.hw-boards')
  await boards.waitFor({ timeout: 15000 })
  const answers = (await boards.getAttribute('data-answers')).split(' ')
  const text = await page.evaluate(async () => (await fetch('/words/hidden-word.txt')).text())
  const guesses = text.split('\n').filter((l) => l && !l.startsWith('#') && !l.startsWith('!'))
  const type = async (w) => { await page.keyboard.type(w); await page.keyboard.press('Enter') }
  const played = async () => ((await boards.getAttribute('data-guesses')) || '').split(' ').filter(Boolean)
  return { boards, answers, guesses, type, played }
}
