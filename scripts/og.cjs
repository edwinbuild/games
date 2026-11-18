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

const card = (emoji, title, tag, color, badge) => `<html><body style="margin:0;width:1200px;height:630px;background:#0f0f14;color:#fff;
font-family:system-ui,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 90px;box-sizing:border-box;border-top:24px solid ${color}">
<div style="font-size:120px">${emoji}</div>
<div style="font-size:92px;font-weight:800;letter-spacing:-2px">${title}</div>
<div style="font-size:38px;color:#b4b4c2;margin-top:12px;max-width:950px">${tag}</div>
<div style="font-size:30px;margin-top:40px;color:${color};font-weight:700">${badge}</div></body></html>`

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } })
  const out = (n) => path.join(root, 'public/og', n + '.png')
  for (const g of games) {
    await p.setContent(card(g.emoji, g.title, g.tagline, g.color, `${g.daily ? 'New every day · ' : ''}${site.name}`))
    await p.screenshot({ path: out(g.slug) })
  }
  await p.setContent(card('⚡', site.name, site.tagline, '#facc15', `${games.length} games · play free, no sign-up`))
  await p.screenshot({ path: out('home') })
  await b.close()
  console.log(`Wrote ${games.length + 1} images to public/og/`)
})()
