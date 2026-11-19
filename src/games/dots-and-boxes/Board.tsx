// The board: dots, the lines drawn so far, claimed boxes. Tap near a line to draw it; on a
// keyboard, Tab to a line and press Enter or Space.
import { useRef } from 'react'
import { PLAYERS } from '../../ui'
import { lineEnds, type Player, type State } from './board'

const U = 60
const PAD = 16
const GLYPH = ['●', '■']

export function DotsBoard({ s, canPlay, onPlay, names }: { s: State; canPlay: boolean; onPlay: (e: number) => void; names: [string, string] }) {
  const svg = useRef<SVGSVGElement>(null)
  const w = s.cols * U + PAD * 2, h = s.rows * U + PAD * 2
  const at = (rc: [number, number]) => [PAD + rc[1] * U, PAD + rc[0] * U] as const

  // A tap draws the nearest free line (within half a box).
  function nearest(clientX: number, clientY: number): number | null {
    const r = svg.current!.getBoundingClientRect()
    const x = ((clientX - r.left) / r.width) * w, y = ((clientY - r.top) / r.height) * h
    let best: number | null = null, bestD = U * 0.42
    s.lines.forEach((owner, e) => {
      if (owner != null) return
      const [[ax, ay], [bx, by]] = lineEnds(s.rows, s.cols, e).map(at)
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (U * U)))
      const d = Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay)))
      if (d < bestD) { bestD = d; best = e }
    })
    return best
  }

  const colour = (p: Player) => `var(--${PLAYERS[p].color})`
  return (
    <svg
      ref={svg}
      className={`db-board${canPlay ? ' is-live' : ''}`}
      viewBox={`0 0 ${w} ${h}`}
      role="group"
      aria-label={`Dots and boxes, ${s.rows} by ${s.cols} boxes`}
      data-turn={s.turn}
      onClick={(ev) => { if (!canPlay) return; const e = nearest(ev.clientX, ev.clientY); if (e != null) onPlay(e) }}
    >
      {s.boxes.map((p, b) => {
        if (p == null) return null
        const x = PAD + (b % s.cols) * U, y = PAD + Math.floor(b / s.cols) * U
        return (
          <g key={`b${b}`} className="db-box" aria-label={`${names[p]}'s box`}>
            <rect x={x + 4} y={y + 4} width={U - 8} height={U - 8} rx={8} fill={colour(p)} />
            <text x={x + U / 2} y={y + U / 2} dominantBaseline="central" textAnchor="middle" aria-hidden="true">{GLYPH[p]}</text>
          </g>
        )
      })}
      {s.lines.map((owner, e) => {
        const [[ax, ay], [bx, by]] = lineEnds(s.rows, s.cols, e).map(at)
        if (owner != null) return <line key={e} x1={ax} y1={ay} x2={bx} y2={by} className={`db-line${e === s.last ? ' is-last' : ''}`} style={e === s.last ? { stroke: colour(owner) } : undefined} />
        const [r1, c1] = lineEnds(s.rows, s.cols, e)[0]
        const across = ay === by
        return (
          <g key={e}>
            <line x1={ax} y1={ay} x2={bx} y2={by} className="db-free" />
            <rect
              className="db-hit"
              data-line={e}
              x={across ? ax + 8 : ax - 12} y={across ? ay - 12 : ay + 8}
              width={across ? U - 16 : 24} height={across ? 24 : U - 16} rx={6}
              role="button"
              tabIndex={canPlay ? 0 : -1}
              aria-disabled={!canPlay}
              aria-label={`${across ? 'Line across' : 'Line down'} from row ${r1 + 1}, column ${c1 + 1}`}
              onKeyDown={(ev) => { if (canPlay && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); onPlay(e) } }}
            />
          </g>
        )
      })}
      {Array.from({ length: (s.rows + 1) * (s.cols + 1) }, (_, i) => {
        const [x, y] = at([Math.floor(i / (s.cols + 1)), i % (s.cols + 1)])
        return <circle key={`d${i}`} cx={x} cy={y} r={6} className="db-dot" />
      })}
    </svg>
  )
}
