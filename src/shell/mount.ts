// Draws a page's app synchronously, then shows the text that came with the HTML (how-to, footer).
// Until then that text is hidden (see the style in each page's head), so it can't be pushed down
// when the app appears above it: no layout shift.
import type { ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

export function mount(el: HTMLElement | null, node: ReactNode): void {
  if (!el) return
  const root = createRoot(el)
  flushSync(() => root.render(node))
}

/** Call once every part of the page is drawn. */
export const ready = () => document.documentElement.classList.add('ready')
