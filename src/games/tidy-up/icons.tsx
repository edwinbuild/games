import type { ReactNode } from 'react'
import type { Kind } from './rules'

/** Each thing, drawn upright in a 48×48 box. Fills are game colours; `on-fill` outlines. */
export const FILL: Record<Kind, string> = {
  coin: 'honey', button: 'coral', battery: 'lime', pencil: 'tangerine', key: 'sand', heart: 'bubblegum',
  star: 'butter', leaf: 'mint', bolt: 'sky', eraser: 'peach', clip: 'periwinkle', moon: 'lilac',
}

export const SHAPE: Record<Kind, ReactNode> = {
  coin: <><circle cx="24" cy="24" r="17" /><circle cx="24" cy="24" r="11" className="ti-line" /></>,
  button: <><circle cx="24" cy="24" r="17" /><g className="ti-dot"><circle cx="19" cy="19" r="2.6" /><circle cx="29" cy="19" r="2.6" /><circle cx="19" cy="29" r="2.6" /><circle cx="29" cy="29" r="2.6" /></g></>,
  battery: <><rect x="20" y="5" width="8" height="6" rx="1.5" /><rect x="15" y="10" width="18" height="33" rx="3" /><path d="M20 22h8M24 18v8" className="ti-line" /></>,
  pencil: <><path d="M19 5h10v31l-5 9-5-9z" /><path d="M19 12h10M19 36h10" className="ti-line" /></>,
  key: <><circle cx="24" cy="13" r="9" /><rect x="21.5" y="21" width="5" height="22" rx="1" /><path d="M26.5 32h6v4h-6M26.5 38h4v4h-4" /><circle cx="24" cy="12" r="3" className="ti-hole" /></>,
  heart: <path d="M24 41C9 30 7 15 17 11c4-1.6 6 .5 7 3 1-2.5 3-4.6 7-3 10 4 8 19-7 30z" />,
  star: <path d="M24 5l5.6 12 13 1.4-9.8 8.8 2.8 12.8L24 33.6 12.4 40l2.8-12.8-9.8-8.8 13-1.4z" />,
  leaf: <><path d="M10 40C10 21 22 8 40 8c0 18-12 32-30 32z" /><path d="M12 38L34 14" className="ti-line" /></>,
  bolt: <path d="M28 4L11 27h11l-4 17 19-25H26z" />,
  eraser: <><rect x="7" y="15" width="34" height="18" rx="3" /><path d="M17 15v18M31 15v18" className="ti-line" /></>,
  clip: <><path d="M18 14v20a6 6 0 0 0 12 0V11a4.5 4.5 0 0 0-9 0v21" className="ti-wire-o" /><path d="M18 14v20a6 6 0 0 0 12 0V11a4.5 4.5 0 0 0-9 0v21" className="ti-wire" /></>,
  moon: <path d="M23.8 6.0A18 18 0 1 0 41.8 27.0A14 14 0 0 1 23.8 6.0z" />,
}
