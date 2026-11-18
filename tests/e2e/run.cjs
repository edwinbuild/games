// End-to-end checks against a production build served by `vite preview`.
// Usage: npm run build && npm run e2e   (Playwright comes from the machine; see README)
// - every page loads with no errors and no horizontal overflow at 360, 412, 820 and 1440px
// - every game has a script in tests/e2e/games/<slug>.cjs that plays it to its result ticket
const { chromium } = require('playwright')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '../..')
const PORT = 4179
const B = `http://localhost:${PORT}`
const WIDTHS = [360, 412, 820, 1440]
const only = process.argv.slice(2)

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(B + '/')).ok) return } catch {}
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('preview server did not start')
}

;(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' })
  const failures = []
  try {
    await waitForServer()
    const dist = path.join(root, 'dist')
    const pages = ['/', ...fs.readdirSync(dist).filter((d) => fs.existsSync(path.join(dist, d, 'index.html'))).map((d) => `/${d}/`)]
    const browser = await chromium.launch()
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 900, hasTouch: width < 900 })
      const page = await ctx.newPage()
      for (const p of pages) {
        if (only.length && !only.some((o) => p.includes(o))) continue
        const errors = []
        page.removeAllListeners('pageerror')
        page.on('pageerror', (e) => errors.push(e.message))
        await page.goto(B + p)
        await page.waitForSelector('.qg-topbar', { timeout: 10000 }).catch(() => errors.push('no top bar'))
        await page.waitForTimeout(150)
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        if (over > 1) errors.push(`horizontal overflow ${over}px`)
        if (errors.length) failures.push(`${p} @${width}: ${errors.join('; ')}`)
      }
      await ctx.close()
    }
    const scripts = fs.readdirSync(path.join(__dirname, 'games')).filter((f) => f.endsWith('.cjs'))
    for (const f of scripts) {
      const slug = f.replace(/\.cjs$/, '')
      if (only.length && !only.includes(slug)) continue
      for (const scheme of ['light', 'dark']) {
        const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, colorScheme: scheme })
        const page = await ctx.newPage()
        const errors = []
        page.on('pageerror', (e) => errors.push(e.message))
        try {
          await require(path.join(__dirname, 'games', f))({ page, B, browser, scheme })
        } catch (e) {
          errors.push(String(e.message || e).split('\n')[0])
        }
        if (errors.length) failures.push(`${slug} (${scheme}): ${errors.join('; ')}`)
        await ctx.close()
      }
    }
    await browser.close()
  } finally {
    server.kill()
  }
  if (failures.length) {
    console.error('E2E FAILED\n' + failures.map((f) => '  - ' + f).join('\n'))
    process.exit(1)
  }
  console.log('E2E passed')
})().catch((e) => { console.error(e); process.exit(1) })
