// Crowd charts: a histogram of answers and the split of a few choices.
import { type ReactNode } from 'react'
import { cx, fill } from './util'

/* ---------- Histogram ---------- */
export type HistogramMark = { at: number; label: string; tone?: 'me' | 'guess' | 'crowd' }
export type HistogramProps = {
  /** Counts per bucket, left to right. */
  bins: number[]
  /** Markers at positions 0..1 across the range (your answer, your guess, the average). */
  marks?: HistogramMark[]
  /** Labels under the two ends of the range. */
  min?: ReactNode
  max?: ReactNode
  /** A one-sentence text summary for screen readers (and shown under the chart). */
  summary: string
  /** Bar colour: a game colour token. */
  color?: string
}
/** A small bar chart of how a crowd answered, with markers. */
export function Histogram({ bins, marks = [], min, max, summary, color }: HistogramProps) {
  const top = Math.max(1, ...bins)
  // Labels of markers that sit close together go on separate rows so they never overlap.
  const rows = new Map<string, number>()
  const placed: { at: number; row: number }[] = []
  for (const m of [...marks].sort((a, b) => a.at - b.at)) {
    let row = 0
    while (placed.some((p) => p.row === row && Math.abs(p.at - m.at) < 0.22)) row++
    placed.push({ at: m.at, row })
    rows.set(m.label, row)
  }
  const rowCount = Math.max(1, ...[...rows.values()].map((r) => r + 1))
  return (
    <figure className="qg-hist" style={fill(color)}>
      <div className="qg-hist-plot" role="img" aria-label={summary} style={{ paddingTop: rowCount * 20 + 4 }}>
        {bins.map((b, i) => <span key={i} className="qg-hist-bar" style={{ height: `${(b / top) * 100}%` }} />)}
        {marks.map((m) => (
          <span key={m.label} className={cx('qg-hist-mark', m.tone && `qg-hist-mark--${m.tone}`)} style={{ left: `${Math.max(0, Math.min(1, m.at)) * 100}%` }}>
            <span className="qg-hist-mark-label" style={{ top: (rows.get(m.label) ?? 0) * 20 }}>{m.label}</span>
          </span>
        ))}
      </div>
      {(min != null || max != null) && <div className="qg-hist-axis"><span>{min}</span><span>{max}</span></div>}
      <figcaption className="qg-hist-summary">{summary}</figcaption>
    </figure>
  )
}

/* ---------- SplitBars ---------- */
export type SplitBarsProps = {
  items: { label: ReactNode; count: number; mine?: boolean }[]
  /** Bar colour: a game colour token. */
  color?: string
}
/** How a crowd split across a few choices: one bar per choice with its share, the player's pick marked. */
export function SplitBars({ items, color }: SplitBarsProps) {
  const total = items.reduce((s, i) => s + i.count, 0)
  return (
    <ul className="qg-splitbars" style={fill(color)} aria-label="How everyone picked">
      {items.map((it, i) => {
        const share = total ? (it.count / total) * 100 : 0
        return (
          <li key={i} data-mine={it.mine || undefined}>
            <span className="qg-splitbars-label">{it.label}{it.mine && <span className="qg-splitbars-mine">Your pick</span>}</span>
            <span className="qg-splitbars-track"><span className="qg-splitbars-fill" style={{ width: `${share}%` }} /></span>
            <span className="qg-splitbars-share">{Math.round(share)}%</span>
          </li>
        )
      })}
    </ul>
  )
}

