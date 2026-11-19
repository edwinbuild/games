import { useEffect, useState, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
/** A colour for a component: a token name ("tangerine") or any CSS colour. */
/** Fills with a game colour; text on it switches to `on-fill`. Without a colour, components use `primary`. */
const fill = (color?: string): CSSProperties | undefined =>
  color
    ? ({ ['--qg-fill' as string]: /^[a-z-]+$/.test(color) ? `var(--${color})` : color, ['--qg-on' as string]: 'var(--on-fill)' } as CSSProperties)
    : undefined

/* ---------- Button ---------- */
export type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'whatsapp' | 'x'
  size?: 'md' | 'lg'
  block?: boolean
  /** Fill colour for a primary key: a colour token name such as "mint". Defaults to `primary` (black in light, white in dark). */
  color?: string
  /** Renders a link instead of a button. */
  href?: string
  /** Keyboard shortcut shown beside the label on devices with a mouse, e.g. "Space". */
  hint?: string
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> &
  Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'rel'>

export function Button({ variant = 'primary', size = 'md', block, color, href, hint, className, style, children, target, rel, ...rest }: ButtonProps) {
  const cls = cx('qg-key', variant !== 'primary' && `qg-key--${variant}`, size === 'lg' && 'qg-key--lg', block && 'qg-key--block', className)
  const st = { ...fill(variant === 'primary' ? color : undefined), ...style }
  if (href) {
    return (
      <a className={cls} style={st} href={href} target={target} rel={rel} onClick={rest.onClick as never}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" className={cls} style={st} {...rest}>
      {children}
      {hint && <kbd className="qg-kbd" aria-hidden="true">{hint}</kbd>}
    </button>
  )
}

/* ---------- Pill ---------- */
export type PillProps = { tone?: 'primary' | 'neutral'; color?: string; children: ReactNode }
export function Pill({ tone = 'primary', color, children }: PillProps) {
  return (
    <span className={cx('qg-pill', tone === 'neutral' && 'qg-pill--neutral')} style={fill(color)}>
      {children}
    </span>
  )
}

/* ---------- BrandMark ---------- */
/** The placeholder mark: an admit-one ticket with a notch on each side. */
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg className="qg-brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M4 7h24a2 2 0 0 1 2 2v4a3 3 0 0 0 0 6v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a3 3 0 0 0 0-6V9a2 2 0 0 1 2-2z"
        fill="var(--primary)" stroke="var(--edge)" strokeWidth="2" strokeLinejoin="round"
      />
      <path d="M11 9.5v13" stroke="var(--edge)" strokeWidth="2" strokeDasharray="2 2.5" />
      <path d="M17 12.5h7M17 16h5M17 19.5h7" stroke="var(--on-primary)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/* ---------- ToggleChip ---------- */
export type ToggleChipProps = {
  /** What the switch controls, e.g. "Sound". The chip reads "Sound on" / "Sound off". */
  label: string
  on: boolean
  onChange: (on: boolean) => void
}
export function ToggleChip({ label, on, onChange }: ToggleChipProps) {
  return (
    <button type="button" className="qg-chip" aria-pressed={on} onClick={() => onChange(!on)}>
      {label}
      <span className="qg-chip-state"> {on ? 'on' : 'off'}</span>
    </button>
  )
}

/* ---------- Segmented ---------- */
export type SegmentedProps<T extends string> = {
  /** What the choice is about, for screen readers ("Theme"). */
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}
export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <span className="qg-segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </span>
  )
}

/* ---------- TopBar ---------- */
export type TopBarProps = { siteName: string; href?: string; daily?: boolean; right?: ReactNode }
export function TopBar({ siteName, href = '/', daily, right }: TopBarProps) {
  return (
    <header className="qg-topbar">
      <a className="qg-brand" href={href}>
        <BrandMark />
        {siteName}
      </a>
      <span className="qg-topbar-right">
        {daily && <Pill>Daily</Pill>}
        {right}
      </span>
    </header>
  )
}

/* ---------- Stage ---------- */
export type StageProps = {
  children: ReactNode
  /** Fill the stage with a colour (e.g. the reaction panel turning green). Token name or CSS colour. */
  color?: string
  flush?: boolean
  className?: string
  style?: CSSProperties
} & Omit<HTMLAttributes<HTMLDivElement>, 'color'>
export function Stage({ children, color, flush, className, style, ...rest }: StageProps) {
  return (
    <div className={cx('qg-stage', flush && 'qg-stage--flush', color && 'qg-stage--fill', className)} style={{ ...fill(color), ...style }} {...rest}>
      {children}
    </div>
  )
}

/* ---------- Score ---------- */
export type ScoreProps = {
  value: ReactNode
  label?: ReactNode
  size?: 'xl' | 'md'
  /** `hidden` dims the number (Blind Timer's ??.??); `accent` colours it with `accentColor`. */
  tone?: 'default' | 'accent' | 'hidden'
  accentColor?: string
}
export function Score({ value, label, size = 'xl', tone = 'default', accentColor }: ScoreProps) {
  return (
    <div
      className={cx('qg-score', size === 'md' && 'qg-score--md', tone !== 'default' && `qg-score--${tone}`)}
      style={accentColor ? ({ ['--qg-accent' as string]: /^[a-z-]+$/.test(accentColor) ? `var(--${accentColor})` : accentColor } as CSSProperties) : undefined}
    >
      {label && <span className="qg-score-label">{label}</span>}
      <span className="qg-score-value">{value}</span>
    </div>
  )
}

/* ---------- AttemptTiles ---------- */
export type Attempt = 'hit' | 'near' | 'miss' | 'empty'
const TILE_GLYPH: Record<Attempt, string> = { hit: '✓', near: '~', miss: '✕', empty: '' }
const TILE_WORD: Record<Attempt, string> = { hit: 'close', near: 'near', miss: 'far off', empty: 'not played' }
export function AttemptTiles({ attempts }: { attempts: Attempt[] }) {
  return (
    <span className={cx('qg-tiles', attempts.length > 6 && 'qg-tiles--compact')} role="img" aria-label={attempts.map((a) => TILE_WORD[a]).join(', ')}>
      {attempts.map((a, i) => (
        <span key={i} className={`qg-tile qg-tile--${a}`}>{TILE_GLYPH[a]}</span>
      ))}
    </span>
  )
}

/* ---------- Countdown ---------- */
function msToMidnight(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()
}
export type CountdownProps = { label?: string; onMidnight?: () => void }
export function Countdown({ label = 'Next one in', onMidnight }: CountdownProps) {
  const [ms, setMs] = useState(msToMidnight)
  useEffect(() => {
    const id = setInterval(() => {
      setMs((prev) => {
        const left = msToMidnight()
        if (left > prev + 1000) onMidnight?.()
        return left
      })
    }, 1000)
    return () => clearInterval(id)
  }, [onMidnight])
  const s = Math.floor(ms / 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    <p className="qg-countdown">
      {label} <strong>{p(Math.floor(s / 3600))}:{p(Math.floor((s % 3600) / 60))}:{p(s % 60)}</strong>
    </p>
  )
}

/* ---------- ShareButtons ---------- */
export type ShareVia = 'native' | 'whatsapp' | 'x' | 'copy'
export type ShareButtonsProps = { text: string; url: string; onShare?: (via: ShareVia) => void }
export function ShareButtons({ text, url, onShare }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`
  const x = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setCopied(true)
      onShare?.('copy')
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard refused; the text is visible above to copy by hand */
    }
  }
  return (
    <div className="qg-share">
      {canShare && (
        <Button onClick={() => navigator.share({ text, url }).then(() => onShare?.('native'), () => {})}>Share</Button>
      )}
      <Button variant="whatsapp" href={wa} target="_blank" rel="noopener" onClick={() => onShare?.('whatsapp')}>WhatsApp</Button>
      <Button variant="x" href={x} target="_blank" rel="noopener" onClick={() => onShare?.('x')}>X</Button>
      <Button variant="secondary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</Button>
    </div>
  )
}

/* ---------- ResultTicket ---------- */
export type ResultTicketProps = {
  /** Game name, printed on the stub. */
  game: string
  /** Right side of the stub: puzzle number or date. */
  stamp?: string
  /** Game colour for the stub (token name). */
  color?: string
  headline: ReactNode
  detail?: ReactNode
  /** Exactly what gets shared, without the link. */
  shareText: string
  url: string
  onShare?: (via: ShareVia) => void
  /** A challenge leaderboard, shown between the result and the share text. */
  board?: ReactNode
  /** Replay key, countdown, Play next, etc. */
  children?: ReactNode
}
export function ResultTicket({ game, stamp, color, headline, detail, shareText, url, onShare, board, children }: ResultTicketProps) {
  return (
    <section className="qg-ticket" style={fill(color)} aria-live="polite">
      <div className="qg-ticket-stub">
        <span>{game}</span>
        {stamp && <span>{stamp}</span>}
      </div>
      <div className="qg-perf" aria-hidden="true" />
      <div className="qg-ticket-body">
        <p className="qg-ticket-headline">{headline}</p>
        {detail && <p className="qg-ticket-detail">{detail}</p>}
        {board}
        <pre className="qg-share-text">{shareText}</pre>
        <ShareButtons text={shareText} url={url} onShare={onShare} />
        {children}
      </div>
    </section>
  )
}

/* ---------- PlayNext ---------- */
export type PlayNextProps = { title: string; href: string; color: string; sample: string; onClick?: () => void }
export function PlayNext({ title, href, color, sample, onClick }: PlayNextProps) {
  return (
    <a className="qg-next" href={href} style={fill(color)} onClick={onClick}>
      <span className="qg-next-chip" aria-hidden="true">{sample}</span>
      <span>
        <span className="qg-next-eyebrow">Play next</span>
        <br />
        <span className="qg-next-title">{title}</span>
      </span>
    </a>
  )
}

/* ---------- Footer ---------- */
export type FooterProps = { links: { label: string; href: string }[]; note?: ReactNode }
export function Footer({ links, note }: FooterProps) {
  return (
    <footer className="qg-footer">
      {links.map((l) => (
        <a key={l.href} href={l.href}>{l.label}</a>
      ))}
      {note && <span>{note}</span>}
    </footer>
  )
}

/* ---------- ChallengeBanner ---------- */
export type ChallengeBannerProps = {
  /** The challenge in one line: "Sam was 0.04s off. Same puzzle, your turn." */
  text: ReactNode
  /** Game colour for the banner (token name). Defaults to `primary`. */
  color?: string
}
export function ChallengeBanner({ text, color }: ChallengeBannerProps) {
  return (
    <div className="qg-banner" style={fill(color)} role="status">
      <span className="qg-banner-eyebrow">Challenge</span>
      <span className="qg-banner-text">{text}</span>
    </div>
  )
}

/* ---------- ChallengeBoard ---------- */
export type BoardRow = { name: string; score: string; me?: boolean }
export function ChallengeBoard({ rows }: { rows: BoardRow[] }) {
  return (
    <ol className="qg-board" aria-label="Everyone who played this challenge">
      {rows.map((r, i) => (
        <li key={i} data-me={r.me || undefined}>
          <span className="qg-board-rank">{i + 1}</span>
          <span className="qg-board-name">{r.name}</span>
          <span className="qg-board-score">{r.score}</span>
        </li>
      ))}
    </ol>
  )
}

/* ---------- TextField ---------- */
export type TextFieldProps = {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
}
export function TextField({ id, label, value, onChange, placeholder, maxLength }: TextFieldProps) {
  return (
    <div className="qg-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} placeholder={placeholder} maxLength={maxLength} autoComplete="nickname" onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

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
  /** Called on pointer down in a half (each finger counts separately). */
  onPress: (half: number) => void
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
            onPress(i)
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
export type LobbyPlayer = { name: string; ready: boolean; me?: boolean; host?: boolean }
export function Lobby({ players, max }: { players: LobbyPlayer[]; max: number }) {
  return (
    <ul className="qg-lobby" aria-label="Players in the room">
      {players.map((p, i) => (
        <li key={i} data-me={p.me || undefined}>
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

/* ---------- GameCard ---------- */
export type GameCardProps = {
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
export function GameCard({ title, tagline, href, color, sample, sampleLabel, daily, status, done, transitionName, tag, demo }: GameCardProps) {
  const pill = (daily || tag) && <Pill tone="neutral">{tag ?? 'Daily'}</Pill>
  return (
    <a className="qg-card" href={href} style={fill(color)}>
      <span className={cx('qg-card-band', demo != null && 'qg-card-band--demo')} style={transitionName ? { viewTransitionName: `band-${transitionName}` } : undefined}>
        <span className="qg-card-score">
          {demo != null && pill}
          {sampleLabel && <span className="qg-card-sample-label">{sampleLabel}</span>}
          <span className="qg-card-sample">{sample}</span>
        </span>
        {demo != null ? <span className="qg-card-demo" aria-hidden="true">{demo}</span> : pill}
      </span>
      <span className="qg-card-body">
        <span className="qg-card-title" style={transitionName ? { viewTransitionName: `title-${transitionName}` } : undefined}>{title}</span>
        <span className="qg-card-tag">{tagline}</span>
        {status && <span className={cx('qg-card-status', done && 'qg-card-status--done')}>{done ? '✓ ' : ''}{status}</span>}
      </span>
    </a>
  )
}

/* ---------- Burst ---------- */
export type BurstProps = {
  /** Where the burst starts, inside the nearest positioned parent. Defaults to the centre. */
  x?: string
  y?: string
  /** Dot colour: a game colour token. Half the dots use it, half use `on-fill`. */
  color?: string
  /** How many dots (12–20). */
  count?: number
}
/** A small one-shot burst of dots for a payoff moment, such as a new best. Hidden with reduced motion. */
export function Burst({ x = '50%', y = '50%', color, count = 16 }: BurstProps) {
  const n = Math.max(12, Math.min(20, count))
  return (
    <span className="qg-burst" style={{ left: x, top: y, ...fill(color) }} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * 2 * Math.PI + (i % 2 ? 0.2 : 0)
        const r = 34 + (i % 3) * 14
        return <span key={i} className={i % 2 ? 'qg-burst-dot qg-burst-dot--ink' : 'qg-burst-dot'} style={{ '--dx': `${Math.round(Math.cos(a) * r)}px`, '--dy': `${Math.round(Math.sin(a) * r)}px`, animationDelay: `${(i % 4) * 25}ms` } as CSSProperties} />
      })}
    </span>
  )
}

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
