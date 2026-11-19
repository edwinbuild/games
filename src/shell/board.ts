// Daily leaderboards without accounts. A player is a random key kept in this browser (only its
// hash is stored); the server keeps each player's best score per game and day.
import { counting, rpc } from './api'
import { load, save } from './storage'

/** Daily games with a board (the same list as app.board_rules in the database). */
export const BOARD_GAMES = new Set([
  'blind-timer', 'pitch-match', 'color-recall', 'count-flash', 'flip-grid', 'stack-tower', 'pour-line', 'chain-pop',
  'fair-slice', 'domino-drop', 'beat-keeper', 'pipe-turn', 'light-path', 'steady-line', 'shape-recall', 'paint-mix', 'balance-beam',
])

export type Rank = { rank: number | null; total: number; better_than: number | null }
export type BoardRow = { rank: number; nick: string | null; text: string; mine: boolean }

/** This browser's secret board key (32 hex characters), made on first use. */
export function boardKey(): string {
  let k = load<string>('board-key', '')
  if (!/^[0-9a-f]{32}$/.test(k)) {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    k = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    save('board-key', k)
  }
  return k
}

/** Boards talk to the real database only on the live site, or when a test turns them on (with stand-in functions). */
export const boardsOn = () => counting() || load<boolean>('board-test', false)

export async function submitScore(game: string, day: string, score: number, text: string, nick: string): Promise<Rank> {
  const r = await rpc<Rank[]>('submit_score', { p_game: game, p_day: day, p_key: boardKey(), p_score: score, p_text: text.slice(0, 24), p_nick: nick || null })
  return r[0]
}
export async function myRank(game: string, day: string): Promise<Rank> {
  const r = await rpc<Rank[]>('my_rank', { p_game: game, p_day: day, p_key: boardKey() })
  return r[0]
}
export const dailyBoard = (game: string, day: string) => rpc<BoardRow[]>('daily_board', { p_game: game, p_day: day, p_key: boardKey() })
