// Page speed on a mid-range phone, Lighthouse-style (Lighthouse itself isn't installed here):
// 4× slower CPU, a slow 4G connection (150 ms, 1.6 Mbps down), empty cache. Reports First and
// Largest Contentful Paint, Total Blocking Time and Cumulative Layout Shift, against Lighthouse's
// "good" marks (FCP 1.8 s, LCP 2.5 s, TBT 200 ms, CLS 0.1). Usage: node scripts/perf.cjs [base-url]
const { chromium, devices } = require('playwright')
const base = process.argv[2] || 'https://games-sigma-gold.vercel.app'
const PAGES = ['/', '/rule-stack/', '/dots-and-boxes/', '/orbit-drop/']
const RUNS = 3
;(async () => {
  const b = await chromium.launch()
  let bad = 0
  for (const p of PAGES) {
    const runs = []
    for (let i = 0; i < RUNS; i++) {
      const ctx = await b.newContext({ ...devices['Moto G4'] })
      const page = await ctx.newPage()
      const cdp = await ctx.newCDPSession(page)
      await cdp.send('Network.enable')
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
      await page.addInitScript(() => {
        window.__perf = { lcp: 0, cls: 0, tbt: 0, fcp: 0 }
        new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
        new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value }).observe({ type: 'layout-shift', buffered: true })
        new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__perf.fcp = e.startTime }).observe({ type: 'paint', buffered: true })
        new PerformanceObserver((l) => { for (const e of l.getEntries()) if (window.__perf.fcp && e.startTime > window.__perf.fcp) window.__perf.tbt += Math.max(0, e.duration - 50) }).observe({ type: 'longtask', buffered: true })
      })
      await page.goto(base + p, { waitUntil: 'load' })
      await page.waitForTimeout(3000)
      runs.push(await page.evaluate(() => window.__perf))
      await ctx.close()
    }
    const med = (k) => runs.map((r) => r[k]).sort((a, c) => a - c)[Math.floor(RUNS / 2)]
    const r = { fcp: med('fcp'), lcp: med('lcp'), tbt: med('tbt'), cls: med('cls') }
    const ok = r.fcp <= 1800 && r.lcp <= 2500 && r.tbt <= 200 && r.cls <= 0.1
    if (!ok) bad++
    console.log(`${ok ? 'good' : 'SLOW'}  ${p.padEnd(18)} FCP ${(r.fcp / 1000).toFixed(2)} s · LCP ${(r.lcp / 1000).toFixed(2)} s · TBT ${Math.round(r.tbt)} ms · CLS ${r.cls.toFixed(3)}`)
  }
  await b.close()
  process.exit(bad ? 1 : 0)
})()
