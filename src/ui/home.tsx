// The home page's pieces: game cards, filter chips and the progress ring.
import { useEffect, useRef, type ReactNode } from 'react'
import { cx, fill } from './util'
import { Pill } from './components'

/* ---------- GameCard ---------- */
export type GameCardProps = {
  /** A small line of numbers under the tagline ("92% liked · 1.2k plays"). */
  meta?: string
  title: string
  tagline: string
  href: string
  color: string
  /** A score in the game's own units, shown on the colour band ("07.30", "243ms"). */
  sample: string
  /** Says whose score it is: "Your best", "Today", or "Example" for a player who hasn't played. */
  sampleLabel?: string
  daily?: boolean
  /** Status line: "Played today · 3-day streak", "New today", "Played 4 times". */
  status?: string
  done?: boolean
  /** Names the band and title for a page transition into the game (matching names on the game page). */
  transitionName?: string
  /** A tag for multiplayer games, shown on the band: "2 players", "Online · 2–8". */
  tag?: string
  /** A short looping scene of the game's key moment, shown on the band (decorative). */
  demo?: ReactNode
}
export function GameCard({ title, tagline, href, color, sample, sampleLabel, daily, status, done, transitionName, tag, demo, meta }: GameCardProps) {
  const pill = (daily || tag) && <Pill tone="neutral">{tag ?? 'Daily'}</Pill>
  return (
    <a className="qg-card" href={href} style={fill(color)}>
      <span className={cx('qg-card-band', demo != null && 'qg-card-band--demo')} style={transitionName ? { viewTransitionName: `band-${transitionName}` } : undefined}>
        <span className="qg-card-score">
          {demo != null && pill}
          {sampleLabel && <span className="qg-card-sample-label">{sampleLabel}</span>}
          <span className={cx('qg-card-sample', sample.length > 7 && 'qg-card-sample--long')}>{sample}</span>
        </span>
        {demo != null ? <span className="qg-card-demo" aria-hidden="true">{demo}</span> : pill}
      </span>
      <span className="qg-card-body">
        <span className="qg-card-title" style={transitionName ? { viewTransitionName: `title-${transitionName}` } : undefined}>{title}</span>
        <span className="qg-card-tag">{tagline}</span>
        {meta && <span className="qg-card-meta">{meta}</span>}
        {status && <span className={cx('qg-card-status', done && 'qg-card-status--done')}>{done ? '✓ ' : ''}{status}</span>}
      </span>
    </a>
  )
}

/* ---------- FilterChips ---------- */
export type FilterChipsProps<T extends string> = {
  /** Names the group for screen readers ("Show games"). */
  label: string
  options: { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
  /** `column` stacks them as a list (a sidebar); the default is one sideways-scrolling row. */
  layout?: 'row' | 'column'
}
/** A row of toggle chips; exactly one is on. Scrolls sideways on narrow screens instead of wrapping. */
export function FilterChips<T extends string>({ label, options, value, onChange, layout = 'row' }: FilterChipsProps<T>) {
  // The chosen chip is always in view, even when it was remembered from last time and sits off the edge.
  const row = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = row.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    const r = row.current
    if (!el || !r) return
    if (el.offsetLeft + el.offsetWidth > r.scrollLeft + r.clientWidth || el.offsetLeft < r.scrollLeft) r.scrollLeft = el.offsetLeft - 8
  }, [value])
  return (
    <div className={cx('qg-filters', layout === 'column' && 'qg-filters--column')} role="group" aria-label={label} ref={row}>
      {options.map((o) => (
        <button key={o.value} type="button" className="qg-filter" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count != null && <span className="qg-filter-count">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* ---------- ProgressRing ---------- */
export type ProgressRingProps = {
  value: number
  max: number
  /** Read out in full ("4 of 19 daily games played today"). */
  label: string
  /** Fill colour token; defaults to the primary colour. */
  color?: string
  size?: number
}
/** A ring that fills to value/max (drawn in on load), with the count in the middle. */
export function ProgressRing({ value, max, label, color, size = 64 }: ProgressRingProps) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  return (
    <span className={cx('qg-ring', pct === 1 && 'qg-ring--full')} style={{ width: size, height: size, ...fill(color) }} role="img" aria-label={label}>
      <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
        <circle className="qg-ring-track" cx="20" cy="20" r="16" pathLength={100} />
        <circle className="qg-ring-fill" cx="20" cy="20" r="16" pathLength={100} style={{ strokeDashoffset: 100 - pct * 100 }} />
      </svg>
      <span className="qg-ring-text" aria-hidden="true">{pct === 1 ? '✓' : <>{value}<small>/{max}</small></>}</span>
    </span>
  )
}

