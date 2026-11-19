import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { countsFor, placeDots, roundScore } from './count-flash/dots'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { useRunState } from '../shell/session'
import { AttemptTiles, Button, Stage, type Attempt, GetReady } from '../ui'

const game = getGame('count-flash')
const FLASH_MS = 800
const ROUNDS = 5

const grade = (s: number): Attempt => (s >= 90 ? 'hit' : s >= 75 ? 'near' : 'miss')
const square = (s: number) => ({ hit: '🟩', near: '🟨', miss: '🟥', empty: '⬜' })[grade(s)]
const average = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)

type Phase = 'ready' | 'countdown' | 'flash' | 'guess' | 'reveal'

function Field({ n, seed }: { n: number; seed: string }) {
  const dots = placeDots(n, seed)
  return (
    <svg className="cf-field" viewBox="0 0 100 100" role="img" aria-label={`${n} dots`}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} />
      ))}
    </svg>
  )
}

export default function CountFlash() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const counts = countsFor(seed)
  const [tries, setTries] = useState<number[][]>(() => (oneOff ? [] : loadToday(game.slug, [] as number[][])))
  // The try in progress survives a refresh.
  const [current, setCurrent] = useRunState<number[]>(`${game.slug}:${seed}:${tries.length}`, [])
  const [phase, setPhase] = useState<Phase>('ready')
  const [guess, setGuess] = useState('')
  const [fresh, setFresh] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    if (phase === 'guess') input.current?.focus({ preventScroll: true })
  }, [phase])

  const round = current.length
  const n = counts[Math.min(round, ROUNDS - 1)]
  const done = tries.length > 0 && current.length === 0 && phase !== 'flash' && phase !== 'guess' && phase !== 'countdown'

  // Every flash starts with GetReady, which scrolls the field on screen and counts 3-2-1.
  function flash() {
    setGuess('')
    setPhase('countdown')
  }
  function startFlash() {
    setPhase('flash')
    timer.current = setTimeout(() => setPhase('guess'), FLASH_MS)
  }

  function submit() {
    const g = parseInt(guess, 10)
    if (!Number.isFinite(g) || g < 0) return
    const s = roundScore(g, n)
    if (s >= 90) feel.good()
    else if (s < 75) feel.bad()
    else feel.tap()
    const next = [...current, s]
    setCurrent(next)
    setPhase('reveal')
    // The try is recorded at the last answer, so a refresh before "See your result" can't lose it.
    if (next.length === ROUNDS) {
      const all = [...tries, next]
      finished.current = all
      if (!oneOff) {
        saveToday(game.slug, all)
        const best = Math.max(...all.map(average))
        recordDaily(game.slug, best, new Date(), `${100 - best}% off`)
      }
      setFresh(true)
    }
  }
  const finished = useRef<number[][] | null>(null)

  function next() {
    if (current.length < ROUNDS) return flash()
    setTries(finished.current ?? [...tries, current])
    setCurrent([])
    setPhase('ready')
  }

  const tiles = Array.from({ length: ROUNDS }, (_, i) => (i < current.length ? grade(current[i]) : 'empty' as Attempt))

  if (done) {
    const bestTry = tries.reduce((a, b) => (average(b) > average(a) ? b : a))
    const best = average(bestTry)
    const nTries = `${tries.length} ${tries.length === 1 ? 'try' : 'tries'}`
    const stats = getStats(game.slug)
    return (
      <>
        <Stage>
          <div className="stack" style={{ justifyItems: 'center' }}>
            <p className="body-strong" style={{ margin: 0 }}>Today’s counts: {counts.join(', ')}</p>
            <AttemptTiles attempts={bestTry.map(grade)} />
          </div>
        </Stage>
        <ResultCard
          game={game}
          headline={`Within ${100 - best}% on average`}
          detail={<>Your best of {nTries} {oneOff ? `on the ${puzzleLabel(day)} fields` : 'today'}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`🔢 Count Flash ${puzzleLabel(day)}\n${bestTry.map(square).join('')}\nWithin ${100 - best}% on average, best of ${nTries}`}
          finishData={{ score: best, tries: tries.length }}
          trackFinish={fresh}
          challenge={{ seed, score: best, text: `${100 - best}% off`, lowerIsBetter: false }}
          onReplay={flash}
          replayLabel="Try again"
        />
      </>
    )
  }

  return (
    <Stage flush>
      <div className="stack cf-stage">
        <div className="between" style={{ padding: '0 var(--space-2)' }}>
          <span className="small muted">Field {Math.min(round + 1, ROUNDS)} of {ROUNDS}{tries.length ? ` · try ${tries.length + 1}` : ''}</span>
          <AttemptTiles attempts={tiles} />
        </div>
        <div className="cf-box">
          {phase === 'countdown' && <GetReady onDone={startFlash} />}
          {phase === 'flash' && <Field n={n} seed={seed} />}
          {phase === 'reveal' && <Field n={counts[round - 1]} seed={seed} />}
          {phase === 'ready' && <p className="body cf-hint">The dots show for less than a second. Don’t count: estimate.</p>}
          {phase === 'guess' && <p className="result cf-hint">How many?</p>}
        </div>
        {phase === 'ready' && (
          <Button size="lg" block color={game.color} onClick={flash} data-primary="click" hint="Space">{current.length ? `Flash field ${current.length + 1}` : 'Flash the first field'}</Button>
        )}
        {phase === 'guess' && (
          <form className="cf-guess" onSubmit={(e) => { e.preventDefault(); submit() }}>
            <label className="eyebrow muted" htmlFor="cf-guess">Your estimate</label>
            <input
              id="cf-guess"
              ref={input}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={guess}
              onChange={(e) => setGuess(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0"
            />
            <Button type="submit" size="lg" block color={game.color} disabled={!guess}>Lock in</Button>
          </form>
        )}
        {phase === 'reveal' && (
          <div className="stack" style={{ padding: '0 var(--space-2) var(--space-2)' }}>
            <p className="result" style={{ margin: 0 }}>{counts[round - 1]} dots · you said {guess}</p>
            <Button size="lg" block color={game.color} onClick={next} data-primary="click" hint="Space">
              {current.length < ROUNDS ? `Next field (${current.length + 1} of ${ROUNDS})` : 'See your result'}
            </Button>
          </div>
        )}
      </div>
    </Stage>
  )
}
