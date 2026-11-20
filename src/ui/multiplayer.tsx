// Players and online rooms: player identities, the same-phone split stage, room code, lobby and score strip.
import { useState, type ReactNode } from 'react'
import { cx, fill } from './util'
import { Button, type ShareVia } from './components'

/* ---------- Players ---------- */
/** Four player identities: a colour token, a name and a shape, so colour is never the only signal. */
export const PLAYERS = [
  { color: 'coral', name: 'Coral', shape: 'circle' },
  { color: 'aqua', name: 'Aqua', shape: 'square' },
  { color: 'lime', name: 'Lime', shape: 'triangle' },
  { color: 'orchid', name: 'Orchid', shape: 'diamond' },
  { color: 'sky', name: 'Sky', shape: 'star' },
  { color: 'sand', name: 'Sand', shape: 'hexagon' },
  { color: 'peach', name: 'Peach', shape: 'plus' },
  { color: 'periwinkle', name: 'Periwinkle', shape: 'pentagon' },
] as const

function Shape({ shape }: { shape: (typeof PLAYERS)[number]['shape'] }) {
  const d = {
    circle: <circle cx="8" cy="8" r="6" />,
    square: <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />,
    triangle: <path d="M8 2l6.5 11.5h-13z" />,
    diamond: <path d="M8 1.5l6.5 6.5-6.5 6.5-6.5-6.5z" />,
    star: <path d="M8 1.2l2 4.3 4.7.5-3.5 3.2 1 4.6L8 11.4l-4.2 2.4 1-4.6-3.5-3.2 4.7-.5z" />,
    hexagon: <path d="M8 1.5l5.6 3.25v6.5L8 14.5l-5.6-3.25v-6.5z" />,
    plus: <path d="M6 2h4v4h4v4h-4v4H6v-4H2V6h4z" />,
    pentagon: <path d="M8 1.5l6.5 4.7-2.5 7.8H4l-2.5-7.8z" />,
  }[shape]
  return (
    <svg className="qg-shape" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="var(--on-fill)">
      {d}
    </svg>
  )
}

export type PlayerChipProps = {
  /** Player number from 0 to 3. */
  player: number
  /** A nickname to show instead of the colour name. */
  name?: string
  /** Extra text after the name, such as a score or "ready". */
  detail?: ReactNode
}
export function PlayerChip({ player, name, detail }: PlayerChipProps) {
  const p = PLAYERS[player % PLAYERS.length]
  return (
    <span className="qg-player" style={fill(p.color)}>
      <Shape shape={p.shape} />
      <span className="qg-player-name">{name || p.name}</span>
      {detail != null && <span className="qg-player-detail">{detail}</span>}
    </span>
  )
}

/* ---------- SplitStage ---------- */
export type SplitStageProps = {
  /** One entry per player (2 or 3). The first half faces the far side of the phone when there are two. */
  halves: { content: ReactNode; color?: string; label: string }[]
  /** Called on pointer down in a half (each finger counts separately), with which side of that half was hit. */
  onPress: (half: number, side: 'left' | 'right') => void
  className?: string
}
export function SplitStage({ halves, onPress, className }: SplitStageProps) {
  return (
    <div className={cx('qg-split', halves.length === 2 && 'qg-split--two', className)}>
      {halves.map((h, i) => (
        <div
          key={i}
          className="qg-split-half"
          role="button"
          tabIndex={-1}
          aria-label={h.label}
          style={fill(h.color ?? PLAYERS[i].color)}
          onPointerDown={(e) => {
            e.preventDefault()
            const r = e.currentTarget.getBoundingClientRect()
            onPress(i, e.clientX < r.left + r.width / 2 ? 'left' : 'right')
          }}
        >
          {h.content}
        </div>
      ))}
    </div>
  )
}

/* ---------- RoomCode ---------- */
export type RoomCodeProps = { code: string; url: string; onShare?: (via: ShareVia) => void }
export function RoomCode({ code, url, onShare }: RoomCodeProps) {
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  return (
    <div className="qg-room">
      <span className="qg-room-label">Room code</span>
      <span className="qg-room-code" aria-label={`Room code ${code.split('').join(' ')}`}>{code}</span>
      <div className="row">
        {canShare && <Button onClick={() => navigator.share({ text: `Join my room on Pocket Fair: ${code}`, url }).then(() => onShare?.('native'), () => {})}>Share link</Button>}
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url)
              setCopied(true)
              onShare?.('copy')
              setTimeout(() => setCopied(false), 1800)
            } catch {
              /* the code is on screen to read out */
            }
          }}
        >
          {copied ? 'Link copied ✓' : 'Copy link'}
        </Button>
      </div>
    </div>
  )
}

/* ---------- Lobby ---------- */
export type LobbyPlayer = { name: string; ready: boolean; me?: boolean; host?: boolean; /** A signed-in player's icon, shown before their name. */ avatar?: ReactNode }
export function Lobby({ players, max }: { players: LobbyPlayer[]; max: number }) {
  return (
    <ul className="qg-lobby" aria-label="Players in the room">
      {players.map((p, i) => (
        <li key={i} data-me={p.me || undefined}>
          {p.avatar}
          <PlayerChip player={i} name={p.me ? `${p.name || PLAYERS[i % PLAYERS.length].name} (you)` : p.name} />
          <span className="qg-lobby-state">{p.host ? 'Host · ' : ''}{p.ready ? 'Ready ✓' : 'Not ready'}</span>
        </li>
      ))}
      {max <= 4
        ? Array.from({ length: Math.max(0, max - players.length) }, (_, i) => (
            <li key={`empty-${i}`} className="qg-lobby-empty">Waiting for a player…</li>
          ))
        : players.length < max && <li className="qg-lobby-empty">Room for {max - players.length} more</li>}
    </ul>
  )
}

/* ---------- ScoreStrip ---------- */
export function ScoreStrip({ players }: { players: { name?: string; score: ReactNode; me?: boolean; player?: number }[] }) {
  return (
    <div className="qg-scorestrip" aria-live="polite">
      {players.map((p, i) => (
        <PlayerChip key={i} player={p.player ?? i} name={p.me ? 'You' : p.name} detail={p.score} />
      ))}
    </div>
  )
}

