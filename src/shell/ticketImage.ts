// Share as a picture: the result ticket drawn on a canvas (1080 × 1080), for apps that don't show
// link previews. Loaded only when asked for.

type Ticket = { game: string; stamp?: string; color: string; headline: string; lines: string[]; site: string }

const css = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > max && line) { out.push(line); line = word } else line = next
  }
  if (line) out.push(line)
  return out
}

/** Draws the ticket and returns it as a PNG. */
export async function ticketPng(t: Ticket): Promise<Blob> {
  const S = 1080
  const c = document.createElement('canvas')
  c.width = S; c.height = S
  const ctx = c.getContext('2d')!
  const display = css('--font-display', 'system-ui, sans-serif')
  const mono = css('--font-mono', 'ui-monospace, monospace')
  try { await document.fonts?.ready } catch { /* fonts not loaded: system ones are fine */ }
  const ink = '#111111', paper = '#ffffff', canvas = '#f4f4f2'
  const fill = css(`--${t.color}`, '#ffc83d')

  ctx.fillStyle = canvas
  ctx.fillRect(0, 0, S, S)
  // Lay the words out first, so the ticket fits them and sits in the middle.
  const x = 90, w = S - 180, stub = 130, pad = 44
  ctx.font = `800 64px ${display}`
  const head = wrap(ctx, t.headline, w - 2 * pad).slice(0, 3)
  ctx.font = `500 40px ${mono}`
  const body = t.lines.flatMap((l) => wrap(ctx, l, w - 2 * pad).slice(0, 2)).slice(0, 8)
  const h = stub + 90 + head.length * 76 + 24 + body.length * 56 + 70 + 40
  const y = Math.max(40, (S - 90 - h) / 2)
  // The ticket: a hard shadow, a coloured stub, a white body.
  ctx.fillStyle = ink
  ctx.fillRect(x + 14, y + 14, w, h)
  ctx.fillStyle = fill
  ctx.fillRect(x, y, w, stub)
  ctx.fillStyle = paper
  ctx.fillRect(x, y + stub, w, h - stub)
  ctx.lineWidth = 6
  ctx.strokeStyle = ink
  ctx.strokeRect(x, y, w, h)
  // Perforation between stub and body.
  ctx.setLineDash([18, 14])
  ctx.beginPath(); ctx.moveTo(x, y + stub); ctx.lineTo(x + w, y + stub); ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = ink
  ctx.textBaseline = 'middle'
  ctx.font = `800 46px ${display}`
  ctx.fillText(t.game.toUpperCase(), x + pad, y + stub / 2)
  if (t.stamp) {
    ctx.font = `700 34px ${display}`
    ctx.textAlign = 'right'
    ctx.fillText(t.stamp, x + w - pad, y + stub / 2)
    ctx.textAlign = 'left'
  }

  let cy = y + stub + 90
  ctx.textBaseline = 'alphabetic'
  ctx.font = `800 64px ${display}`
  for (const l of head) { ctx.fillText(l, x + pad, cy); cy += 76 }
  cy += 24
  ctx.font = `500 40px ${mono}`
  for (const l of body) { ctx.fillText(l, x + pad, cy); cy += 56 }
  ctx.font = `700 36px ${display}`
  ctx.fillStyle = css('--ink-muted', '#5a5a57')
  ctx.fillText('Same puzzle. Your turn?', x + pad, cy + 40)

  ctx.fillStyle = ink
  ctx.font = `700 36px ${display}`
  ctx.textAlign = 'center'
  ctx.fillText(t.site, S / 2, Math.min(S - 50, y + h + 90))

  return new Promise((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error('no picture'))), 'image/png'))
}

/** Shares the picture where the device can (phones), else downloads it. */
export async function sharePicture(t: Ticket, file: string): Promise<'shared' | 'saved'> {
  const blob = await ticketPng(t)
  const f = new File([blob], file, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean }
  if (nav.share && nav.canShare?.({ files: [f] })) {
    try { await nav.share({ files: [f] }); return 'shared' } catch (e) { if ((e as Error).name === 'AbortError') return 'shared' }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = file
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  return 'saved'
}
