// Shared checks for game scripts.

/** Throws unless the element is fully inside the viewport (within 1 px). */
async function assertFullyVisible(page, selector, what) {
  const r = await page.locator(selector).first().evaluate((el) => {
    const b = el.getBoundingClientRect()
    return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, vw: innerWidth, vh: innerHeight }
  })
  const share = Math.max(0, Math.min(r.bottom, r.vh) - Math.max(r.top, 0)) / (r.bottom - r.top)
  if (r.top < -1 || r.bottom > r.vh + 1 || r.left < -1 || r.right > r.vw + 1) {
    throw new Error(`${what} is not fully on screen when it starts (${Math.round(share * 100)}% visible)`)
  }
}

/** A small phone context, the size the tester used. */
const SMALL_PHONE = { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true }

/** The game's local stats. */
const stats = (page, slug) => page.evaluate((slug) => JSON.parse(localStorage.getItem('qg:stats:' + slug) ?? 'null'), slug)

module.exports = { assertFullyVisible, SMALL_PHONE, stats }
