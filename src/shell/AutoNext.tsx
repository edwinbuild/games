// Under a result: in today's run, "Next: Word Ladder in 5…" (stop any time); in an arcade game,
// "Again in 3…" (any tap or key cancels). Never before the result has been on screen.
import { useEffect, useRef, useState } from 'react'
import { GAMES } from '../games/registry'
import { nextInRun, replayOn, runOn, stopRun } from './autoplay'
import { dateKey } from './daily'
import { Button } from '../ui/components'

const titleOf = (slug: string) => GAMES.find((g) => g.slug === slug)?.title ?? slug

export default function AutoNext({ game, daily, onReplay }: { game: string; daily: boolean; onReplay?: () => void }) {
  const run = daily && runOn() ? nextInRun(game, dateKey()) : null
  const replay = !daily && !!onReplay && replayOn(game)
  const [left, setLeft] = useState(run ? 5 : replay ? 3 : 0)
  const [stopped, setStopped] = useState(false)
  const done = useRef(false)

  // A tap, a key or a scroll anywhere stops an auto replay (the player is doing something else).
  useEffect(() => {
    if (!replay) return
    const stop = () => setStopped(true)
    const t = setTimeout(() => {
      window.addEventListener('pointerdown', stop, { once: true })
      window.addEventListener('keydown', stop, { once: true })
    }, 50)
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', stop); window.removeEventListener('keydown', stop) }
  }, [replay])

  useEffect(() => {
    if (stopped || done.current || (!run?.next && !replay)) return
    if (left <= 0) {
      done.current = true
      if (run?.next) location.href = `/${run.next}/`
      else if (replay) onReplay?.()
      return
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [left, stopped]) // eslint-disable-line react-hooks/exhaustive-deps

  if (run && !run.next) {
    stopRun()
    return <p className="qg-autonext small" role="status">🎉 That’s all of today’s puzzles. See you tomorrow!</p>
  }
  if (run?.next && !stopped) {
    return (
      <div className="qg-autonext" role="status">
        <span>Next in today’s run ({run.at + 1} of {run.of}): <strong>{titleOf(run.next)}</strong> in {left}…</span>
        <span className="row">
          <Button href={`/${run.next}/`}>Go now</Button>
          <Button variant="ghost" onClick={() => { setStopped(true); stopRun() }}>Stop the run</Button>
        </span>
      </div>
    )
  }
  if (replay && !stopped && left > 0) {
    return (
      <div className="qg-autonext" role="status">
        <span>Again in {left}…</span>
        <Button variant="ghost" onClick={() => setStopped(true)}>Stay here</Button>
      </div>
    )
  }
  return null
}
