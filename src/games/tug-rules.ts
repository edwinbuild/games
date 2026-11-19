/** Steps either side of the middle needed to win. */
export const WIN_STEPS = 20

/** Applies one tap. Rope position: negative toward player 0, positive toward player 1. */
export function pull(pos: number, player: number): number {
  return pos + (player === 0 ? -1 : 1)
}

export function tugWinner(pos: number): number | null {
  if (pos <= -WIN_STEPS) return 0
  if (pos >= WIN_STEPS) return 1
  return null
}

export type Side = 'left' | 'right'
/**
 * Thumbs have to alternate: a tap pulls only if it is on the other side from that player's last
 * tap (the first tap always counts). Mashing one spot does nothing.
 */
export function counts(last: Side | null, side: Side): boolean {
  return last !== side
}
