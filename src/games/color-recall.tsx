import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { css, matchScore, type Hsl } from './color-recall/color'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dailyRandom, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { AttemptTiles, Button, Score, Stage, type Attempt } from '../ui'

const game = getGame('color-recall')
const ROUNDS = 3
const SHOW_MS = 2000

/** Today's three colours, the same for everyone; saturated enough and not too dark or pale to remember. */
export function coloursFor(d = new Date()): Hsl[] {
  const r = dailyRandom(game.slug, d)
  return Array.from({ length: ROUNDS }, () => ({ h: Math.round(r() * 360), s: Math.round(35 + r() * 55), l: Math.round(30 + r() * 45) }))
}

const grade = (score: number): Attempt => (score >= 90 ? 'hit' : score >= 75 ? 'near' : 'miss')
const square = (score: number) => ({ hit: '🟩', near: '🟨', miss: '🟥', empty: '⬜' })[grade(score)]
const average = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
const randomStart = (): Hsl => ({ h: Math.round(Math.random() * 360), s: 50, l: 50 })

type Phase = 'ready' | 'show' | 'match' | 'compare'

export default function ColorRecall() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const targets = coloursFor(day)
  // Every finished try is a list of three scores; the best try counts.
  const [tries, setTries] = useState<number[][]>(() => (oneOff ? [] : loadToday(game.slug, [] as number[][])))
  const [current, setCurrent] = useState<number[]>([])
  const [phase, setPhase] = useState<Phase>(tries.length ? 'compare' : 'ready')
  const [guess, setGuess] = useState<Hsl>(randomStart)
  const [left, setLeft] = useState(SHOW_MS)
  const [fresh, setFresh] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)
  useEffect(() => () => clearInterval(timer.current), [])

  const round = current.length
  const done = phase === 'compare' && current.length === 0 && tries.length > 0
  const target = targets[Math.min(round, ROUNDS - 1)]

  function show() {
    setPhase('show')
    setGuess(randomStart())
    const start = performance.now()
    setLeft(SHOW_MS)
    clearInterval(timer.current)
    timer.current = setInterval(() => {
      const l = SHOW_MS - (performance.now() - start)
      if (l <= 0) {
        clearInterval(timer.current)
        setPhase('match')
      } else setLeft(l)
    }, 50)
  }

  function lockIn() {
    const { score } = matchScore(target, guess)
    if (score >= 90) feel.good()
    else if (score < 75) feel.bad()
    else feel.tap()
    const next = [...current, score]
    if (next.length < ROUNDS) {
      setCurrent(next)
      setPhase('compare')
      return
    }
    const all = [...tries, next]
    setTries(all)
    setCurrent([])
    setLastTry(next)
    setPhase('compare')
    if (!oneOff) {
      saveToday(game.slug, all)
      const best = Math.max(...all.map(average))
      recordDaily(game.slug, best, new Date(), `${best}%`)
    }
    setFresh(true)
  }
  const [lastTry, setLastTry] = useState<number[] | null>(tries.length ? tries[tries.length - 1] : null)

  // Between rounds: show both colours side by side.
  if (phase === 'compare' && current.length > 0) {
    const prev = targets[current.length - 1]
    const s = current[current.length - 1]
    return (
      <Stage>
        <div className="stack">
          <div className="cr-compare">
            <div><span className="cr-swatch" style={{ background: css(prev) }} /><span className="small muted">The colour</span></div>
            <div><span className="cr-swatch" style={{ background: css(guess) }} /><span className="small muted">Yours</span></div>
          </div>
          <p className="result" style={{ margin: 0 }}>{s}% match</p>
          <Button size="lg" block color={game.color} onClick={show} data-primary="click" hint="Space">
            Next colour ({current.length + 1} of {ROUNDS})
          </Button>
        </div>
      </Stage>
    )
  }

  if (done) {
    const bestTry = tries.reduce((a, b) => (average(b) > average(a) ? b : a))
    const best = average(bestTry)
    const n = `${tries.length} ${tries.length === 1 ? 'try' : 'tries'}`
    const stats = getStats(game.slug)
    return (
      <>
        <Stage>
          <div className="stack" style={{ justifyItems: 'center' }}>
            {fresh && lastTry && lastTry.length === ROUNDS && (
              <>
                <div className="cr-compare">
                  <div><span className="cr-swatch" style={{ background: css(targets[ROUNDS - 1]) }} /><span className="small muted">Last colour</span></div>
                  <div><span className="cr-swatch" style={{ background: css(guess) }} /><span className="small muted">Yours</span></div>
                </div>
                <p className="body-strong" style={{ margin: 0 }}>Last try: {average(lastTry)}% match</p>
              </>
            )}
            <AttemptTiles attempts={bestTry.map(grade)} />
          </div>
        </Stage>
        <ResultCard
          game={game}
          headline={`${best}% match`}
          detail={<>Your best of {n} {oneOff ? `on the ${puzzleLabel(day)} colours` : 'today'}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`🎨 Color Recall ${puzzleLabel(day)}\n${bestTry.map(square).join('')} ${best}% match\nBest of ${n}`}
          finishData={{ score: best, tries: tries.length }}
          trackFinish={fresh}
          challenge={{ seed: dateKey(day), score: best, text: `${best}%`, lowerIsBetter: false }}
          onReplay={() => { setLastTry(null); show() }}
          replayLabel="Try again"
        />
      </>
    )
  }

  if (phase === 'ready') {
    return (
      <Stage>
        <div className="stack">
          <p className="body" style={{ margin: 0 }}>Each colour shows for {SHOW_MS / 1000} seconds, then hides. Rebuild it with the three sliders.</p>
          <Button size="lg" block color={game.color} onClick={show} data-primary="click" hint="Space">Show the first colour</Button>
        </div>
      </Stage>
    )
  }

  if (phase === 'show') {
    return (
      <Stage className="cr-show" style={{ background: css(target) }}>
        <span className="cr-timer" style={{ width: `${(left / SHOW_MS) * 100}%` }} aria-hidden="true" />
        <span className="cr-show-label">Remember this colour · {Math.ceil(left / 1000)}</span>
      </Stage>
    )
  }

  // Match: three sliders, with live previews of each slider's range.
  const slider = (key: keyof Hsl, label: string, max: number, track: string) => (
    <div className="cr-slider">
      <label className="eyebrow muted" htmlFor={`cr-${key}`}>{label}</label>
      <input id={`cr-${key}`} type="range" min={0} max={max} value={guess[key]} onChange={(e) => setGuess({ ...guess, [key]: +e.target.value })} style={{ background: track }} />
    </div>
  )
  return (
    <Stage>
      <div className="stack">
        <div className="between">
          <span className="small muted">Colour {round + 1} of {ROUNDS}{tries.length ? ` · try ${tries.length + 1}` : ''}</span>
          <AttemptTiles attempts={Array.from({ length: ROUNDS }, (_, i) => (i < current.length ? grade(current[i]) : 'empty'))} />
        </div>
        <span className="cr-swatch cr-swatch--big" style={{ background: css(guess) }} aria-label="Your colour" role="img" />
        {slider('h', 'Hue', 360, 'linear-gradient(90deg, hsl(0 80% 50%), hsl(60 80% 50%), hsl(120 80% 50%), hsl(180 80% 50%), hsl(240 80% 50%), hsl(300 80% 50%), hsl(360 80% 50%))')}
        {slider('s', 'Saturation', 100, `linear-gradient(90deg, hsl(${guess.h} 0% ${guess.l}%), hsl(${guess.h} 100% ${guess.l}%))`)}
        {slider('l', 'Lightness', 100, `linear-gradient(90deg, hsl(${guess.h} ${guess.s}% 0%), hsl(${guess.h} ${guess.s}% 50%), hsl(${guess.h} ${guess.s}% 100%))`)}
        <Button size="lg" block color={game.color} onClick={lockIn} data-primary="click" hint="Enter">Lock in</Button>
        {score0(tries)}
      </div>
    </Stage>
  )
}

function score0(tries: number[][]) {
  if (!tries.length) return null
  const best = Math.max(...tries.map(average))
  return <Score label="Today's best" value={`${best}%`} size="md" />
}
