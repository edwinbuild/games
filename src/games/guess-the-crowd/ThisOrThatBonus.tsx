// Guess the Crowd's bonus round: today's two-way question (it used to be its own game, This or That).
// Pick a side, guess how the other players split, see the live split. Not scored in the day's result.
import { useEffect, useState } from 'react'
import { guessScore, othersOf, questionFor } from '../this-or-that/pick'
import { rpc } from '../../shell/api'
import { dateKey } from '../../shell/daily'
import { feel } from '../../shell/feel'
import { formatCount } from '../../shell/live'
import { loadToday, saveToday } from '../../shell/stats'
import { Button, Score, Stage } from '../../ui'

/** Kept under the old game's name, so a vote cast before the merge still counts as today's. */
const KEY = 'this-or-that'
type Saved = { choice: 0 | 1; guess: number; a: number; b: number }
type Split = { a: number; b: number }

export function ThisOrThatBonus({ color }: { color: string }) {
  const day = new Date()
  const q = questionFor(day)
  const [saved, setSaved] = useState<Saved | null>(() => loadToday<Saved | null>(KEY, null))
  const [choice, setChoice] = useState<0 | 1 | null>(null)
  const [guess, setGuess] = useState(50)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [live, setLive] = useState<Split | null>(null)
  const name = (c: 0 | 1) => (c === 0 ? q.a : q.b)

  // Coming back later: refresh the split without voting again.
  useEffect(() => {
    if (!saved) return
    rpc<Split[]>('split', { p_day: dateKey(day), p_question: q.id }).then((r) => setLive({ a: Number(r[0]?.a ?? 0), b: Number(r[0]?.b ?? 0) }), () => {})
  }, [saved, q.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function lockIn() {
    if (choice == null || busy) return
    setBusy(true)
    setError('')
    try {
      const r = await rpc<Split[]>('vote', { p_day: dateKey(day), p_question: q.id, p_choice: choice })
      const s: Saved = { choice, guess, a: Number(r[0]?.a ?? 0), b: Number(r[0]?.b ?? 0) }
      saveToday(KEY, s)
      setSaved(s)
      feel.tap()
    } catch {
      setError('Couldn’t reach the results. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stage className="tot-bonus">
      <div className="stack">
        <p className="eyebrow muted" style={{ margin: 0 }}>Bonus · This or That</p>
        <p className="result" style={{ margin: 0 }}>{q.text}</p>
        {saved ? (() => {
          const split = live ?? { a: saved.a, b: saved.b }
          const others = othersOf(saved, saved.choice)
          const { actualA, off } = guessScore(saved.guess, others.a, others.b)
          const total = split.a + split.b
          const pa = total ? Math.round((split.a / total) * 100) : 50
          return (
            <>
              <div className="tot-split" role="img" aria-label={`${q.a} ${pa}%, ${q.b} ${100 - pa}%. Your guess: ${saved.guess}% ${q.a}`}>
                <div className="tot-bar">
                  <span className="tot-bar-a" style={{ width: `${pa}%` }} />
                  <span className="tot-guess" style={{ left: `${saved.guess}%` }} aria-hidden="true" />
                </div>
                <div className="between"><span className="body-strong">{q.a} {pa}%</span><span className="body-strong">{100 - pa}% {q.b}</span></div>
              </div>
              <p className="small muted" style={{ margin: 0 }}>
                You picked {name(saved.choice).toLowerCase()} and guessed {saved.guess}% {q.a.toLowerCase()}:{' '}
                {others.a + others.b === 0 ? 'nobody else had voted yet.' : off === 0 ? 'exactly right.' : `${off} ${off === 1 ? 'point' : 'points'} off (${actualA}% of the others when you voted).`}
                {' '}{formatCount(total)} {total === 1 ? 'vote' : 'votes'} so far.
              </p>
            </>
          )
        })() : (
          <>
            <div className="tot-options" role="radiogroup" aria-label="Your answer">
              {([0, 1] as const).map((c) => (
                <button key={c} type="button" role="radio" aria-checked={choice === c} className="tot-option" onClick={() => { setChoice(c); feel.tap() }}>{name(c)}</button>
              ))}
            </div>
            {choice != null && (
              <>
                <label className="eyebrow muted" htmlFor="tot-guess">How many of the others picked {q.a.toLowerCase()}?</label>
                <Score value={`${guess}%`} size="md" />
                <input id="tot-guess" type="range" min={0} max={100} value={guess} onChange={(e) => setGuess(+e.target.value)} style={{ width: '100%', height: 44, accentColor: `var(--${color})` }} />
                <Button block color={color} onClick={lockIn} disabled={busy}>{busy ? 'Counting votes…' : 'Lock in and see the split'}</Button>
              </>
            )}
            {error && <p className="small" style={{ margin: 0, color: 'var(--danger)' }}>{error}</p>}
          </>
        )}
      </div>
    </Stage>
  )
}
