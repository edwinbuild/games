// Per-page JavaScript budget (gzipped): everything a page fetches up front — its scripts plus
// what it preloads (the game's own code and the shared parts it needs straight away: the result
// ticket, the daily board, icons). Pages without a game < 92 KB; game pages < 105 KB (online
// games, which bring the room code, +45 KB); any game's own chunk < 25 KB (online < 45 KB).
// (Until v1.6 only the game's own chunk was counted and its shared parts weren't, so the old
// 92 KB limit understated what a game page really loaded right after it started.)
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib')
const dist = path.resolve(__dirname, '../dist')
const gz = (f) => zlib.gzipSync(fs.readFileSync(path.join(dist, f))).length
const ONLINE = /^(reaction-online|spot-race|higher-lower|quick-draw|letter-race|dots-and-boxes)$/
// The admin page is only ever loaded by the admin: 10 KB of room.
const ADMIN = /^admin$/
let fail = false
const pages = ['', ...fs.readdirSync(dist).filter((d) => fs.existsSync(path.join(dist, d, 'index.html')))]
for (const p of pages) {
  const html = fs.readFileSync(path.join(dist, p, 'index.html'), 'utf8')
  const initial = [...html.matchAll(/<script[^>]+src="\/(assets\/[^"]+\.js)"/g)].map((m) => m[1])
  const preload = [...html.matchAll(/rel="modulepreload"[^>]+href="\/(assets\/[^"]+\.js)"/g)].map((m) => m[1])
  const own = preload.filter((f) => new RegExp(`^assets/${p}-[\\w-]{8}\\.js$`).test(f))
  const kb = (fs) => fs.reduce((s, f) => s + gz(f), 0) / 1024
  const initialKb = kb(initial), preloadKb = kb(preload), ownKb = kb(own)
  const total = initialKb + preloadKb
  const isGame = preload.length > 0
  const bad = total > (isGame ? 105 : 92) + (ONLINE.test(p) ? 45 : 0) + (ADMIN.test(p) ? 10 : 0) || ownKb > (ONLINE.test(p) ? 45 : 25)
  if (bad) fail = true
  console.log(`${bad ? 'OVER' : 'ok  '} /${p}  scripts ${initialKb.toFixed(1)} KB + preloaded ${preloadKb.toFixed(1)} KB (game ${ownKb.toFixed(1)}) = ${total.toFixed(1)} KB`)
}
if (fail) { console.error('JavaScript budget exceeded'); process.exit(1) }
