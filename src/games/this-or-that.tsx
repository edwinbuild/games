import { useEffect, useState } from 'react'
import { getGame } from './registry'
import { guessScore, othersOf, questionFor } from './this-or-that/pick'
import { rpc } from '../shell/api'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { formatCount } from '../shell/live'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Button, Score, Stage } from '../ui'

const game = getGame('this-or-that')
/** Below this many votes the split is shown with a note that it will still move. */
const FEW_VOTES = 20

/** The split when you locked in, your own vote included (the vote endpoint returns it that way). */
type Saved = { choice: 0 | 1; guess: number; a: number; b: number }
/** Distance between two percentages, in percentage points ("4 pts off": short enough for the home card). */
const pts = (off: number) => `${off} ${off === 1 ? 'pt' : 'pts'} off`
type Split = { a: number; b: number }

export default function ThisOrThat() {
  // A challenge from another day shows that day's question, read-only: you can't vote on old days.
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const q = questionFor(day)
  const [saved, setSaved] = useState<Saved | null>(() => (oneOff ? null : loadToday<Saved | null>(game.slug, null)))
  const [choice, setChoice] = useState<0 | 1 | null>(saved?.choice ?? null)
  const [guess, setGuess] = useState(50)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [live, setLive] = useState<Split | null>(null)
  const [fresh, setFresh] = useState(false)

  // Keys 1 and 2 pick an answer on a keyboard.
  useEffect(() => {
    if (saved || oneOff) return
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.closest('input, textarea')) return
      if (e.key === '1') setChoice(0)
      if (e.key === '2') setChoice(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saved, oneOff])
  const optionName = (c: 0 | 1) => (c === 0 ? q.a : q.b)

  // Coming back later the same day: refresh the split without voting again.
  useEffect(() => {
    if (!saved && !oneOff) return
    rpc<{ a: number; b: number }[]>('split', { p_day: dateKey(day), p_question: q.id })
      .then((r) => setLive({ a: Number(r[0]?.a ?? 0), b: Number(r[0]?.b ?? 0) }))
      .catch(() => {})
  }, [saved, oneOff, day, q.id])

  async function lockIn() {
    if (choice == null) return
    setBusy(true)
    setError('')
    try {
      const r = await rpc<{ a: number; b: number }[]>('vote', { p_day: dateKey(day), p_question: q.id, p_choice: choice })
      const split = { a: Number(r[0]?.a ?? 0), b: Number(r[0]?.b ?? 0) }
      const s: Saved = { choice, guess, ...split }
      saveToday(game.slug, s)
      const others = othersOf(split, choice)
      const { off, score } = guessScore(guess, others.a, others.b)
      recordDaily(game.slug, score, new Date(), pts(off))
      if (off <= 10) feel.good()
      else feel.tap()
      setFresh(true)
      setSaved(s)
    } catch {
      setError('Couldn’t reach the results. Check your connection and try again; your answers are still here.')
    } finally {
      setBusy(false)
    }
  }

  // Older day from a challenge: show the question and its final split only.
  if (oneOff) {
    const total = live ? live.a + live.b : 0
    return (
      <Stage>
        <div className="stack">
          <p className="eyebrow muted" style={{ margin: 0 }}>Question from {puzzleLabel(day)}</p>
          <p className="result" style={{ margin: 0 }}>{q.text}</p>
          {live && total > 0 ? <SplitBar a={live.a} b={live.b} labelA={q.a} labelB={q.b} /> : <p className="small muted">No votes were recorded that day.</p>}
          <Button href="/this-or-that/" color={game.color}>Play today’s question</Button>
        </div>
      </Stage>
    )
  }

  if (saved) {
    const split = live ?? { a: saved.a, b: saved.b }
    // Scored against everyone else at the moment you locked in; the bar keeps moving as more people vote.
    const others = othersOf(saved, saved.choice)
    const { actualA, off } = guessScore(saved.guess, others.a, others.b)
    const nobody = others.a + others.b === 0
    const total = split.a + split.b
    const stats = getStats(game.slug)
    return (
      <>
        <Stage>
          <div className="stack">
            <p className="result" style={{ margin: 0 }}>{q.text}</p>
            <SplitBar a={split.a} b={split.b} labelA={q.a} labelB={q.b} guess={saved.guess} />
            <p className="small muted" style={{ margin: 0 }}>
              Live: {formatCount(total)} {total === 1 ? 'vote' : 'votes'} so far today, yours included
              {total < FEW_VOTES ? '. Early votes: the split will still move.' : ''}
            </p>
          </div>
        </Stage>
        <ResultCard
          game={game}
          headline={nobody ? 'First vote of the day' : off === 0 ? 'Read the crowd exactly' : `Within ${off} ${off === 1 ? 'point' : 'points'} of the crowd`}
          detail={<>You picked {optionName(saved.choice).toLowerCase()} · you guessed {saved.guess}% {q.a.toLowerCase()}{nobody ? ', and nobody else had voted yet' : `; when you locked in, ${actualA}% of the other players had`}{stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`🔀 This or That ${puzzleLabel(day)}\n${q.text}\nI picked ${optionName(saved.choice).toLowerCase()}\n${off === 0 ? 'Read the crowd exactly' : `Guessed the crowd within ${off} ${off === 1 ? 'point' : 'points'}`}`}
          finishData={{ off }}
          trackFinish={fresh}
          challenge={{ seed: dateKey(day), score: 100 - off, text: pts(off), lowerIsBetter: false }}
        />
      </>
    )
  }

  return (
    <Stage>
      <div className="stack">
        <p className="eyebrow muted" style={{ margin: 0 }}>Today’s question</p>
        <p className="result" style={{ margin: 0 }}>{q.text}</p>
        <div className="tot-options" role="radiogroup" aria-label="Your answer">
          {([0, 1] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={choice === c}
              className="tot-option"
              onClick={() => { setChoice(c); feel.tap() }}
            >
              {optionName(c)}
              <kbd className="qg-kbd" aria-hidden="true">{c === 0 ? '1' : '2'}</kbd>
            </button>
          ))}
        </div>
        {choice != null && (
          <>
            <label className="eyebrow muted" htmlFor="crowd-guess">How many of today’s players picked {q.a.toLowerCase()}?</label>
            <Score value={`${guess}%`} size="md" />
            <input
              id="crowd-guess"
              type="range"
              min={0}
              max={100}
              value={guess}
              onChange={(e) => setGuess(+e.target.value)}
              style={{ width: '100%', height: 44, accentColor: 'var(--game)' }}
            />
            <Button size="lg" block color={game.color} onClick={lockIn} disabled={busy} data-primary="click" hint="Enter">
              {busy ? 'Counting votes…' : 'Lock in and see the split'}
            </Button>
            {error && <p className="small" style={{ margin: 0, color: 'var(--danger)' }}>{error}</p>}
          </>
        )}
      </div>
    </Stage>
  )
}

/** The crowd's split as one bar, with the player's guess marked. */
function SplitBar({ a, b, labelA, labelB, guess }: { a: number; b: number; labelA: string; labelB: string; guess?: number }) {
  const total = a + b
  const pa = total ? Math.round((a / total) * 100) : 50
  return (
    <div className="tot-split" role="img" aria-label={`${labelA} ${pa}%, ${labelB} ${100 - pa}%${guess != null ? `. Your guess: ${guess}% ${labelA}` : ''}`}>
      <div className="tot-bar">
        <span className="tot-bar-a" style={{ width: `${pa}%` }} />
        {guess != null && <span className="tot-guess" style={{ left: `${guess}%` }} aria-hidden="true" />}
      </div>
      <div className="between">
        <span className="body-strong">{labelA} {pa}%</span>
        <span className="body-strong">{100 - pa}% {labelB}</span>
      </div>
      {guess != null && <span className="small muted">▲ marks your guess: {guess}%</span>}
    </div>
  )
}
