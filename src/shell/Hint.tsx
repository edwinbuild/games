// Hints for the daily logic games: one tap shows a correct next step. Using one marks the day's
// result "with a hint" and keeps it off today's board (a past day's puzzle has no board anyway).
import { useState } from 'react'
import { Button } from '../ui/components'
import { dateKey } from './daily'
import { load, save } from './storage'

const key = (game: string) => `hint:${game}`
/** Whether a hint was used on today's puzzle. */
export const hintUsed = (game: string): boolean => load<string | null>(key(game), null) === dateKey()
const markUsed = (game: string) => save(key(game), dateKey())

/**
 * The hint key. The first tap today asks once (it keeps the result off the board); after that each
 * tap gives a hint. `oneOff` (an archive or challenge puzzle) asks nothing and records nothing.
 * `onHint` returns false when there's nothing to hint (already right).
 */
export function HintButton({ game, oneOff, onHint, disabled }: { game: string; oneOff: boolean; onHint: () => boolean | void; disabled?: boolean }) {
  const [asking, setAsking] = useState(false)
  const [used, setUsed] = useState(() => !oneOff && hintUsed(game))
  const [none, setNone] = useState(false)
  function go() {
    if (!oneOff && !used && !asking) { setAsking(true); return }
    if (!oneOff && !used) { markUsed(game); setUsed(true) }
    setAsking(false)
    setNone(onHint() === false)
  }
  return (
    <>
      <Button variant="secondary" onClick={go} disabled={disabled} aria-describedby={asking ? 'hint-note' : undefined}>
        {asking ? 'Show a hint' : '💡 Hint'}
      </Button>
      {asking && <p id="hint-note" className="small muted center" role="status" style={{ margin: 0, flexBasis: '100%' }}>A hint keeps today’s result off the board. <button type="button" className="linkish" onClick={() => setAsking(false)}>Never mind</button></p>}
      {none && <p className="small muted center" role="status" style={{ margin: 0, flexBasis: '100%' }}>You’re on the right track: keep going.</p>}
    </>
  )
}
