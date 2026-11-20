// Profile icons: ink outlines and white fills on a disc of the player's colour (32×32 drawings).
// 25 open to everyone signed in (the ticket is the default), 6 unlocked by playing.
import type { ReactNode } from 'react'

const I = '#111', W = '#fff'
const s = { stroke: I, strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

export const ICONS: Record<string, ReactNode> = {
  ticket: <><path {...s} fill={W} d="M6 10h20a1.5 1.5 0 0 1 1.5 1.5v2.5a2.5 2.5 0 0 0 0 4v2.5A1.5 1.5 0 0 1 26 22H6a1.5 1.5 0 0 1-1.5-1.5V18a2.5 2.5 0 0 0 0-4v-2.5A1.5 1.5 0 0 1 6 10z" /><path {...s} d="M11.5 12v8" strokeDasharray="1.5 2" /><path {...s} d="M15 14h7M15 18h5" /></>,
  cat: <><path {...s} fill={W} d="M8 14 9 6l5 4h4l5-4 1 8c1.5 3 1 6.5-1.5 8.5S19 26 16 26s-6-1-8.5-3.5S6.5 17 8 14z" /><circle cx="12.5" cy="16" r="1.4" fill={I} /><circle cx="19.5" cy="16" r="1.4" fill={I} /><path {...s} d="M15 19.5h2l-1 1.2zM16 20.7v1.3M6 19l4 .5M6 22l4-1M26 19l-4 .5M26 22l-4-1" /></>,
  dog: <><path {...s} fill={W} d="M10 11c2-3 10-3 12 0 2 3 2 9 0 12-2 3-10 3-12 0-2-3-2-9 0-12z" /><path {...s} fill={I} d="M10 11c-3-1-5 2-5 6 0 2 1 3 3 2zM22 11c3-1 5 2 5 6 0 2-1 3-3 2z" /><circle cx="13" cy="16" r="1.4" fill={I} /><circle cx="19" cy="16" r="1.4" fill={I} /><ellipse cx="16" cy="20.5" rx="2" ry="1.4" fill={I} /></>,
  fox: <><path {...s} fill={W} d="M5 8l6 3h10l6-3-2 9-9 9-9-9z" /><path {...s} d="M11 17l5 3 5-3" /><circle cx="12" cy="15" r="1.3" fill={I} /><circle cx="20" cy="15" r="1.3" fill={I} /><circle cx="16" cy="23" r="1.3" fill={I} /></>,
  bear: <><circle {...s} fill={W} cx="9.5" cy="9.5" r="3.5" /><circle {...s} fill={W} cx="22.5" cy="9.5" r="3.5" /><circle {...s} fill={W} cx="16" cy="17" r="9" /><ellipse {...s} fill={W} cx="16" cy="20.5" rx="4" ry="3" /><circle cx="12.5" cy="15" r="1.3" fill={I} /><circle cx="19.5" cy="15" r="1.3" fill={I} /><ellipse cx="16" cy="19.5" rx="1.6" ry="1.1" fill={I} /></>,
  frog: <><circle {...s} fill={W} cx="10.5" cy="11" r="3.5" /><circle {...s} fill={W} cx="21.5" cy="11" r="3.5" /><path {...s} fill={W} d="M5 19c0-5 5-7 11-7s11 2 11 7-5 7-11 7-11-2-11-7z" /><circle cx="10.5" cy="11" r="1.4" fill={I} /><circle cx="21.5" cy="11" r="1.4" fill={I} /><path {...s} d="M11 20c3 2.5 7 2.5 10 0" /></>,
  owl: <><path {...s} fill={W} d="M8 8l3 3h10l3-3v12c0 4-4 7-8 7s-8-3-8-7z" /><circle {...s} fill={W} cx="12.5" cy="15" r="3" /><circle {...s} fill={W} cx="19.5" cy="15" r="3" /><circle cx="12.5" cy="15" r="1.2" fill={I} /><circle cx="19.5" cy="15" r="1.2" fill={I} /><path {...s} fill={I} d="M15 19h2l-1 2z" /></>,
  penguin: <><path {...s} fill={I} d="M16 5c5 0 7 5 7 11s-2 11-7 11-7-5-7-11 2-11 7-11z" /><path {...s} fill={W} d="M16 11c3 0 4.5 3 4.5 7s-1.5 7-4.5 7-4.5-3-4.5-7 1.5-7 4.5-7z" /><circle cx="14" cy="10" r="1.1" fill={W} /><circle cx="18" cy="10" r="1.1" fill={W} /><path {...s} fill="#ffc46b" d="M15 13h2l-1 1.6z" /></>,
  rabbit: <><path {...s} fill={W} d="M11 14c-2-4-2-9 0-10s3 5 3 9M21 14c2-4 2-9 0-10s-3 5-3 9" /><circle {...s} fill={W} cx="16" cy="19" r="7.5" /><circle cx="13" cy="18" r="1.3" fill={I} /><circle cx="19" cy="18" r="1.3" fill={I} /><path {...s} d="M15 21.5h2l-1 1zM16 22.5v1.5" /></>,
  whale: <><path {...s} fill={W} d="M4 18c0-5 5-8 11-8 6 0 10 4 10 8l3-3v7l-3-2c-1 4-6 6-11 6-6 0-10-3-10-8z" /><circle cx="10" cy="17" r="1.3" fill={I} /><path {...s} d="M8 21c3 2 8 2 11 0M14 9c0-2 1-4 3-4M14 9c0-2-1-3-3-3" /></>,
  octopus: <><path {...s} fill={W} d="M7 17c0-6 4-11 9-11s9 5 9 11z" /><path {...s} fill="none" d="M8 17c0 4-2 6-3 7M12 17c0 4-1 7-2 9M16 17v10M20 17c0 4 1 7 2 9M24 17c0 4 2 6 3 7" /><circle cx="13" cy="13" r="1.3" fill={I} /><circle cx="19" cy="13" r="1.3" fill={I} /></>,
  snail: <><path {...s} fill={W} d="M4 24h20c2 0 3-2 3-4l-1-6c0-1-2-1-2 0v5" /><circle {...s} fill={W} cx="14" cy="16" r="7" /><path {...s} d="M14 16a2.5 2.5 0 1 1 2.5 2.5A5 5 0 0 1 11.5 13" /><path {...s} d="M24 11l-1-4M26 11l1-4" /></>,
  bee: <><path {...s} fill={W} d="M12 11c-3-5-9-3-7 1s7 2 7-1zM20 11c3-5 9-3 7 1s-7 2-7-1z" /><ellipse {...s} fill="#ffc46b" cx="16" cy="18" rx="7" ry="8" /><path {...s} d="M9.5 16h13M9.5 21h13" /><path {...s} d="M14 10l-2-4M18 10l2-4" /><path {...s} fill={I} d="M15 26h2l-1 2z" /></>,
  apple: <><path {...s} fill={W} d="M16 11c-3-2-9-1-9 6s4 10 6 10c1.5 0 2-.7 3-.7s1.5.7 3 .7c2 0 6-3 6-10s-6-8-9-6z" /><path {...s} d="M16 11c0-3 1-5 3-6" /><path {...s} fill={W} d="M17 9c1-3 4-4 6-3-1 3-4 4-6 3z" /></>,
  cherry: <><path {...s} fill="none" d="M11 20c1-6 4-11 9-14M21 21c-1-6-1-11-1-15" /><circle {...s} fill={W} cx="10" cy="22" r="4.5" /><circle {...s} fill={W} cx="21" cy="23" r="4.5" /><path {...s} fill={W} d="M20 6c2-2 5-2 7 0-2 2-5 2-7 0z" /></>,
  pear: <><path {...s} fill={W} d="M16 8c2 0 3 2 3 5 0 2 5 4 5 9 0 4-4 6-8 6s-8-2-8-6c0-5 5-7 5-9 0-3 1-5 3-5z" /><path {...s} d="M16 8c0-2 0-3 1-4" /><path {...s} fill={W} d="M17 6c1-2 4-2 5-1-1 2-4 2-5 1z" /></>,
  lemon: <><path {...s} fill="#fbe96a" d="M5 17c0-5 5-9 11-9s11 4 11 9-5 9-11 9-11-4-11-9z" /><path {...s} d="M5 17l-2-.5M27 17l2-.5" /><path {...s} d="M11 14c2-2 6-2 8-1" /></>,
  donut: <><circle {...s} fill={W} cx="16" cy="16" r="10.5" /><path {...s} fill="#ffa391" d="M7 14c1-5 5-8 9-8s8 3 9 8c-1 2-2 1-3 2s0 3-2 3-2-2-4-2-2 2-4 2-1-2-2-3-2 0-3-2z" /><circle {...s} fill={W} cx="16" cy="16" r="3" /><path {...s} d="M11 10l1 1M19 9l1-1M22 13l1 1M13 13l-1 1" /></>,
  cupcake: <><path {...s} fill={W} d="M9 17h14l-2 10H11z" /><path {...s} d="M13 17l.5 10M16 17v10M19 17l-.5 10" /><path {...s} fill="#ffa391" d="M8 17c-1-4 2-6 4-6 0-3 2-5 4-5s4 2 4 5c2 0 5 2 4 6z" /><circle cx="16" cy="5" r="1.6" fill={I} /></>,
  pizza: <><path {...s} fill="#ffc46b" d="M5 8c7-3 15-3 22 0L16 28z" /><path {...s} fill={W} d="M7 11c6-2 12-2 18 0L16 25z" /><circle {...s} fill="#ffa391" cx="13" cy="14" r="1.8" /><circle {...s} fill="#ffa391" cx="19" cy="15" r="1.8" /><circle {...s} fill="#ffa391" cx="16" cy="20" r="1.6" /></>,
  cactus: <><path {...s} fill={W} d="M13 27V8a3 3 0 0 1 6 0v19z" /><path {...s} fill={W} d="M13 19H9a2 2 0 0 1-2-2v-5a1.5 1.5 0 0 1 3 0v4h3M19 16h3v-5a1.5 1.5 0 0 1 3 0v6a2 2 0 0 1-2 2h-4" /><path {...s} d="M9 27h14" /></>,
  mushroom: <><path {...s} fill="#ffa391" d="M4 16c0-6 6-10 12-10s12 4 12 10z" /><path {...s} fill={W} d="M12 16h8l1 9a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2z" /><circle cx="11" cy="11" r="1.6" fill={W} stroke={I} strokeWidth="1.5" /><circle cx="19" cy="10" r="1.6" fill={W} stroke={I} strokeWidth="1.5" /><circle cx="23" cy="13.5" r="1.3" fill={W} stroke={I} strokeWidth="1.5" /></>,
  kite: <><path {...s} fill={W} d="M16 4l8 9-8 11-8-11z" /><path {...s} d="M16 4v20M8 13h16" /><path {...s} fill="none" d="M16 24c-2 2 2 3 0 5" /><path {...s} d="M14 26l-2 1M18 28l2-1" /></>,
  rocket: <><path {...s} fill={W} d="M16 4c4 3 5 8 5 13v5h-10v-5c0-5 1-10 5-13z" /><circle {...s} fill="#b4bdf7" cx="16" cy="13" r="2.5" /><path {...s} fill={W} d="M11 18l-4 4v3l4-2M21 18l4 4v3l-4-2" /><path {...s} fill="#ffc46b" d="M13 22h6l-3 6z" /></>,
  planet: <><circle {...s} fill={W} cx="16" cy="16" r="7.5" /><path {...s} fill="none" d="M9.5 19.5C5 22 3 24.5 4 25.5c1.6 1.6 9-1.5 16-8.5s10-13 8.5-14.5c-1-1-3.5 0-6 2" /><path {...s} d="M13 13l2 1M17 18l2-.5" /></>,
  // Unlocked by playing.
  flame: <><path {...s} fill="#ffa391" d="M16 4c2 5 9 8 9 15a9 9 0 0 1-18 0c0-4 2-6 4-8 0 3 1 4 2 4 0-5 1-8 3-11z" /><path {...s} fill="#fbe96a" d="M16 16c2 2 4 4 4 6.5a4 4 0 0 1-8 0c0-2.5 2-4 4-6.5z" /></>,
  crown: <><path {...s} fill="#fbe96a" d="M5 11l5 5 6-8 6 8 5-5-2 13H7z" /><path {...s} d="M7 24h18" /><circle cx="16" cy="18" r="1.6" fill={I} /><circle cx="10.5" cy="19.5" r="1.2" fill={I} /><circle cx="21.5" cy="19.5" r="1.2" fill={I} /></>,
  trophy: <><path {...s} fill="#fbe96a" d="M10 5h12v6a6 6 0 0 1-12 0z" /><path {...s} fill="none" d="M10 7H6c0 4 2 6 4.5 6.5M22 7h4c0 4-2 6-4.5 6.5" /><path {...s} d="M16 17v4" /><path {...s} fill={W} d="M11 27h10v-3a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2z" /></>,
  comet: <><path {...s} fill="none" d="M4 9l12 7M7 5l11 9M10 3l9 9" /><circle {...s} fill="#fbe96a" cx="21" cy="20" r="6.5" /><path {...s} d="M19 18l1 1M22.5 21.5l1 1" /></>,
  balloons: <><path {...s} fill="#ffa391" d="M11 4c3.5 0 6 3 6 6.5S14 17 11 17s-6-3-6-6.5S7.5 4 11 4z" /><path {...s} fill="#b4bdf7" d="M21 7c3.5 0 6 3 6 6.5S24 20 21 20s-6-3-6-6.5S17.5 7 21 7z" /><path {...s} fill="none" d="M11 17c0 4 3 6 5 10M21 20c0 3-3 4-5 7" /></>,
  medal: <><path {...s} fill="#b4bdf7" d="M10 4h5l3 9h-5zM22 4h-5l-3 9h5z" /><circle {...s} fill="#fbe96a" cx="16" cy="20" r="7" /><path {...s} d="M14 18l2-1.5V24" /></>,
}

/** Icons anyone signed in can pick, in picker order. */
export const OPEN_ICONS = ['ticket', 'cat', 'dog', 'fox', 'bear', 'frog', 'owl', 'penguin', 'rabbit', 'whale', 'octopus', 'snail', 'bee',
  'apple', 'cherry', 'pear', 'lemon', 'donut', 'cupcake', 'pizza', 'cactus', 'mushroom', 'kite', 'rocket', 'planet']
/** Icons earned by playing, with how to earn each (the database checks the same rules). */
export const EARNED_ICONS: { id: string; how: string }[] = [
  { id: 'flame', how: 'Play a daily game 7 days in a row' },
  { id: 'crown', how: 'Play a daily game 30 days in a row' },
  { id: 'trophy', how: 'Play 100 games' },
  { id: 'comet', how: 'Play 20 different games' },
  { id: 'balloons', how: 'Have 3 friends' },
  { id: 'medal', how: 'Finish first on a daily board' },
]
/** Colours a player can pick for their icon (the game colours). */
export const ICON_COLOURS = ['tangerine', 'mint', 'grape', 'sky', 'bubblegum', 'lagoon', 'chili', 'lime', 'coral', 'aqua', 'sand', 'periwinkle',
  'peach', 'orchid', 'pistachio', 'honey', 'lilac', 'apricot', 'seafoam', 'butter', 'blush', 'citrus', 'iris', 'denim', 'glacier', 'sunbeam',
  'sage', 'mauve', 'melon', 'jade', 'poppy', 'nebula', 'olive', 'twilight', 'lemon', 'fern', 'amber', 'salmon']

/** A player's icon on their colour. Unknown icons fall back to the ticket. */
export function Avatar({ icon, colour, size = 32, label }: { icon?: string | null; colour?: string | null; size?: number; label?: string }) {
  return (
    <svg className="qg-avatar" width={size} height={size} viewBox="0 0 32 32" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <circle cx="16" cy="16" r="15" fill={`var(--${colour || 'mint'})`} stroke="var(--edge)" strokeWidth="1.5" />
      <g transform="translate(3.2 3.2) scale(.8)">{ICONS[icon ?? ''] ?? ICONS.ticket}</g>
    </svg>
  )
}
