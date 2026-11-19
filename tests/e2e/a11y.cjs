// Accessibility check run on every page (axe isn't installed here, so this covers its serious
// rules by hand): page language and title, a main heading, a name on every control, alt text on
// images, labels on fields, unique ids, and WCAG AA contrast for text on plain backgrounds.
module.exports = async function a11y(page) {
  return page.evaluate(() => {
    const out = []
    const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[aria-hidden="true"]') }
    const text = (el) => (el.innerText ?? el.textContent ?? '').trim()
    const nameOf = (el) => {
      const lb = el.getAttribute('aria-labelledby')
      if (lb) return lb.split(/\s+/).map((id) => text(document.getElementById(id) ?? document.body.appendChild(document.createElement('i')))).join(' ').trim()
      if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim()
      if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l && text(l)) return text(l) }
      const wrap = el.closest('label'); if (wrap && text(wrap)) return text(wrap)
      if (el.matches('input,textarea,select')) return (el.getAttribute('title') || el.getAttribute('placeholder') || '').trim()
      return text(el) || el.getAttribute('title') || [...el.querySelectorAll('img[alt],svg[aria-label]')].map((i) => i.getAttribute('alt') || i.getAttribute('aria-label')).join(' ').trim()
    }
    if (!document.documentElement.lang) out.push('no page language')
    if (!document.title.trim()) out.push('no page title')
    if (!document.querySelector('h1')) out.push('no h1')
    for (const el of document.querySelectorAll('a[href],button,[role=button],[role=radio],[role=gridcell],[role=link],input:not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])')) {
      if (!visible(el) && !el.matches('input,select,textarea')) continue
      if (!nameOf(el)) out.push(`no name: <${el.tagName.toLowerCase()} class="${el.getAttribute('class') ?? ''}">`)
    }
    for (const img of document.querySelectorAll('img')) if (!img.hasAttribute('alt')) out.push(`img without alt: ${img.src.slice(-40)}`)
    const ids = new Map()
    for (const el of document.querySelectorAll('[id]')) ids.set(el.id, (ids.get(el.id) ?? 0) + 1)
    for (const [id, n] of ids) if (n > 1) out.push(`duplicate id "${id}" ×${n}`)
    // Contrast: text whose background is a plain colour up the tree (gradients and images skipped).
    const rgb = (c) => {
      const m = c.match(/[\d.]+/g)
      if (!m) return null
      const v = m.map(Number)
      // color(srgb r g b / a) uses 0–1 channels.
      return c.startsWith('color(') ? [v[0] * 255, v[1] * 255, v[2] * 255, v[3] ?? 1] : v
    }
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
    const bgOf = (el) => {
      for (let e = el; e; e = e.parentElement) {
        const s = getComputedStyle(e)
        if (s.backgroundImage !== 'none' || s.filter !== 'none' || Number(s.opacity) < 1) return null
        const c = rgb(s.backgroundColor)
        if (c && (c[3] ?? 1) >= 0.99) return c
        if (c && (c[3] ?? 1) > 0.01) return null // translucent: can't judge simply
      }
      return [255, 255, 255]
    }
    const seen = new Set()
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      // Emoji and symbols draw in their own colours; judge only text with letters or digits.
      if (!/[\p{L}\p{N}]/u.test(n.textContent)) continue
      const el = n.parentElement
      if (!el || seen.has(el) || !visible(el) || el.closest('svg,.demo,[aria-disabled="true"],:disabled')) continue
      seen.add(el)
      const s = getComputedStyle(el)
      const fg = rgb(s.color), bg = bgOf(el)
      if (!fg || !bg || (fg[3] ?? 1) < 0.99) continue
      const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x)
      const ratio = (a + 0.05) / (b + 0.05)
      const size = parseFloat(s.fontSize), bold = Number(s.fontWeight) >= 700
      const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5
      if (ratio < need) out.push(`contrast ${ratio.toFixed(2)} < ${need}: "${n.textContent.trim().slice(0, 30)}" (${s.color} on rgb(${bg.slice(0, 3)}))`)
    }
    return [...new Set(out)]
  })
}
