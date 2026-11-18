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
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> &
  Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'rel'>

export function Button({ variant = 'primary', size = 'md', block, color, href, className, style, children, target, rel, ...rest }: ButtonProps) {
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
      {label} {on ? 'on' : 'off'}
    </button>
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
    <span className="qg-tiles" role="img" aria-label={attempts.map((a) => TILE_WORD[a]).join(', ')}>
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
  /** Replay key, countdown, Play next, etc. */
  children?: ReactNode
}
export function ResultTicket({ game, stamp, color, headline, detail, shareText, url, onShare, children }: ResultTicketProps) {
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
}
export function GameCard({ title, tagline, href, color, sample, sampleLabel, daily, status, done }: GameCardProps) {
  return (
    <a className="qg-card" href={href} style={fill(color)}>
      <span className="qg-card-band">
        <span className="qg-card-score">
          {sampleLabel && <span className="qg-card-sample-label">{sampleLabel}</span>}
          <span className="qg-card-sample">{sample}</span>
        </span>
        {daily && <Pill tone="neutral">Daily</Pill>}
      </span>
      <span className="qg-card-body">
        <span className="qg-card-title">{title}</span>
        <span className="qg-card-tag">{tagline}</span>
        {status && <span className={cx('qg-card-status', done && 'qg-card-status--done')}>{done ? '✓ ' : ''}{status}</span>}
      </span>
    </a>
  )
}
