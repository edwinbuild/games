import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { countsFor, placeDots, roundScore } from './count-flash/dots'
import { bestOf, errorOf, scoresOf, trySeed, type Stored, type Try } from './count-flash/tries'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { useRunState } from '../shell/session'
import { AttemptTiles, Button, Stage, type Attempt, GetReady } from '../ui/components'

const game = getGame('count-flash')
const FLASH_MS = 800
const ROUNDS = 5

const grade = (s: number): Attempt => (s >= 90 ? 'hit' : s >= 75 ? 'near' : 'miss')
const square = (s: number) => ({ hit: '🟩', near: '🟨', miss: '🟥', empty: '⬜' })[grade(s)]

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
  const [tries, setTries] = useState<Stored[]>(() => (oneOff ? [] : loadToday(game.slug, [] as Stored[])))
  // Each try has its own fields, so the counts revealed after one try never help the next.
  const fieldSeed = trySeed(seed, tries.length)
  const counts = countsFor(fieldSeed)
  // The try in progress (the guesses so far) survives a refresh.
  const [current, setCurrent] = useRunState<number[]>(`${game.slug}:${seed}:${tries.length}:g`, [])
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
    const next = [...current, g]
    setCurrent(next)
    setPhase('reveal')
    // The try is recorded at the last answer, so a refresh before "See your result" can't lose it.
    if (next.length === ROUNDS) {
      const all: Stored[] = [...tries, { g: next, n: counts } satisfies Try]
      finished.current = all
      if (!oneOff) {
        saveToday(game.slug, all)
        const best = errorOf(bestOf(all))
        recordDaily(game.slug, -best, new Date(), `${best}% off`)
      }
      setFresh(true)
    }
  }
  const finished = useRef<Stored[] | null>(null)

  function next() {
    if (current.length < ROUNDS) return flash()
    setTries(finished.current ?? [...tries, { g: current, n: counts }])
    setCurrent([])
    setPhase('ready')
  }

  const tiles = Array.from({ length: ROUNDS }, (_, i) => (i < current.length ? grade(roundScore(current[i], counts[i])) : 'empty' as Attempt))

  if (done) {
    const bestTry = bestOf(tries)
    const best = errorOf(bestTry)
    const lastTry = tries[tries.length - 1]
    const nTries = `${tries.length} ${tries.length === 1 ? 'try' : 'tries'}`
    const stats = getStats(game.slug)
    return (
      <>
        <Stage>
          <div className="stack" style={{ justifyItems: 'center' }}>
            {!Array.isArray(lastTry) && <p className="body-strong" style={{ margin: 0 }}>Last try’s counts: {lastTry.n.join(', ')}. Your next try gets new fields.</p>}
            <AttemptTiles attempts={scoresOf(bestTry).map(grade)} />
          </div>
        </Stage>
        <ResultCard
          game={game}
          headline={`${best}% off on average`}
          detail={<>Your best of {nTries} {oneOff ? `on the ${puzzleLabel(day)} fields` : 'today'}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`🔢 Count Flash ${puzzleLabel(day)}\n${scoresOf(bestTry).map(square).join('')}\n${best}% off on average, best of ${nTries}`}
          finishData={{ score: best, tries: tries.length }}
          trackFinish={fresh}
          challenge={{ seed, score: best, text: `${best}% off`, lowerIsBetter: true }}
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
          {phase === 'flash' && <Field n={n} seed={fieldSeed} />}
          {phase === 'reveal' && <Field n={counts[round - 1]} seed={fieldSeed} />}
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
