// Runs after the build: each game page gets <link rel="modulepreload"> for its own game code and
// everything that code imports straight away, so the browser fetches them alongside the page's
// scripts instead of one after another (see docs/speed-report.md, row 5).
const fs = require('node:fs'), path = require('node:path'), { execSync } = require('node:child_process')
const root = path.resolve(__dirname, '..'), dist = path.join(root, 'dist')
const games = JSON.parse(execSync(`node -e "import('./src/games/registry.ts').then(m=>console.log(JSON.stringify(m.GAMES.map(g=>g.slug))))"`, { cwd: root }).toString())
const assets = fs.readdirSync(path.join(dist, 'assets'))
const importsOf = (file) => [...fs.readFileSync(path.join(dist, 'assets', file), 'utf8').matchAll(/(?:from|import)\s*"\.\/([\w.-]+\.js)"/g)].map((m) => m[1])
let pages = 0
for (const slug of games) {
  const htmlPath = path.join(dist, slug, 'index.html')
  if (!fs.existsSync(htmlPath)) continue
  const chunk = assets.find((f) => new RegExp(`^${slug}-[\\w-]{8}\\.js$`).test(f))
  if (!chunk) throw new Error(`no chunk for ${slug}`)
  let html = fs.readFileSync(htmlPath, 'utf8')
  const already = new Set([...html.matchAll(/\/assets\/([\w.-]+\.js)/g)].map((m) => m[1]))
  const want = new Set([chunk])
  for (const f of want) for (const d of importsOf(f)) want.add(d)
  const links = [...want].filter((f) => !already.has(f)).map((f) => `    <link rel="modulepreload" crossorigin href="/assets/${f}">`).join('\n')
  html = html.replace('</head>', `${links}\n  </head>`)
  fs.writeFileSync(htmlPath, html)
  pages++
}
console.log(`modulepreload added to ${pages} game pages`)
