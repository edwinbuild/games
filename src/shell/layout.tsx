import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** The game page's side column. Results render into it: beside the game on wide screens, below it on phones. */
export const AsideContext = createContext<HTMLElement | null>(null)

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const stacked = () => typeof matchMedia !== 'undefined' && !matchMedia('(min-width: 1000px), (orientation: landscape) and (max-height: 520px) and (min-width: 640px)').matches

/** Renders the result into the side column, and on phones scrolls it into view once. */
export function ResultSlot({ children, scrollIntoView }: { children: ReactNode; scrollIntoView: boolean }) {
  const aside = useContext(AsideContext)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!scrollIntoView || !stacked() || !ref.current) return
    const el = ref.current
    const t = setTimeout(() => el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }), 260)
    return () => clearTimeout(t)
  }, [scrollIntoView])
  const node = (
    <div className="result-slot" ref={ref}>
      {children}
    </div>
  )
  return aside ? createPortal(node, aside) : node
}
