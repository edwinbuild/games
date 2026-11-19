// Per-page JavaScript budget (gzipped): what a page loads up front plus its game chunk.
// Shared + largest game page < 90 KB; any game chunk < 25 KB (online games < 45 KB).
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib')
const dist = path.resolve(__dirname, '../dist')
const gz = (f) => zlib.gzipSync(fs.readFileSync(path.join(dist, f))).length
const ONLINE = /^(reaction-online|spot-race|higher-lower|quick-draw)$/
let fail = false
const pages = ['', ...fs.readdirSync(dist).filter((d) => fs.existsSync(path.join(dist, d, 'index.html')))]
for (const p of pages) {
  const html = fs.readFileSync(path.join(dist, p, 'index.html'), 'utf8')
  const initial = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map((m) => m[1])
  const game = fs.readdirSync(path.join(dist, 'assets')).filter((f) => p && f.startsWith(p + '-') && f.endsWith('.js'))
  const initialKb = initial.reduce((s, f) => s + gz(f), 0) / 1024
  const gameKb = game.reduce((s, f) => s + gz('assets/' + f), 0) / 1024
  const limit = ONLINE.test(p) ? 45 : 25
  const total = initialKb + gameKb
  const bad = total > 90 + (ONLINE.test(p) ? 45 : 0) || gameKb > limit
  if (bad) fail = true
  console.log(`${bad ? 'OVER' : 'ok  '} /${p}  initial ${initialKb.toFixed(1)} KB + game ${gameKb.toFixed(1)} KB = ${total.toFixed(1)} KB`)
}
if (fail) { console.error('JavaScript budget exceeded'); process.exit(1) }
