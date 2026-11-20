// Small helpers shared by the components.
import type { CSSProperties } from 'react'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
/** A colour for a component: a token name ("tangerine") or any CSS colour. */
/** Fills with a game colour; text on it switches to `on-fill`. Without a colour, components use `primary`. */
export const fill = (color?: string): CSSProperties | undefined =>
  color
    ? ({ ['--qg-fill' as string]: /^[a-z-]+$/.test(color) ? `var(--${color})` : color, ['--qg-on' as string]: 'var(--on-fill)' } as CSSProperties)
    : undefined

