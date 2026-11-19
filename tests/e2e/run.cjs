// End-to-end checks against a production build served by `vite preview`.
// Usage: npm run build && npm run e2e   (Playwright comes from the machine; see README)
// - every page loads with no errors and no horizontal overflow at 360, 412, 820 and 1440px
// - every game has a script in tests/e2e/games/<slug>.cjs that plays it to its result ticket
const a11y = require('./a11y.cjs')
const { chromium } = require('playwright')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '../..')
const PORT = 4179
const B = `http://localhost:${PORT}`
const WIDTHS = [360, 412, 820, 1440, 1920]
const only = process.argv.slice(2)
// Daily games (from the registry): reopening one after playing must show the result again, quietly.
const registry = fs.readFileSync(path.join(root, 'src/games/registry.ts'), 'utf8')
const DAILY = new Set([...registry.matchAll(/slug: '([a-z-]+)'[\s\S]*?(?=slug: '|$)/g)].filter((m) => /daily: true/.test(m[0])).map((m) => m[1]))

/**
 * Checks run after every game script that played to the end (a script returns 'skip' when it
 * deliberately didn't): the game recorded something in local stats, nothing overflows sideways,
 * and a daily game shows today's result again on reopening without sending another finish.
 */
/**
 * The game slides in on load (420 ms). Scripts measure positions right after loading, so every
 * goto/reload waits for that entrance animation to finish (checked on the animation itself, since
 * some scripts pause a fake clock).
 */
const entered = (p) => p.waitForFunction(() => document.getAnimations().filter((a) => a.animationName === 'game-in').every((a) => a.playState === 'finished'), null, { timeout: 4000 }).catch(() => {})
function settle(p) {
  const goto = p.goto.bind(p), reload = p.reload.bind(p)
  p.goto = async (...a) => { const r = await goto(...a); await entered(p); return r }
  p.reload = async (...a) => { const r = await reload(...a); await entered(p); return r }
  return p
}
/** The browser as scripts see it: pages in contexts they create settle too. */
const withSettle = (browser) => new Proxy(browser, {
  get(target, prop) {
    if (prop === 'newContext') return async (...a) => { const ctx = await target.newContext(...a); ctx.on('page', settle); return ctx }
    const v = target[prop]
    return typeof v === 'function' ? v.bind(target) : v
  },
})

async function sharedChecks(page, slug, clocked) {
  const problems = []
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth).catch(() => 0)
  if (over > 1) problems.push(`horizontal overflow ${over}px at the end`)
  const st = await page.evaluate((slug) => JSON.parse(localStorage.getItem('qg:stats:' + slug) ?? 'null'), slug).catch(() => null)
  if (!st || !(st.plays > 0 || st.lastDaily)) problems.push('nothing recorded in local stats')
  if (DAILY.has(slug)) {
    // A fresh tab in the same browser profile; a fake clock a script paused (it is per profile) runs again.
    if (clocked) await page.clock.resume()
    const tab = await page.context().newPage()
    await tab.goto(`${B}/${slug}/`)
    const shown = await tab.locator('.qg-ticket').waitFor({ timeout: 8000 }).then(() => true, () => false)
    if (!shown) problems.push('reopening today did not show the result')
    else {
      await tab.waitForTimeout(400)
      const n = await tab.evaluate(() => Number(document.documentElement.dataset.finishes ?? 0))
      if (n) problems.push(`reopening today sent ${n} finish event(s)`)
    }
    await tab.close()
  }
  return problems
}

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
    if (fs.existsSync(path.join(dist, 'c'))) pages.push(...fs.readdirSync(path.join(dist, 'c')).map((d) => `/c/${d}/`))
    const browser = await chromium.launch()
    // Every page at each width; the widths run side by side.
    await Promise.all(WIDTHS.map(async (width) => {
      // 1440 runs in dark mode, so the accessibility check (412 and 1440) sees both themes.
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 900, hasTouch: width < 900, colorScheme: width === 1440 ? 'dark' : 'light' })
      const page = await ctx.newPage()
      for (const p of pages) {
        if (only.length && !only.some((o) => p.includes(o))) continue
        const errors = []
        page.removeAllListeners('pageerror')
        page.on('pageerror', (e) => errors.push(e.message))
        await page.goto(B + p)
        await page.waitForSelector('.qg-topbar', { timeout: 10000 }).catch(() => errors.push('no top bar'))
        await page.waitForTimeout(150)
        const over = await page.evaluate((w) => document.documentElement.scrollWidth - w, width)
        if (over > 1) errors.push(`horizontal overflow ${over}px`)
        // From 820px the footer is one row: brand and credit, links, theme switch.
        if (width >= 820) {
          const rows = await page.evaluate(() => [...document.querySelectorAll('.qg-footer-stub > *')].map((el) => { const r = el.getBoundingClientRect(); return Math.round(r.top + r.height / 2) }))
          if (rows.length && Math.max(...rows) - Math.min(...rows) > 24) errors.push('footer is not on one row')
        }
        // Accessibility at one phone width and one desktop width (the checks don't depend on the scheme).
        if (width === 412 || width === 1440) errors.push(...(await a11y(page)).map((x) => `a11y: ${x}`))
        if (errors.length) failures.push(`${p} @${width}: ${errors.join('; ')}`)
      }
      await ctx.close()
    }))
    // Page scripts (tests/e2e/pages), e.g. the home page's filters and progress ring.
    for (const f of fs.readdirSync(path.join(__dirname, 'pages')).filter((f) => f.endsWith('.cjs'))) {
      const name = f.replace(/\.cjs$/, '')
      if (only.length && !only.includes(name)) continue
      const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true })
      const page = await ctx.newPage()
      const errors = []
      // Errors a script throws on purpose (the error-report test) say "e2e test error".
      page.on('pageerror', (e) => { if (!/e2e test error/.test(e.message)) errors.push(e.message) })
      try { await require(path.join(__dirname, 'pages', f))({ page, B, browser }) } catch (e) { errors.push(String(e.message || e).split('\n')[0]) }
      if (errors.length) failures.push(`page ${name}: ${errors.join('; ')}`)
      await ctx.close()
    }
    const scripts = fs.readdirSync(path.join(__dirname, 'games')).filter((f) => f.endsWith('.cjs'))
    // Each script and colour scheme is a job in its own browser profile; a few run at once
    // (E2E_WORKERS, default 3: more starts to squeeze the timing-sensitive games on small machines).
    const jobs = scripts.flatMap((f) => {
      const slug = f.replace(/\.cjs$/, '')
      return only.length && !only.includes(slug) ? [] : ['light', 'dark'].map((scheme) => ({ f, slug, scheme }))
    })
    async function runJob({ f, slug, scheme }) {
      const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, colorScheme: scheme })
      const page = await ctx.newPage()
      const errors = []
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text().slice(0, 160)) })
      // Note whether the script installs a fake clock (resuming one that was never installed breaks the page).
      let clocked = false
      const install = page.clock.install.bind(page.clock)
      page.clock.install = (...a) => { clocked = true; return install(...a) }
      const started = Date.now()
      try {
        settle(page)
        const outcome = await require(path.join(__dirname, 'games', f))({ page, B, browser: withSettle(browser), scheme })
        // Accessibility of wherever the script ended (usually the result ticket), before the shared checks move on.
        if (outcome !== 'skip' && !page.isClosed()) errors.push(...(await a11y(page).catch(() => [])).map((x) => `a11y at the end: ${x}`))
        if (outcome !== 'skip' && !errors.length) errors.push(...(await sharedChecks(page, slug, clocked)))
      } catch (e) {
        errors.push(String(e.message || e).split('\n')[0])
      }
      if (errors.length) failures.push(`${slug} (${scheme}): ${errors.join('; ')}`)
      if (process.env.E2E_VERBOSE) console.log(`${errors.length ? 'FAIL' : 'ok  '} ${slug} (${scheme}) ${((Date.now() - started) / 1000).toFixed(1)}s`)
      await ctx.close()
    }
    const workers = Math.max(1, Number(process.env.E2E_WORKERS) || 3)
    let next = 0
    await Promise.all(Array.from({ length: workers }, async () => { while (next < jobs.length) await runJob(jobs[next++]) }))
    failures.sort()
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
