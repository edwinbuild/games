import { lazy, Suspense, useEffect, useState } from 'react'
import { getGame } from './registry'
import { fromShare, offBy, questionFor, show, toShare, type Question } from './guess-the-crowd/questions'
import { rpc } from '../shell/api'
import { dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Burst, Button, Histogram, Stage } from '../ui'
import { boardKey } from '../shell/board'

const game = getGame('guess-the-crowd')
// The bonus round (and its question list) loads after the result, so the game itself stays small.
const ThisOrThatBonus = lazy(() => import('./guess-the-crowd/ThisOrThatBonus').then((m) => ({ default: m.ThisOrThatBonus })))
/** Below this many answers, the crowd isn't shown: it wouldn't mean much. */
const ENOUGH = 20
/** Within this many percent of the range is a great read of the crowd. */
const GREAT = 3
type Crowd = { n: number; mean: number | null; hist: number[] }
type Saved = { answer: number; guess: number }

export default function GuessTheCrowd() {
  const today = new Date()
  const { id, q } = questionFor(today)
  const [saved, setSaved] = useState<Saved | null>(() => loadToday<Saved | null>(game.slug, null))
  const [step, setStep] = useState<'answer' | 'guess'>('answer')
  const mid = q.min + Math.round((q.max - q.min) / 2 / q.step) * q.step
  const [answer, setAnswer] = useState(mid)
  const [guess, setGuess] = useState(mid)
  const [crowd, setCrowd] = useState<Crowd | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fresh, setFresh] = useState(false)

  // Coming back later today: the crowd has moved on, so read it again.
  useEffect(() => {
    if (!saved || crowd) return
    rpc<Crowd[]>('crowd_numbers', { p_game: game.slug, p_day: dateKey(today), p_question: id }).then((r) => r[0] && setCrowd(r[0]), () => setError('Couldn’t load the crowd right now.'))
  }, [saved]) // eslint-disable-line react-hooks/exhaustive-deps

  async function lockIn() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const r = await rpc<Crowd[]>('crowd_answer', { p_game: game.slug, p_day: dateKey(today), p_question: id, p_value: toShare(q, answer), p_key: boardKey() })
      const s = { answer, guess }
      saveToday(game.slug, s)
      // Answering is today's play (streak), even before the crowd is big enough to score it.
      recordDaily(game.slug, null, new Date(), 'Answered', true)
      setSaved(s)
      setCrowd(r[0])
      setFresh(true)
      feel.click()
      feel.medium()
    } catch {
      setError('Couldn’t send your answer. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  // Record the day's result once the crowd is big enough to mean something.
  const off = saved && crowd && crowd.n >= ENOUGH && crowd.mean != null ? offBy(q, saved.guess, crowd.mean) : null
  useEffect(() => {
    if (off == null) return
    recordDaily(game.slug, off, new Date(), `${off.toFixed(1)}% off`, true)
    if (fresh) { if (off <= GREAT) { feel.chime(4); feel.success() } else feel.thud() }
  }, [off]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!saved) {
    const isAnswer = step === 'answer'
    const v = isAnswer ? answer : guess
    return (
      <Stage>
        <div className="stack">
          <p className="eyebrow muted" style={{ margin: 0 }}>Today · {puzzleLabel(today)} · step {isAnswer ? 1 : 2} of 2</p>
          <h2 className="gc-prompt">{q.prompt}</h2>
          <p className="small muted" style={{ margin: 0 }}>{isAnswer ? 'First, your own answer.' : 'Now guess the average answer of everyone who plays today.'}</p>
          <output className="gc-value" htmlFor="gc-slider">{show(q, v)}</output>
          <input id="gc-slider" className="gc-slider" type="range" min={q.min} max={q.max} step={q.step} value={v}
            aria-label={isAnswer ? 'Your answer' : 'Your guess of the average'}
            onChange={(e) => (isAnswer ? setAnswer(+e.target.value) : setGuess(+e.target.value))} />
          <div className="between small muted"><span>{show(q, q.min)}</span><span>{show(q, q.max)}</span></div>
          {isAnswer ? (
            <Button size="lg" block color={game.color} onClick={() => { setStep('guess'); setGuess(answer); feel.tap() }} data-primary="click" hint="Enter">That’s my answer</Button>
          ) : (
            <div className="stack">
              <Button size="lg" block color={game.color} onClick={lockIn} disabled={busy} data-primary="click" hint="Enter">{busy ? 'Sending…' : 'Lock in my guess'}</Button>
              <Button variant="ghost" onClick={() => setStep('answer')}>Back to my answer ({show(q, answer)})</Button>
            </div>
          )}
          {error && <p className="small" style={{ color: 'var(--danger)', margin: 0 }} role="alert">{error}</p>}
        </div>
      </Stage>
    )
  }

  return <Result q={q} saved={saved} crowd={crowd} off={off} fresh={fresh} error={error} />
}

function Result({ q, saved, crowd, off, fresh, error }: { q: Question; saved: Saved; crowd: Crowd | null; off: number | null; fresh: boolean; error: string }) {
  const today = new Date()
  if (!crowd) return <Stage><p className="body muted center" style={{ margin: 0 }}>{error || 'Loading the crowd…'}</p></Stage>
  const enough = crowd.n >= ENOUGH && crowd.mean != null
  const mean = enough ? fromShare(q, crowd.mean!) : 0
  // Before 20 answers: a provisional score from the answers so far, so nobody waits for one.
  const early = !enough && crowd.mean != null && crowd.n > 1 ? offBy(q, saved.guess, crowd.mean) : null
  const stats = getStats(game.slug)
  return (
    <>
      <Stage style={{ position: 'relative' }}>
        <div className="stack">
          <p className="eyebrow muted" style={{ margin: 0 }}>{q.prompt}</p>
          {enough ? (
            <Histogram
              color={game.color}
              bins={crowd.hist}
              min={show(q, q.min)}
              max={show(q, q.max)}
              marks={[
                { at: toShare(q, saved.answer), label: 'You', tone: 'me' },
                { at: toShare(q, saved.guess), label: 'Your guess', tone: 'guess' },
                { at: crowd.mean!, label: 'Average', tone: 'crowd' },
              ]}
              summary={`${crowd.n.toLocaleString('en')} answers so far. The average is ${show(q, mean)}; you guessed ${show(q, saved.guess)} and answered ${show(q, saved.answer)}.`}
            />
          ) : (
            <p className="body" style={{ margin: 0 }}>
              Only {crowd.n} answer{crowd.n === 1 ? '' : 's'} so far, too few to show the crowd. You answered {show(q, saved.answer)} and guessed {show(q, saved.guess)}.{' '}
              {early != null ? <>So far you’re <strong>{early.toFixed(1)}% off</strong>; the final score comes once 20 people have answered.</> : 'Check back later today to see how close you were.'}
            </p>
          )}
        </div>
        {fresh && off != null && off <= GREAT && <Burst y="40%" color={game.color} />}
      </Stage>
      <ResultCard
        game={game}
        headline={off != null ? `${off.toFixed(1)}% off` : 'Answer saved'}
        detail={off != null ? <>The average is {show(q, mean)}; you guessed {show(q, saved.guess)}{stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</> : 'Results once 20 people have answered'}
        shareText={`👥 Guess the Crowd ${puzzleLabel(today)}\n${q.prompt}\n${off != null ? `My guess was ${off.toFixed(1)}% off the crowd` : 'Can you read the crowd?'}`}
        finishData={{ score: off ?? -1 }}
        trackFinish={fresh}
        challenge={{ seed: dateKey(today), score: off ?? 0, text: off != null ? `${off.toFixed(1)}% off` : 'Answered', lowerIsBetter: true }}
        plainLink
      />
      <Suspense fallback={null}><ThisOrThatBonus color={game.color} /></Suspense>
    </>
  )
}
