// Renders 1200x630 link-preview images into public/og/ (one per game + home).
// Usage: npm run og   (needs Playwright + Chromium; re-run after adding a game)
const { chromium } = require('playwright')
const { execSync } = require('node:child_process')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const games = JSON.parse(execSync(
  `node -e "import('./src/games/registry.ts').then(m=>console.log(JSON.stringify(m.GAMES)))"`, { cwd: root }).toString())
const site = JSON.parse(execSync(
  `node -e "import('./src/site.ts').then(m=>console.log(JSON.stringify(m.SITE)))"`, { cwd: root }).toString())

const tokens = JSON.parse(require('node:fs').readFileSync(path.join(root, 'design-system/tokens.json'), 'utf8'))
const color = (name) => tokens.color.tokens.find((t) => t.name === name).value.light
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Figtree:wght@500;800&family=JetBrains+Mono:wght@700&display=swap">'
// A result ticket at 1200x630: stub in the game colour, perforation, sample score, name and tagline.
const card = (title, tag, fill, sample, badge) => `<html><head>${fonts}</head><body style="margin:0;width:1200px;height:630px;background:${color('canvas')};font-family:Figtree,sans-serif;display:grid;place-items:center">
<div style="position:relative;width:1080px;height:510px;background:#fff;border:4px solid ${color('ink')};border-radius:36px;box-shadow:0 12px 0 0 ${color('ink')};overflow:hidden;display:grid;grid-template-rows:200px 1fr">
  <div style="background:${fill};border-bottom:4px dashed ${color('ink')};display:flex;align-items:flex-end;justify-content:space-between;padding:0 56px 28px">
    <span style="font:700 120px/1 'JetBrains Mono',monospace;letter-spacing:-4px;color:${color('on-fill')}">${sample}</span>
    <span style="font:800 26px/1 Figtree,sans-serif;letter-spacing:3px;text-transform:uppercase;color:${color('on-fill')};padding:12px 22px;border:4px solid ${color('ink')};border-radius:999px;background:#fff">${badge}</span>
  </div>
  <div style="padding:40px 56px;display:grid;align-content:start;gap:14px">
    <div style="font:800 84px/1 'Bricolage Grotesque',sans-serif;letter-spacing:-3px;color:${color('ink')}">${title}</div>
    <div style="font:500 34px/1.3 Figtree,sans-serif;color:${color('ink-muted')};max-width:920px">${tag}</div>
  </div>
</div></body></html>`

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } })
  const out = (n) => path.join(root, 'public/og', n + '.png')
  for (const g of games) {
    await p.setContent(card(g.title, g.tagline, color(g.color), g.sample, g.daily ? 'Daily' : site.name), { waitUntil: 'networkidle' })
    await p.screenshot({ path: out(g.slug) })
  }
  await p.setContent(card(site.name, site.tagline, color('mint'), `${games.length} games`, 'Free'), { waitUntil: 'networkidle' })
  await p.screenshot({ path: out('home') })
  await b.close()
  console.log(`Wrote ${games.length + 1} images to public/og/`)
})()
