import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { levelSetup } from './shared/odd-grid'
import { OddGrid } from './shared/OddGrid'
import { COUNTDOWN_MS, MAX_PLAYERS, ordinal, rank, timeLeft, WRONG_MS, type Racer } from './spot-race/rules'
import { myName, newSeed, setMyName } from '../shell/challenge'
import { seededRandom } from '../shell/daily'
import { feel } from '../shell/feel'
import { goToRoom, roomFromUrl, RoomLanding, RoomNotice } from '../shell/online'
import { ResultCard } from '../shell/ResultCard'
import { useRoom, useStepOutIfStale } from '../shell/room'
import { Button, Score, Stage, TextField } from '../ui/components'
import { Lobby, PlayerChip, PLAYERS, RoomCode, ScoreStrip } from '../ui/multiplayer'
import { avatarOf } from '../shell/roomAvatar'
import './spot-race.css'

const game = getGame('spot-race')
/** How long to wait for other players' final scores before showing the ranking anyway. */
const FINAL_WAIT_MS = 8000

export default function SpotRace() {
  const [code, setCode] = useState<string | null>(roomFromUrl)
  if (!code) {
    return <RoomLanding game={game} intro="Race up to seven friends through the same Odd One Out grids, each on your own phone. Make a room and send the link." onRoom={(c) => { goToRoom(c); setCode(c) }} />
  }
  return <Room code={code} onLeave={() => { goToRoom(null); setCode(null) }} />
}

type Phase = 'lobby' | 'count' | 'race' | 'done'
type Seat = { id: string; name: string; seat: number }
type Progress = { level: number; at: number; final?: boolean }

function Room({ code, onLeave }: { code: string; onLeave: () => void }) {
  const room = useRoom(game.slug, code, MAX_PLAYERS)
  const [name, setName] = useState(myName)
  const [phase, setPhase] = useState<Phase>('lobby')
  // A fresh page load that finds its room's match running (it refreshed mid-match) steps out so nobody waits.
  // Players who have taken part in a match since loading are never stale, even if room updates arrive late.
  const tookPart = useRef(false)
  useStepOutIfStale(room, phase === 'lobby' && !tookPart.current)
  const [lineup, setLineup] = useState<Seat[]>([])
  const [others, setOthers] = useState<Record<string, Progress>>({})
  const [level, setLevel] = useState(0) // levels cleared
  const [at, setAt] = useState(0) // ms into my race when I cleared the last one
  const [wrong, setWrong] = useState(0)
  const [setup, setSetup] = useState(() => levelSetup(1, Math.random))
  const [shake, setShake] = useState<number | null>(null)
  const streak = useRef(0) // correct taps in a row, for the climbing pop
  const [now, setNow] = useState(0)
  const [gaveUpWaiting, setGaveUpWaiting] = useState(false)
  const rng = useRef(seededRandom(''))
  const t0 = useRef(0) // countdown start
  const raceStart = useRef(0)

  const present = (id: string) => room.members.some((m) => m.id === id)
  const url = `${location.origin}/${game.slug}/?room=${code}`
  const me = room.members.find((m) => m.id === room.me)

  // Messages from the other phones.
  useEffect(() => {
    const offs = [
      room.on('start', (p) => begin(String(p.seed), p.lineup as Seat[])),
      room.on('level', (p, from) => setOthers((o) => ({ ...o, [from]: { ...o[from], level: Number(p.level), at: Number(p.at) } }))),
      room.on('final', (p, from) => setOthers((o) => ({ ...o, [from]: { level: Number(p.level), at: Number(p.at), final: true } }))),
    ]
    return () => offs.forEach((off) => off())
  })

  // One clock for the countdown and the race.
  useEffect(() => {
    if (phase !== 'count' && phase !== 'race') return
    const id = setInterval(() => setNow(performance.now()), 100)
    return () => clearInterval(id)
  }, [phase])
  useEffect(() => {
    if (phase === 'count' && now - t0.current >= COUNTDOWN_MS) {
      raceStart.current = t0.current + COUNTDOWN_MS
      setPhase('race')
    }
    if (phase === 'race' && timeLeft(raceStart.current, now, wrong) <= 0) {
      room.send('final', { level, at })
      setPhase('done')
    }
  }, [now, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'done') return
    setGaveUpWaiting(false)
    const t = setTimeout(() => setGaveUpWaiting(true), FINAL_WAIT_MS)
    return () => clearTimeout(t)
  }, [phase])

  function begin(seed: string, seats: Seat[]) {
    tookPart.current = true
    room.update({ ready: false }) // everyone starts the next lobby not ready
    rng.current = seededRandom(seed)
    streak.current = 0
    setSetup(levelSetup(1, rng.current))
    setLineup(seats)
    setOthers(Object.fromEntries(seats.map((s) => [s.id, { level: 0, at: 0 }])))
    setLevel(0)
    setAt(0)
    setWrong(0)
    t0.current = performance.now()
    setNow(t0.current)
    setPhase('count')
  }

  function start() {
    const seats = room.members.map((m, i) => ({ id: m.id, name: m.name, seat: i }))
    const seed = newSeed()
    room.update({ started: seats.map((s) => s.id), ready: false })
    room.send('start', { seed, lineup: seats })
    begin(seed, seats)
  }

  function pick(i: number) {
    if (phase !== 'race') return
    if (i === setup.oddIndex) {
      feel.pop(streak.current++)
      const t = Math.round(performance.now() - raceStart.current)
      setLevel(level + 1)
      setAt(t)
      setSetup(levelSetup(level + 2, rng.current))
      room.send('level', { level: level + 1, at: t })
    } else {
      streak.current = 0
      feel.bad()
      setWrong((w) => w + 1)
      setShake(i)
      setTimeout(() => setShake(null), 300)
    }
  }

  function ready() {
    setMyName(name)
    room.update({ name, ready: !me?.ready })
  }
  function rematch() {
    setPhase('lobby')
    room.update(room.host ? { ready: true, started: undefined } : { ready: true })
  }

  if (phase === 'lobby') {
    if (room.status === 'full') return <RoomNotice game={game} text={`That room is full (${MAX_PLAYERS} players). Ask for a new link, or create your own room.`} onLeave={onLeave} />
    if (room.status === 'started') return <RoomNotice game={game} text="That race has already started. Wait for it to finish and ask for a new link, or create your own room." onLeave={onLeave} />
    if (room.status === 'error') return <RoomNotice game={game} text="Couldn’t connect to the room. Check your connection and try again." onLeave={onLeave} />
    const enough = room.members.length >= 2
    const allReady = enough && room.members.every((m) => m.ready)
    return (
      <Stage>
        <div className="stack">
          {room.status === 'connecting' ? <p className="body muted" style={{ margin: 0 }}>Joining room {code}…</p> : <RoomCode code={code} url={url} />}
          <Lobby players={room.members.map((m, i) => ({ name: m.name || PLAYERS[i % PLAYERS.length].name, ready: m.ready, avatar: avatarOf(m), me: m.id === room.me, host: i === 0 }))} max={MAX_PLAYERS} />
          {!me?.ready && <TextField id="race-name" label="Your name (optional)" value={name} onChange={setName} maxLength={16} placeholder="Shown to the other players" />}
          <Button size="lg" block color={game.color} onClick={ready} disabled={room.status !== 'open'} variant={me?.ready ? 'secondary' : 'primary'}>
            {me?.ready ? 'Not ready' : 'Ready'}
          </Button>
          {room.host && (
            <Button size="lg" block onClick={start} disabled={!allReady} data-primary="click">
              {!enough ? 'Waiting for someone to join' : allReady ? `Start the race (${room.members.length} players)` : 'Waiting for everyone to be ready'}
            </Button>
          )}
          {!room.host && enough && <p className="small muted center" style={{ margin: 0 }}>The host starts the race when everyone is ready.</p>}
          <Button variant="ghost" onClick={onLeave}>Leave the room</Button>
        </div>
      </Stage>
    )
  }

  const racers: (Racer & Seat)[] = lineup.map((p) =>
    p.id === room.me ? { ...p, level, at } : { ...p, level: others[p.id]?.level ?? 0, at: others[p.id]?.at ?? 0, left: !present(p.id) },
  )
  const label = (p: Seat) => p.name || PLAYERS[p.seat % PLAYERS.length].name
  const strip = (
    <ScoreStrip players={racers.map((r) => ({ name: label(r), score: r.left ? 'left' : `Lv ${r.level}`, me: r.id === room.me, player: r.seat }))} />
  )

  if (phase === 'count') {
    const n = Math.max(1, Math.ceil((COUNTDOWN_MS - (now - t0.current)) / 1000))
    return (
      <>
        <div style={{ marginBottom: 'var(--space-3)' }}>{strip}</div>
        <Stage style={{ minHeight: 300, display: 'grid', placeContent: 'center', gap: 'var(--space-2)' }}>
          <span key={n} className="score-xl sr-count">{n}</span>
          <span className="small">Same grids for everyone. Find the odd one.</span>
        </Stage>
      </>
    )
  }

  if (phase === 'race') {
    const left = timeLeft(raceStart.current, now, wrong)
    return (
      <>
        <div style={{ marginBottom: 'var(--space-3)' }}>{strip}</div>
        <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
          <Score label="Level" value={level + 1} size="md" bump />
          <Score label="Time" value={`${Math.ceil(left / 1000)}s`} size="md" />
        </div>
        <Stage flush><OddGrid setup={setup} level={level} shake={shake} onPick={pick} /></Stage>
        {shake !== null && <p className="small center" style={{ color: 'var(--danger)', margin: 'var(--space-2) 0 0' }}>✕ Wrong one, −{WRONG_MS / 1000}s</p>}
      </>
    )
  }

  // Done: the ranking fills in as everyone's final score arrives.
  const waiting = gaveUpWaiting ? [] : racers.filter((r) => r.id !== room.me && !r.left && !others[r.id]?.final)
  const ranking = rank(racers)
  const mine = ranking.find((r) => r.id === room.me)!
  const place = `${ordinal(mine.place)} of ${ranking.length}`
  const levels = `${level} level${level === 1 ? '' : 's'}`
  return (
    <>
      <Stage>
        <ol className="sr-ranking" aria-label="Final ranking">
          {ranking.map((r) => {
            const p = racers.find((x) => x.id === r.id)!
            return (
              <li key={r.id} data-me={r.id === room.me || undefined}>
                <span className="sr-place">{ordinal(r.place)}</span>
                <PlayerChip player={p.seat} name={r.id === room.me ? 'You' : label(p)} />
                <span className="sr-level">Lv {r.level}{r.left ? ' · left' : ''}</span>
              </li>
            )
          })}
        </ol>
        {waiting.length > 0 && <p className="small muted center" style={{ margin: 'var(--space-2) 0 0' }}>You cleared {levels}. Waiting for {waiting.map(label).join(', ')} to finish…</p>}
      </Stage>
      {waiting.length === 0 && <ResultCard
        game={game}
        headline={place}
        detail={`You cleared ${levels}${wrong ? ` · ${wrong} wrong tap${wrong === 1 ? '' : 's'}` : ''}`}
        shareText={`👀 Spot Race\n${place} · cleared ${levels}`}
        finishData={{ level, place: mine.place, players: ranking.length }}
        challenge={{ seed: code, score: level, text: `Lv ${level}`, lowerIsBetter: false }}
        plainLink
        onReplay={room.members.length >= 2 ? rematch : onLeave}
        replayLabel={room.members.length >= 2 ? 'Rematch' : 'Back to rooms'}
      />}
    </>
  )
}
