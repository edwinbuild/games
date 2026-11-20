import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { judgeRound, matchWinner, TIE_MS, type Press } from './duel-rules'
import { newSeed, readChallenge } from '../shell/challenge'
import { seededRandom } from '../shell/daily'
import { DuelModes } from '../shell/DuelModes'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { AttemptTiles, Button, type Attempt } from '../ui/components'
import { PLAYERS, SplitStage } from '../ui/multiplayer'

const game = getGame('tap-duel')
const TARGET = 3
const KEYS = ['a', 'l']

type Phase = 'ready' | 'wait' | 'go' | 'between' | 'done'
type Round = { winner: number; ms?: number; early?: boolean }

export default function TapDuel() {
  const challenge = readChallenge(game.slug)
  const [seed, setSeed] = useState(() => challenge?.s ?? newSeed())
  const rng = useRef(seededRandom(seed))
  const [phase, setPhase] = useState<Phase>('ready')
  const [scores, setScores] = useState([0, 0])
  const [rounds, setRounds] = useState<Round[]>([])
  const [note, setNote] = useState('')
  const goAt = useRef<number | null>(null)
  const presses = useRef<Press[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  // Set once a winning tap is in: later taps are still collected for the tie window, then judged once.
  const judging = useRef(false)

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms))

  function startRound() {
    // On short screens the Start key sits below the halves; bring both halves back into view.
    document.querySelector('.qg-split')?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    presses.current = []
    goAt.current = null
    judging.current = false
    setNote('')
    setPhase('wait')
    later(() => {
      goAt.current = performance.now()
      setPhase('go')
    }, 1500 + rng.current() * 2500)
  }

  function finish(outcome: ReturnType<typeof judgeRound>) {
    if (outcome === 'pending') return
    timers.current.forEach(clearTimeout)
    if (outcome.kind === 'tie') {
      setNote('Tie! Same round again.')
      setPhase('between')
      later(startRound, 1400)
      return
    }
    const winner = outcome.kind === 'win' ? outcome.winner : 1 - outcome.loser
    const round: Round = outcome.kind === 'win' ? { winner, ms: outcome.ms } : { winner, early: true }
    const next = scores.map((s, i) => (i === winner ? s + 1 : s))
    setScores(next)
    setRounds((r) => [...r, round])
    if (outcome.kind === 'early') {
      feel.bad()
      setNote(`${PLAYERS[outcome.loser].name} tapped too early.`)
    } else {
      feel.good()
      setNote(`${PLAYERS[winner].name} in ${outcome.ms} ms`)
    }
    if (matchWinner(next, TARGET) != null) {
      setPhase('done')
    } else {
      setPhase('between')
      later(startRound, 1600)
    }
  }

  function press(player: number) {
    const p = phaseRef.current
    if (p !== 'wait' && p !== 'go') return
    presses.current.push({ player, t: performance.now() })
    if (judging.current) return // inside the tie window: this tap is judged with the first
    const outcome = judgeRound(presses.current, goAt.current)
    if (outcome === 'pending') return
    if (outcome.kind === 'win') {
      // Wait out the tie window (keeping the other player's tap if it comes) before declaring a winner.
      judging.current = true
      later(() => finish(judgeRound(presses.current, goAt.current)), TIE_MS + 2)
    } else finish(outcome)
  }

  // A and L on a keyboard.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const i = KEYS.indexOf(e.key.toLowerCase())
      if (i >= 0 && !e.repeat) press(i)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function rematch() {
    const next = challenge ? seed : newSeed()
    setSeed(next)
    rng.current = seededRandom(next)
    setScores([0, 0])
    setRounds([])
    setNote('')
    setPhase('ready')
  }

  const winner = matchWinner(scores, TARGET)
  const valid = rounds.filter((r) => r.ms != null)
  const fastest = valid.length ? valid.reduce((a, b) => (a.ms! < b.ms! ? a : b)) : null
  const fill = phase === 'wait' ? 'chili' : phase === 'go' ? 'mint' : undefined

  const half = (i: number) => {
    const won = rounds.filter((r) => r.winner === i).length
    const big = phase === 'wait' ? 'Wait…' : phase === 'go' ? 'TAP!' : phase === 'ready' ? PLAYERS[i].name : String(won)
    const small =
      phase === 'ready' ? 'Tap your side when it turns green'
      : phase === 'between' || phase === 'done' ? note
      : `${PLAYERS[i].name} · ${won} of ${TARGET}`
    return {
      label: `${PLAYERS[i].name}'s side`,
      color: fill,
      content: (
        <>
          <span className="score-xl">{big}</span>
          <span className="small">{small}</span>
          <kbd className="qg-kbd" aria-hidden="true">{KEYS[i].toUpperCase()}</kbd>
        </>
      ),
    }
  }

  const tiles = (i: number): Attempt[] => rounds.map((r) => (r.winner === i ? 'hit' : 'miss'))

  return (
    <>
      {phase === 'ready' && rounds.length === 0 && <DuelModes current="phone" />}
      <SplitStage halves={[half(0), half(1)]} onPress={press} />
      {phase === 'ready' && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button size="lg" block color={game.color} onClick={startRound} data-primary="click" hint="Space">
            Start the duel
          </Button>
        </div>
      )}
      {phase === 'done' && winner != null && (
        <ResultCard
          game={game}
          headline={`${PLAYERS[winner].name} wins ${scores[winner]}–${scores[1 - winner]}`}
          detail={
            <>
              <AttemptTiles attempts={tiles(winner)} />{' '}
              {fastest ? `Fastest tap ${fastest.ms} ms (${PLAYERS[fastest.winner].name})` : 'Every round was decided by an early tap'}
            </>
          }
          shareText={`🤝 Tap Duel\n${PLAYERS[0].name} ${scores[0]}–${scores[1]} ${PLAYERS[1].name}${fastest ? `\nFastest tap ${fastest.ms} ms` : ''}`}
          finishData={{ rounds: rounds.length }}
          challenge={{ seed, score: fastest?.ms ?? 999, text: fastest ? `${fastest.ms} ms` : '—', lowerIsBetter: true }}
          onReplay={rematch}
          replayLabel="Rematch"
        />
      )}
    </>
  )
}
