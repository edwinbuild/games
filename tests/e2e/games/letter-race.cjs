// Real Supabase Realtime: two players race on the same letters (a 20-second round in test mode).
// Both find one shared word, only A finds a second one (doubled); both phones agree on the scores.
const opts = { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true }
module.exports = async (args) => {
  if (args.scheme === 'dark') return 'skip' // one full online run is enough per suite
  let stage = 'start'
  try { await run(args, (x) => { stage = x }) } catch (e) { const t = await args.page.locator('main').innerText().catch(() => ''); throw new Error(`[${stage}] ${String(e.message || e).split('\n')[0]} | A: ${t.replace(/\s+/g, ' ').slice(0, 300)}`) }
}
async function run({ page, B, browser }, at) {
  const short = () => localStorage.setItem('qg:test-round', '20')
  await page.context().addInitScript(short)
  const A = page
  await A.goto(B + '/letter-race/')
  await A.getByRole('button', { name: 'Create a room' }).click()
  await A.waitForURL(/room=/)
  const code = new URL(A.url()).searchParams.get('room')
  await A.locator('.qg-room-code').waitFor({ timeout: 15000 })
  const ctx = await browser.newContext(opts)
  await ctx.addInitScript(short)
  const Bp = await ctx.newPage()
  await Bp.goto(`${B}/letter-race/?room=${code}`)
  await A.locator('.qg-lobby li:not(.qg-lobby-empty)').nth(1).waitFor({ timeout: 20000 })
  for (const p of [A, Bp]) await p.getByRole('button', { name: 'Ready', exact: true }).click({ timeout: 20000 })
  await A.getByRole('button', { name: 'Start the race (2 players)' }).click({ timeout: 15000 })

  at('letters')
  // Same letters on both phones; work out two words from the list.
  const tiles = async (p) => { await p.locator('.lr-tile').first().waitFor({ timeout: 15000 }); return (await p.locator('.lr-tile').allInnerTexts()).map((t) => t.toLowerCase()) }
  const [la, lb] = await Promise.all([tiles(A), tiles(Bp)])
  if ([...la].sort().join('') !== [...lb].sort().join('')) throw new Error('players got different letters')
  const list = (await (await A.request.get(B + '/words/letter-race.txt')).text()).split('\n').filter((l) => l && !l.startsWith('#'))
  const fits = (w) => { const left = [...la]; for (const c of w) { const i = left.indexOf(c); if (i < 0) return false; left.splice(i, 1) } return true }
  const words = list.filter((w) => w.length >= 3 && w.length <= 5 && fits(w)).slice(0, 2)
  if (words.length < 2) throw new Error('not enough words in ' + la.join(''))
  const type = async (p, w) => { await p.keyboard.type(w); await p.keyboard.press('Enter') }

  at('countdown')
  await A.getByText(/^\d+s$/).waitFor({ timeout: 10000 }) // the countdown is over
  await Bp.getByText(/^\d+s$/).waitFor({ timeout: 10000 })
  at('typing ' + words.join(','))
  await type(A, words[0]); await A.getByText(`${words[0].toUpperCase()} +`).waitFor()
  await type(A, words[0]); await A.getByText('You have that one already.').waitFor()
  // Tiles that don't make a word are refused.
  const set = new Set(list)
  const junk = [la.slice(0, 4), la.slice(1, 5), la.slice(2, 6), la.slice(3, 7)].map((x) => x.join('')).find((w) => !set.has(w))
  await type(A, junk); await A.getByText('Not in the word list.').waitFor()
  await type(A, words[1])
  at('B taps')
  // B taps the first word's letters on the tiles.
  for (const c of words[0]) await Bp.locator('.lr-tile:not(.is-used)', { hasText: new RegExp(`^${c}$`, 'i') }).first().click()
  await Bp.getByRole('button', { name: 'Enter' }).click()

  at('results')
  try { await A.locator('.qg-ticket').waitFor({ timeout: 30000 }) } catch (e) { throw new Error('no ticket on A: ' + (await A.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 400)) }
  await Bp.locator('.qg-ticket').waitFor({ timeout: 30000 })
  const pts = (w) => ({ 3: 1, 4: 2, 5: 4 })[w.length]
  const ra = await A.locator('.sr-ranking').innerText(), rb = await Bp.locator('.sr-ranking').innerText()
  const mine = (t) => +t.match(/You\s+(\d+) pts/)[1]
  const want = pts(words[0]) + 2 * pts(words[1])
  if (mine(ra) !== want) throw new Error(`A should have ${want}: ${ra}`)
  if (mine(rb) !== pts(words[0])) throw new Error(`B should have ${pts(words[0])}: ${rb}`)
  if (!(await A.locator('.lr-word.is-only', { hasText: words[1] }).count())) throw new Error('the word only A found should be starred')
  await A.getByText(/1st of 2/).first().waitFor()
  await ctx.close()
}
