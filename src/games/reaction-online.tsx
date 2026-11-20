import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { makeDelays, roundWinner, TARGET, type Result } from './reaction-online/rules'
import { myName, setMyName } from '../shell/challenge'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { DuelModes } from '../shell/DuelModes'
import { goToRoom, roomFromUrl, RoomLanding, RoomNotice } from '../shell/online'
import { useRoom, useStepOutIfStale, type Member } from '../shell/room'
import { Button, Stage, TextField } from '../ui/components'
import { Lobby, PLAYERS, RoomCode, ScoreStrip } from '../ui/multiplayer'
import { avatarOf } from '../shell/roomAvatar'

const game = getGame('reaction-online')
const MAX = 2

export default function ReactionOnline() {
  const [code, setCode] = useState<string | null>(roomFromUrl)
  // Before joining a room you can switch to playing on one phone (both modes share one card).
  if (!code) return <><DuelModes current="online" /><RoomLanding game={game} intro="Play a friend on their own phone. One of you makes a room and sends the link; the other joins." onRoom={(c) => { goToRoom(c); setCode(c) }} /></>
  return <Room code={code} onLeave={() => { goToRoom(null); setCode(null) }} />
}

type Phase = 'lobby' | 'wait' | 'go' | 'sent' | 'done'

function Room({ code, onLeave }: { code: string; onLeave: () => void }) {
  const room = useRoom(game.slug, code, MAX)
  const [name, setName] = useState(myName)
  const [phase, setPhase] = useState<Phase>('lobby')
  // A fresh page load that finds its room's match running (it refreshed mid-match) steps out so nobody waits.
  // Players who have taken part in a match since loading are never stale, even if room updates arrive late.
  const tookPart = useRef(false)
  useStepOutIfStale(room, phase === 'lobby' && !tookPart.current)
  const [delays, setDelays] = useState<number[]>([])
  const [round, setRound] = useState(0)
  const [mine, setMine] = useState<Result[]>([])
  const [theirs, setTheirs] = useState<Result[]>([])
  const [left, setLeft] = useState(false)
  const goAt = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const me = room.members.find((m) => m.id === room.me)
  const opponent = room.members.find((m) => m.id !== room.me)
  const seatOf = (m?: Member) => (m ? Math.max(0, room.members.indexOf(m)) : 0)
  const label = (m?: Member) => (m ? m.name || PLAYERS[seatOf(m)].name : 'Waiting…')
  const url = `${location.origin}/${game.slug}/?room=${code}`

  // Messages from the other phone.
  useEffect(() => {
    const offStart = room.on('start', (p) => beginMatch(p.delays as number[]))
    const offResult = room.on('result', (p) => setTheirs((t) => { const n = [...t]; n[Number(p.round)] = (p.ms as number | null) ?? null; return n }))
    return () => { offStart(); offResult() }
  })

  // The opponent leaving mid-match ends it.
  useEffect(() => {
    if ((phase === 'wait' || phase === 'go' || phase === 'sent') && room.members.length < 2) {
      clearTimeout(timer.current)
      setLeft(true)
      setPhase('done')
    }
  }, [room.members.length, phase])

  function beginMatch(d: number[]) {
    tookPart.current = true
    room.update({ ready: false }) // everyone starts the next lobby not ready
    setDelays(d)
    setMine([])
    setTheirs([])
    setLeft(false)
    setRound(0)
    startRound(0, d)
  }

  function startRound(r: number, d = delays) {
    setPhase('wait')
    timer.current = setTimeout(() => { goAt.current = performance.now(); setPhase('go') }, d[r])
  }

  function tap() {
    if (phase !== 'wait' && phase !== 'go') return
    clearTimeout(timer.current)
    const ms: Result = phase === 'wait' ? null : Math.round(performance.now() - goAt.current)
    if (ms == null) feel.bad()
    else feel.tap()
    setMine((m) => { const n = [...m]; n[round] = ms; return n })
    room.send('result', { round, ms })
    setPhase('sent')
  }

  // When both results for this round are in, score it and start the next one.
  const myWins = mine.filter((m, i) => i < theirs.length && theirs[i] !== undefined && roundWinner(m, theirs[i]) === 0).length
  const theirWins = mine.filter((m, i) => i < theirs.length && theirs[i] !== undefined && roundWinner(m, theirs[i]) === 1).length
  useEffect(() => {
    if (phase !== 'sent' || mine[round] === undefined || theirs[round] === undefined) return
    const w = roundWinner(mine[round], theirs[round])
    if (w === 0) feel.good()
    if (myWins >= TARGET || theirWins >= TARGET || round + 1 >= delays.length) {
      timer.current = setTimeout(() => setPhase('done'), 900)
      return
    }
    timer.current = setTimeout(() => { setRound(round + 1); startRound(round + 1) }, 1300)
  }, [phase, mine, theirs, round])

  function ready() {
    setMyName(name)
    room.update({ name, ready: !me?.ready })
  }
  function start() {
    const d = makeDelays(Math.random)
    room.update({ started: room.members.map((m) => m.id), ready: false })
    room.send('start', { delays: d })
    beginMatch(d)
  }

  if (room.status === 'full') return <RoomNotice game={game} text="That room already has two players. Ask your friend for a new link, or create your own room." onLeave={onLeave} />
  if (room.status === 'started') return <RoomNotice game={game} text="That match has already started. Wait for it to finish and ask for a new link, or create your own room." onLeave={onLeave} />
  if (room.status === 'error') return <RoomNotice game={game} text="Couldn’t connect to the room. Check your connection and try again." onLeave={onLeave} />

  const both = room.members.length === MAX
  const allReady = both && room.members.every((m) => m.ready)
  const strip = [
    { name: label(me), score: myWins, me: true, player: seatOf(me) },
    { name: label(opponent), score: theirWins, player: opponent ? seatOf(opponent) : 1 - seatOf(me) },
  ]

  if (phase === 'lobby') {
    return (
      <Stage>
        <div className="stack">
          <RoomCode code={code} url={url} />
          {room.status === 'connecting' && <p className="small muted" role="status" style={{ margin: 0 }}>Connecting to the room…</p>}
          <Lobby players={room.members.map((m) => ({ name: m.name || PLAYERS[seatOf(m)].name, ready: m.ready, avatar: avatarOf(m), me: m.id === room.me, host: seatOf(m) === 0 }))} max={MAX} />
          {!me?.ready && <TextField id="duel-name" label="Your name (optional)" value={name} onChange={setName} maxLength={16} placeholder="Shown to your opponent" />}
          <Button size="lg" block color={game.color} onClick={ready} disabled={room.status !== 'open'} variant={me?.ready ? 'secondary' : 'primary'}>
            {me?.ready ? 'Not ready' : 'Ready'}
          </Button>
          {room.host && <Button size="lg" block onClick={start} disabled={!allReady} data-primary="click">{both ? (allReady ? 'Start the duel' : 'Waiting for both to be ready') : 'Waiting for your friend to join'}</Button>}
          {!room.host && both && <p className="small muted center" style={{ margin: 0 }}>The host starts the duel when you’re both ready.</p>}
          <Button variant="ghost" onClick={onLeave}>Leave the room</Button>
        </div>
      </Stage>
    )
  }

  if (phase === 'done') {
    const won = myWins > theirWins
    const times = mine.filter((m): m is number => typeof m === 'number')
    const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
    const them = label(opponent) || 'your friend'
    return (
      <>
        <Stage><ScoreStrip players={strip} /></Stage>
        <ResultCard
          game={game}
          headline={left ? `${them} left the match` : won ? `You beat ${them} ${myWins}–${theirWins}` : myWins === theirWins ? `A draw, ${myWins}–${theirWins}` : `${them} won ${theirWins}–${myWins}`}
          detail={times.length ? `Your average ${avg} ms · fastest ${Math.min(...times)} ms` : 'No clean taps this time'}
          shareText={`⚡ Reaction Duel\n${won ? `I beat ${them}` : `${them} beat me`} ${Math.max(myWins, theirWins)}–${Math.min(myWins, theirWins)}${times.length ? `\nMy average ${avg} ms` : ''}`}
          finishData={{ won: won ? 1 : 0 }}
          challenge={{ seed: code, score: avg, text: `${avg} ms`, lowerIsBetter: true }}
          plainLink
          onReplay={left ? onLeave : () => { setPhase('lobby'); room.update(room.host ? { ready: true, started: undefined } : { ready: true }) }}
          replayLabel={left ? 'Back to rooms' : 'Rematch'}
        />
      </>
    )
  }

  // Playing.
  const fill = phase === 'wait' ? 'chili' : phase === 'go' ? 'mint' : undefined
  const last = round > 0 || mine[round] !== undefined
  return (
    <>
      <div style={{ marginBottom: 'var(--space-3)' }}><ScoreStrip players={strip} /></div>
      <Stage
        color={fill}
        role="button"
        tabIndex={0}
        data-primary="pointer"
        onPointerDown={tap}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), tap())}
        style={{ minHeight: 300, display: 'grid', alignContent: 'center', gap: 'var(--space-2)', cursor: 'pointer', touchAction: 'manipulation' }}
      >
        <span className="score-xl">{phase === 'wait' ? 'Wait…' : phase === 'go' ? 'TAP!' : mine[round] == null ? 'Too early' : `${mine[round]} ms`}</span>
        <span className="small">
          {phase === 'sent' ? (theirs[round] === undefined ? `Waiting for ${label(opponent)}…` : `${label(opponent)}: ${theirs[round] == null ? 'too early' : `${theirs[round]} ms`}`) : `Round ${round + 1} · first to ${TARGET}`}
        </span>
        {!last && <kbd className="qg-kbd" aria-hidden="true">Space</kbd>}
      </Stage>
    </>
  )
}
