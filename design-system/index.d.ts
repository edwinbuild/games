import type { ReactNode, CSSProperties, ButtonHTMLAttributes, HTMLAttributes } from 'react'

/** A chunky key. Primary keys fill with `ticket` or a game colour; text is always `on-fill`. */
export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'whatsapp' | 'x'
  size?: 'md' | 'lg'
  block?: boolean
  /** Primary fill: a colour token name such as "mint". Default `ticket`. */
  color?: string
  /** Renders an <a> instead of a <button>. */
  href?: string
  /** Keyboard shortcut shown beside the label only on devices with a mouse ("Space"). */
  hint?: string
  target?: string
  rel?: string
  children: ReactNode
}
export declare function Button(props: ButtonProps): JSX.Element

/** Small uppercase label: Daily, New. */
export interface PillProps { tone?: 'primary' | 'neutral'; color?: string; children: ReactNode }
export declare function Pill(props: PillProps): JSX.Element

/** The placeholder admit-one ticket mark. */
export interface BrandMarkProps { size?: number }
export declare function BrandMark(props: BrandMarkProps): JSX.Element

/** Sticky header: brand mark and site name on the left, Daily pill or custom content on the right. */
export interface TopBarProps { siteName: string; href?: string; daily?: boolean; right?: ReactNode }
export declare function TopBar(props: TopBarProps): JSX.Element

/** The outlined surface a game is played on. `color` fills it with a game colour. */
export interface StageProps extends Omit<HTMLAttributes<HTMLDivElement>, 'color'> {
  children: ReactNode
  color?: string
  flush?: boolean
  className?: string
  style?: CSSProperties
}
export declare function Stage(props: StageProps): JSX.Element

/** A scoreboard number with an optional eyebrow label. */
export interface ScoreProps {
  value: ReactNode
  label?: ReactNode
  size?: 'xl' | 'md'
  tone?: 'default' | 'accent' | 'hidden'
  accentColor?: string
}
export declare function Score(props: ScoreProps): JSX.Element

/** A row of attempt results: hit (✓), near (~), miss (✕) or empty. */
export type Attempt = 'hit' | 'near' | 'miss' | 'empty'
export interface AttemptTilesProps { attempts: Attempt[] }
export declare function AttemptTiles(props: AttemptTilesProps): JSX.Element

/** Ticking countdown to local midnight, for daily games. */
export interface CountdownProps { label?: string; onMidnight?: () => void }
export declare function Countdown(props: CountdownProps): JSX.Element

/** Share, WhatsApp, X and Copy keys for a result. */
export type ShareVia = 'native' | 'whatsapp' | 'x' | 'copy'
export interface ShareButtonsProps { text: string; url: string; onShare?: (via: ShareVia) => void }
export declare function ShareButtons(props: ShareButtonsProps): JSX.Element

/** The perforated result ticket every game ends on. */
export interface ResultTicketProps {
  game: string
  stamp?: string
  color?: string
  headline: ReactNode
  detail?: ReactNode
  shareText: string
  url: string
  onShare?: (via: ShareVia) => void
  /** A challenge leaderboard (`ChallengeBoard`), shown between the result and the share text. */
  board?: ReactNode
  children?: ReactNode
}
export declare function ResultTicket(props: ResultTicketProps): JSX.Element

/** Link to one other game, shown at the bottom of a ticket. */
export interface PlayNextProps { title: string; href: string; color: string; sample: string; onClick?: () => void }
export declare function PlayNext(props: PlayNextProps): JSX.Element

/** A game on the home page: colour band with a sample score, name, tagline and status. */
export interface GameCardProps {
  title: string
  tagline: string
  href: string
  color: string
  sample: string
  /** Whose score the band shows: "Your best", "Today", or "Example" before the player has played. */
  sampleLabel?: string
  daily?: boolean
  status?: string
  done?: boolean
  /** Names the band and title for the page transition into the game (the game page uses band-<name> and title-<name>). */
  transitionName?: string
  /** Tag for multiplayer games on the band ("2 players", "Online · 2–8"). */
  tag?: string
}
export declare function GameCard(props: GameCardProps): JSX.Element

/** A small on/off switch for a site-wide setting, shown in the top bar. Reads "Sound on" / "Sound off". */
export interface ToggleChipProps { label: string; on: boolean; onChange: (on: boolean) => void }
export declare function ToggleChip(props: ToggleChipProps): JSX.Element

/** The quiet row of links under every page. */
export interface FooterProps { links: { label: string; href: string }[]; note?: ReactNode }
export declare function Footer(props: FooterProps): JSX.Element

/** The strip above the stage when a friend's challenge link was opened. */
export interface ChallengeBannerProps { text: ReactNode; color?: string }
export declare function ChallengeBanner(props: ChallengeBannerProps): JSX.Element

/** Everyone who played a challenge link, best first; the player's own row is highlighted. */
export interface BoardRow { name: string; score: string; me?: boolean }
export declare function ChallengeBoard(props: { rows: BoardRow[] }): JSX.Element

/** A labelled single-line text field (the optional challenge nickname). */
export interface TextFieldProps { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number }
export declare function TextField(props: TextFieldProps): JSX.Element

/** A small set of mutually exclusive choices, such as the theme (Auto, Light, Dark). */
export interface SegmentedProps<T extends string> { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }
export declare function Segmented<T extends string>(props: SegmentedProps<T>): JSX.Element

/** The four player identities: colour token, name, shape. */
export declare const PLAYERS: readonly { color: string; name: string; shape: 'circle' | 'square' | 'triangle' | 'diamond' }[]

/** A player's colour, shape and name (P1–P4), optionally with a score. */
export interface PlayerChipProps { player: number; name?: string; detail?: ReactNode }
export declare function PlayerChip(props: PlayerChipProps): JSX.Element

/** Same-phone play: one pressable half per player; with two, the top half faces the far side. */
export interface SplitStageProps { halves: { content: ReactNode; color?: string; label: string }[]; onPress: (half: number) => void; className?: string }
export declare function SplitStage(props: SplitStageProps): JSX.Element

/** An online room's code with Share and Copy link keys. */
export interface RoomCodeProps { code: string; url: string; onShare?: (via: ShareVia) => void }
export declare function RoomCode(props: RoomCodeProps): JSX.Element

/** Who is in an online room and whether they are ready. */
export interface LobbyPlayer { name: string; ready: boolean; me?: boolean; host?: boolean }
export declare function Lobby(props: { players: LobbyPlayer[]; max: number }): JSX.Element

/** Every player's score in a row during play. */
export declare function ScoreStrip(props: { players: { name?: string; score: ReactNode; me?: boolean; player?: number }[] }): JSX.Element

/** A one-shot ring of dots for a payoff moment (new best, perfect move). Hidden with reduced motion. */
export declare function Burst(props: { x?: string; y?: string; color?: string; count?: number }): JSX.Element

/** A small bar chart of how a crowd answered, with markers (your answer, your guess, the average). */
export declare function Histogram(props: { bins: number[]; marks?: { at: number; label: string; tone?: 'me' | 'guess' | 'crowd' }[]; min?: ReactNode; max?: ReactNode; summary: string; color?: string }): JSX.Element

/** Shares of a few choices, one bar each, the player's pick marked. */
export declare function SplitBars(props: { items: { label: ReactNode; count: number; mine?: boolean }[]; color?: string }): JSX.Element
