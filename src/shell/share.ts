// Share helpers for the result card.
export function shareUrls(text: string, url: string) {
  const full = `${text}\n${url}`
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(full)}`,
    x: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Older browsers / insecure contexts.
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

/** Native share sheet (reaches Instagram Stories, Telegram, etc. on phones). */
export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export async function nativeShare(text: string, url: string): Promise<boolean> {
  try {
    await navigator.share({ text, url })
    return true
  } catch {
    return false
  }
}
