import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { ANSWER_S, answerFor, nameOf, roundPoints, roundsFor, ROUNDS, show, sourceOf, valueOf, type Answer, type Round } from './higher-lower/rules'
import { ordinal } from './spot-race/rules'
import { myName, newSeed, setMyName } from '../shell/challenge'
import { feel } from '../shell/feel'
import { goToRoom, roomFromUrl, RoomLanding, RoomNotice } from '../shell/online'
import { ResultCard } from '../shell/ResultCard'
import { useRoom, useStepOutIfStale } from '../shell/room'
import { count } from '../shell/plural'
import { Burst, Button, Lobby, PlayerChip, PLAYERS, RoomCode, ScoreStrip, Stage, TextField } from '../ui'

const game = getGame('higher-lower')
const MAX = 8
/** How long the answer stays on screen before the next round. */
const REVEAL_MS = 2200

export default function HigherLower() {
  const [code, setCode] = useState<string | null>(roomFromUrl)
  if (!code) {
    return <RoomLanding game={game} intro="Up to eight friends, each on their own phone, answer the same ten higher-or-lower questions about countries. Fastest right answer scores most." onRoom={(c) => { goToRoom(c); setCode(c) }} />
  }
  return <Room code={code} onLeave={() => { goToRoom(null); setCode(null) }} />
}

type Phase = 'lobby' | 'question' | 'wait' | 'reveal' | 'done'
type Seat = { id: string; name: string; seat: number }

function Room({ code, onLeave }: { code: string; onLeave: () => void }) {
  const room = useRoom(game.slug, code, MAX)
  const [name, setName] = useState(myName)
  const [phase, setPhase] = useState<Phase>('lobby')
  // A fresh page load that finds its room's match running (it refreshed mid-match) steps out so nobody waits.
  // Players who have taken part in a match since loading are never stale, even if room updates arrive late.
  const tookPart = useRef(false)
  useStepOutIfStale(room, phase === 'lobby' && !tookPart.current)
  const [rounds, setRounds] = useState<Round[]>([])
  const [k, setK] = useState(0)
  const [lineup, setLineup] = useState<Seat[]>([])
  const [answers, setAnswers] = useState<Record<number, Record<string, Answer>>>({})
  const [mine, setMine] = useState<'higher' | 'lower' | null>(null)
  const [now, setNow] = useState(0)
  const shownAt = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const me = room.members.find((m) => m.id === room.me)
  const present = (id: string) => room.members.some((m) => m.id === id)
  const url = `${location.origin}/${game.slug}/?room=${code}`
  const label = (p: Seat) => p.name || PLAYERS[p.seat % PLAYERS.length].name

  useEffect(() => {
    const offs = [
      room.on('start', (p) => begin(String(p.seed), p.lineup as Seat[])),
      room.on('answer', (p, from) => record(Number(p.round), { id: from, correct: !!p.correct, ms: Number(p.ms) })),
    ]
    return () => offs.forEach((off) => off())
  })

  function record(round: number, a: Answer) {
    setAnswers((all) => ({ ...all, [round]: { ...all[round], [a.id]: a } }))
  }

  function begin(seed: string, seats: Seat[]) {
    tookPart.current = true
    room.update({ ready: false }) // everyone starts the next lobby not ready
    setRounds(roundsFor(seed))
    setLineup(seats)
    setAnswers({})
    ask(0)
  }
  function ask(round: number) {
    setK(round)
    setMine(null)
    shownAt.current = performance.now()
    setPhase('question')
  }

  // The answer clock: a no-answer is sent when time runs out, so nobody waits.
  useEffect(() => {
    if (phase !== 'question') return
    const id = setInterval(() => {
      setNow(performance.now())
      if (performance.now() - shownAt.current >= ANSWER_S * 1000) answer(null)
    }, 100)
    return () => clearInterval(id)
  }, [phase, k]) // eslint-disable-line react-hooks/exhaustive-deps

  function answer(pick: 'higher' | 'lower' | null) {
    if (phase !== 'question') return
    const r = rounds[k]
    const ms = pick ? Math.round(performance.now() - shownAt.current) : ANSWER_S * 1000
    const correct = pick != null && pick === answerFor(r)
    setMine(pick)
    feel.click()
    room.send('answer', { round: k, correct, ms })
    record(k, { id: room.me, correct, ms })
    setPhase('wait')
  }

  // Keyboard: up arrow for higher, down arrow for lower.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'question' || e.repeat) return
      if (e.key === 'ArrowUp') { e.preventDefault(); answer('higher') }
      if (e.key === 'ArrowDown') { e.preventDefault(); answer('lower') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // A round is over when everyone still here has answered.
  useEffect(() => {
    if (phase !== 'wait') return
    const got = answers[k] ?? {}
    const waiting = lineup.filter((p) => present(p.id) && !got[p.id])
    if (waiting.length) return
    const r = rounds[k]
    const right = got[room.me]?.correct
    if (right) { feel.chime(Math.min(k, 6)); feel.medium() } else feel.bad()
    setPhase('reveal')
    timer.current = setTimeout(() => (k + 1 < rounds.length ? ask(k + 1) : setPhase('done')), REVEAL_MS)
    void r
  }, [phase, answers, room.members.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Running totals.
  const totals: Record<string, number> = Object.fromEntries(lineup.map((p) => [p.id, 0]))
  for (let i = 0; i < rounds.length; i++) {
    const done = i < k || phase === 'reveal' || phase === 'done'
    if (!done || !answers[i]) continue
    if (i === k && phase !== 'reveal' && phase !== 'done') continue
    for (const [id, p] of Object.entries(roundPoints(Object.values(answers[i])))) totals[id] = (totals[id] ?? 0) + p
  }

  function ready() {
    setMyName(name)
    room.update({ name, ready: !me?.ready })
  }
  function start() {
    const seats = room.members.map((m, i) => ({ id: m.id, name: m.name, seat: i }))
    const seed = newSeed()
    room.update({ started: seats.map((s) => s.id), ready: false })
    room.send('start', { seed, lineup: seats })
    begin(seed, seats)
  }
  function rematch() {
    setPhase('lobby')
    room.update(room.host ? { ready: true, started: undefined } : { ready: true })
  }

  if (phase === 'lobby') {
    if (room.status === 'full') return <RoomNotice game={game} text={`That room is full (${MAX} players). Ask for a new link, or create your own room.`} onLeave={onLeave} />
    if (room.status === 'started') return <RoomNotice game={game} text="That quiz has already started. Wait for it to finish and ask for a new link, or create your own room." onLeave={onLeave} />
    if (room.status === 'error') return <RoomNotice game={game} text="Couldn’t connect to the room. Check your connection and try again." onLeave={onLeave} />
    const enough = room.members.length >= 2
    const allReady = enough && room.members.every((m) => m.ready)
    return (
      <Stage>
        <div className="stack">
          {room.status === 'connecting' ? <p className="body muted" style={{ margin: 0 }}>Joining room {code}…</p> : <RoomCode code={code} url={url} />}
          <Lobby players={room.members.map((m, i) => ({ name: m.name || PLAYERS[i % PLAYERS.length].name, ready: m.ready, me: m.id === room.me, host: i === 0 }))} max={MAX} />
          {!me?.ready && <TextField id="hl-name" label="Your name (optional)" value={name} onChange={setName} maxLength={16} placeholder="Shown to the other players" />}
          <Button size="lg" block color={game.color} onClick={ready} disabled={room.status !== 'open'} variant={me?.ready ? 'secondary' : 'primary'}>{me?.ready ? 'Not ready' : 'Ready'}</Button>
          {room.host && (
            <Button size="lg" block onClick={start} disabled={!allReady} data-primary="click">
              {!enough ? 'Waiting for someone to join' : allReady ? `Start the quiz (${room.members.length} players)` : 'Waiting for everyone to be ready'}
            </Button>
          )}
          {!room.host && enough && <p className="small muted center" style={{ margin: 0 }}>The host starts the quiz when everyone is ready.</p>}
          <Button variant="ghost" onClick={onLeave}>Leave the room</Button>
        </div>
      </Stage>
    )
  }

  const strip = <ScoreStrip players={lineup.map((p) => ({ name: label(p), score: present(p.id) ? `${totals[p.id] ?? 0}` : `${totals[p.id] ?? 0} · left`, me: p.id === room.me, player: p.seat }))} />

  if (phase === 'done') {
    const order = [...lineup].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0) || a.seat - b.seat)
    const placeOf = (id: string) => 1 + order.filter((p) => (totals[p.id] ?? 0) > (totals[id] ?? 0)).length
    const myPlace = placeOf(room.me)
    const myPts = totals[room.me] ?? 0
    const place = `${ordinal(myPlace)} of ${order.length}`
    return (
      <>
        <Stage style={{ position: 'relative' }}>
          <ol className="sr-ranking" aria-label="Final scores">
            {order.map((p) => (
              <li key={p.id} data-me={p.id === room.me || undefined}>
                <span className="sr-place">{ordinal(placeOf(p.id))}</span>
                <PlayerChip player={p.seat} name={p.id === room.me ? 'You' : label(p)} />
                <span className="sr-level">{totals[p.id] ?? 0} pts{present(p.id) ? '' : ' · left'}</span>
              </li>
            ))}
          </ol>
          {myPlace === 1 && <Burst y="10%" color={game.color} />}
        </Stage>
        <ResultCard
          game={game}
          headline={place}
          detail={`${myPts} points from ${ROUNDS} questions`}
          shareText={`🌍 Higher Lower\n${place} · ${myPts} points`}
          finishData={{ score: myPts, place: myPlace, players: order.length }}
          challenge={{ seed: code, score: myPts, text: `${count(myPts, 'pt')}`, lowerIsBetter: false }}
          plainLink
          onReplay={room.members.length >= 2 ? rematch : onLeave}
          replayLabel={room.members.length >= 2 ? 'Rematch' : 'Back to rooms'}
        />
      </>
    )
  }

  const r = rounds[k]
  const correct = answerFor(r)
  const left = Math.max(0, ANSWER_S - (now - shownAt.current) / 1000)
  const got = answers[k] ?? {}
  const pts = phase === 'reveal' ? roundPoints(Object.values(got)) : {}
  return (
    <>
      <div style={{ marginBottom: 'var(--space-3)' }}>{strip}</div>
      <Stage>
        <div className="stack hl-q">
          <p className="eyebrow muted" style={{ margin: 0 }}>Question {k + 1} of {ROUNDS} · {r.metric === 'population' ? 'population' : 'land area'}</p>
          <div className="hl-cards">
            <div className="hl-card"><span className="hl-name">{nameOf(r.shown)}</span><span className="hl-val">{show(valueOf(r.shown, r.metric), r.metric)}</span></div>
            <div className={`hl-card${phase === 'reveal' ? ' is-revealed' : ''}`}>
              <span className="hl-name">{nameOf(r.hidden)}</span>
              <span className="hl-val">{phase === 'reveal' ? show(valueOf(r.hidden, r.metric), r.metric) : '?'}</span>
            </div>
          </div>
          <p className="body-strong center" style={{ margin: 0 }}>
            Is {nameOf(r.hidden)}’s {r.metric === 'population' ? 'population' : 'land area'} higher or lower?
          </p>
          {phase === 'question' && (
            <>
              <div className="hl-buttons">
                <Button size="lg" block color={game.color} onClick={() => answer('higher')} hint="↑">▲ Higher</Button>
                <Button size="lg" block color={game.color} onClick={() => answer('lower')} hint="↓">▼ Lower</Button>
              </div>
              <span className="hl-timer" style={{ width: `${(left / ANSWER_S) * 100}%` }} aria-hidden="true" />
            </>
          )}
          {phase === 'wait' && <p className="small muted center" style={{ margin: 0 }}>You said {mine ?? 'nothing'}. Waiting for {lineup.filter((p) => present(p.id) && !got[p.id]).map(label).join(', ') || 'everyone'}…</p>}
          {phase === 'reveal' && (
            <p className={`body-strong center hl-verdict${got[room.me]?.correct ? ' is-right' : ''}`} style={{ margin: 0 }} aria-live="polite">
              {correct === 'higher' ? '▲ Higher' : '▼ Lower'} · {got[room.me]?.correct ? `right, +${pts[room.me] ?? 0}` : 'not this time'}
            </p>
          )}
          <p className="small muted center" style={{ margin: 0 }}>Source: {sourceOf(r.metric).name}, {sourceOf(r.metric).year}.</p>
        </div>
      </Stage>
    </>
  )
}
