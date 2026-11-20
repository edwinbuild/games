import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { blanks, DRAW_S, isClose, isRight, wordFor } from './quick-draw/guess'
import { ordinal } from './spot-race/rules'
import { myName, newSeed, setMyName } from '../shell/challenge'
import { feel } from '../shell/feel'
import { clean } from '../shell/filter'
import { drawStroke, pointsFrom, simplify, type P } from '../shell/ink'
import { goToRoom, roomFromUrl, RoomLanding, RoomNotice } from '../shell/online'
import { ResultCard } from '../shell/ResultCard'
import { useRoom, useStepOutIfStale } from '../shell/room'
import { count } from '../shell/plural'
import { Burst, Button, Stage, TextField } from '../ui/components'
import { Lobby, PlayerChip, PLAYERS, RoomCode, ScoreStrip } from '../ui/multiplayer'
import { avatarOf } from '../shell/roomAvatar'
import './quick-draw.css'

const game = getGame('quick-draw')
const MAX = 8
const SIZE = 300
const BETWEEN_MS = 2800
/** Strokes are sent at most this often. */
const SEND_MS = 100

export default function QuickDraw() {
  const [code, setCode] = useState<string | null>(roomFromUrl)
  if (!code) {
    return <RoomLanding game={game} intro="Take turns drawing a word while your friends guess, each on their own phone. Two to eight players." onRoom={(c) => { goToRoom(c); setCode(c) }} />
  }
  return <Room code={code} onLeave={() => { goToRoom(null); setCode(null) }} />
}

type Phase = 'lobby' | 'draw' | 'between' | 'done'
type Seat = { id: string; name: string; seat: number }

function Room({ code, onLeave }: { code: string; onLeave: () => void }) {
  const room = useRoom(game.slug, code, MAX)
  const [name, setName] = useState(myName)
  const [phase, setPhase] = useState<Phase>('lobby')
  // A fresh page load that finds its room's match running (it refreshed mid-match) steps out so nobody waits.
  // Players who have taken part in a match since loading are never stale, even if room updates arrive late.
  const tookPart = useRef(false)
  useStepOutIfStale(room, phase === 'lobby' && !tookPart.current)
  const [seed, setSeed] = useState('')
  const [lineup, setLineup] = useState<Seat[]>([])
  const [k, setK] = useState(0)
  const [ends, setEnds] = useState<Record<number, string | null>>({})
  const [feed, setFeed] = useState<{ from: string; text: string }[]>([])
  const [guess, setGuess] = useState('')
  const [note, setNote] = useState('')
  const [gotIt, setGotIt] = useState(false)
  const [now, setNow] = useState(0)
  const roundStart = useRef(0)
  const strokes = useRef(new Map<string, P[]>())
  const outbox = useRef<{ id: string; pts: P[] } | null>(null)
  const strokeCount = useRef(0)
  const drawing = useRef(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const firstCorrect = useRef<{ id: string; ms: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const me = room.members.find((m) => m.id === room.me)
  const present = (id: string) => room.members.some((m) => m.id === id)
  const url = `${location.origin}/${game.slug}/?room=${code}`
  const label = (p?: Seat) => (p ? p.name || PLAYERS[p.seat % PLAYERS.length].name : '')
  const seatOf = (id: string) => lineup.find((p) => p.id === id)
  const drawer = lineup.length ? lineup[k % lineup.length] : undefined
  const iDraw = drawer?.id === room.me
  const word = seed ? wordFor(seed, k) : ''
  const hostId = lineup.find((p) => present(p.id))?.id

  // Scores from the ends so far: the first right guesser gets 2, the drawer 1.
  const scores: Record<string, number> = Object.fromEntries(lineup.map((p) => [p.id, 0]))
  for (const [r, winner] of Object.entries(ends)) {
    if (!winner) continue
    scores[winner] = (scores[winner] ?? 0) + 2
    const d = lineup[+r % lineup.length]
    if (d) scores[d.id] = (scores[d.id] ?? 0) + 1
  }

  useEffect(() => {
    const offs = [
      room.on('start', (p) => begin(String(p.seed), p.lineup as Seat[])),
      room.on('ink', (p) => {
        if (Number(p.round) !== kRef.current) return
        const id = String(p.id)
        const pts = (p.pts as [number, number][]).map(([x, y]) => ({ x, y }))
        strokes.current.set(id, [...(strokes.current.get(id) ?? []), ...pts])
        paint()
      }),
      room.on('guess', (p, from) => { if (Number(p.round) === kRef.current) setFeed((f) => [...f.slice(-30), { from, text: clean(String(p.text)) }]) }),
      room.on('correct', (p, from) => {
        // Only the drawer decides who was first, so every phone agrees.
        if (Number(p.round) !== kRef.current || drawerRef.current !== room.me || firstCorrect.current) return
        firstCorrect.current = { id: from, ms: Number(p.ms) }
        finishRound(from)
      }),
      room.on('end', (p) => applyEnd(Number(p.round), (p.winner as string | null) ?? null)),
    ]
    return () => offs.forEach((off) => off())
  })
  const kRef = useRef(k); kRef.current = k
  const drawerRef = useRef(drawer?.id); drawerRef.current = drawer?.id

  function begin(s: string, seats: Seat[]) {
    tookPart.current = true
    room.update({ ready: false }) // everyone starts the next lobby not ready
    setSeed(s)
    setLineup(seats)
    lineupRef.current = seats
    setEnds({})
    ended.current = new Set()
    startRound(0)
  }
  function startRound(round: number) {
    setK(round)
    kRef.current = round
    strokes.current = new Map()
    firstCorrect.current = null
    setFeed([])
    setNote('')
    setGuess('')
    setGotIt(false)
    roundStart.current = performance.now()
    setPhase('draw')
    requestAnimationFrame(paint)
  }

  /** The drawer (or the host if the drawer has gone) ends the round for everyone. */
  function finishRound(winner: string | null) {
    room.send('end', { round: kRef.current, winner })
    applyEnd(kRef.current, winner)
  }
  const ended = useRef(new Set<number>())
  function applyEnd(round: number, winner: string | null) {
    if (ended.current.has(round)) return
    ended.current.add(round)
    if (winner === room.me) { feel.chime(4); feel.success() } else if (winner) { feel.good() } else { feel.thud() }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => (round + 1 < lineupRef.current.length ? startRound(round + 1) : setPhase('done')), BETWEEN_MS)
    setEnds((e) => ({ ...e, [round]: winner }))
    setPhase('between')
  }
  const lineupRef = useRef(lineup); lineupRef.current = lineup

  // The drawing clock; and if the drawer leaves, the host moves on.
  useEffect(() => {
    if (phase !== 'draw') return
    const id = setInterval(() => {
      setNow(performance.now())
      const late = performance.now() - roundStart.current >= DRAW_S * 1000
      if (late && iDraw) finishRound(null)
      if (drawer && !present(drawer.id) && hostId === room.me) finishRound(null)
    }, 200)
    return () => clearInterval(id)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  // Sending strokes in small batches.
  useEffect(() => {
    if (phase !== 'draw' || !iDraw) return
    const id = setInterval(() => {
      const o = outbox.current
      if (!o || o.pts.length === 0) return
      const pts = simplify(o.pts, 0.8).map((p) => [Math.round(p.x), Math.round(p.y)])
      room.send('ink', { round: k, id: o.id, pts })
      outbox.current = { id: o.id, pts: o.pts.slice(-1) }
    }, SEND_MS)
    return () => clearInterval(id)
  }, [phase, iDraw, k]) // eslint-disable-line react-hooks/exhaustive-deps

  function paint() {
    const c = canvas.current
    if (!c) return
    const g = c.getContext('2d')!
    const scale = c.width / SIZE
    const ink = getComputedStyle(c).getPropertyValue('--ink').trim() || '#000'
    g.clearRect(0, 0, c.width, c.height)
    g.strokeStyle = ink; g.lineWidth = 4.5 * scale; g.lineCap = 'round'; g.lineJoin = 'round'
    for (const pts of strokes.current.values()) drawStroke(g, pts, scale)
    c.dataset.strokes = String(strokes.current.size)
  }
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ro = new ResizeObserver(([e]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      c.width = c.height = Math.round(e.contentRect.width * dpr)
      paint()
    })
    ro.observe(c)
    return () => ro.disconnect()
  }, [phase === 'draw' || phase === 'between']) // eslint-disable-line react-hooks/exhaustive-deps

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!iDraw || phase !== 'draw') return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const id = `${room.me}-${strokeCount.current++}`
    const pts = pointsFrom(e.nativeEvent, e.currentTarget, SIZE, SIZE)
    strokes.current.set(id, pts.slice())
    outbox.current = { id, pts: pts.slice() }
    paint()
  }
  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !outbox.current) return
    const pts = pointsFrom(e.nativeEvent, e.currentTarget, SIZE, SIZE)
    const id = outbox.current.id
    strokes.current.set(id, [...(strokes.current.get(id) ?? []), ...pts])
    outbox.current.pts.push(...pts)
    paint()
  }
  function onUp() { drawing.current = false }

  function submitGuess() {
    const text = guess.trim().slice(0, 24)
    setGuess('')
    if (!text || iDraw || phase !== 'draw' || gotIt) return
    if (isRight(text, word)) {
      setGotIt(true)
      setNote('')
      feel.click()
      room.send('correct', { round: k, ms: Math.round(performance.now() - roundStart.current) })
      return
    }
    if (isClose(text, word)) { setNote(`“${clean(text)}” is close!`); feel.tap(); return }
    setNote('')
    const shown = clean(text)
    room.send('guess', { round: k, text: shown })
    setFeed((f) => [...f.slice(-30), { from: room.me, text: shown }])
  }

  function ready() {
    setMyName(name)
    room.update({ name, ready: !me?.ready })
  }
  function start() {
    const seats = room.members.map((m, i) => ({ id: m.id, name: m.name, seat: i }))
    const s = newSeed()
    room.update({ started: seats.map((x) => x.id), ready: false })
    room.send('start', { seed: s, lineup: seats })
    begin(s, seats)
  }
  function rematch() {
    setPhase('lobby')
    room.update(room.host ? { ready: true, started: undefined } : { ready: true })
  }

  if (phase === 'lobby') {
    if (room.status === 'full') return <RoomNotice game={game} text={`That room is full (${MAX} players). Ask for a new link, or create your own room.`} onLeave={onLeave} />
    if (room.status === 'started') return <RoomNotice game={game} text="That game has already started. Wait for it to finish and ask for a new link, or create your own room." onLeave={onLeave} />
    if (room.status === 'error') return <RoomNotice game={game} text="Couldn’t connect to the room. Check your connection and try again." onLeave={onLeave} />
    const enough = room.members.length >= 2
    const allReady = enough && room.members.every((m) => m.ready)
    return (
      <Stage>
        <div className="stack">
          <RoomCode code={code} url={url} />
          {room.status === 'connecting' && <p className="small muted" role="status" style={{ margin: 0 }}>Connecting to the room…</p>}
          <Lobby players={room.members.map((m, i) => ({ name: m.name || PLAYERS[i % PLAYERS.length].name, ready: m.ready, avatar: avatarOf(m), me: m.id === room.me, host: i === 0 }))} max={MAX} />
          {!me?.ready && <TextField id="qd-name" label="Your name (optional)" value={name} onChange={(v) => setName(clean(v, 16) === '•••' ? '' : v)} maxLength={16} placeholder="Shown to the other players" />}
          <Button size="lg" block color={game.color} onClick={ready} disabled={room.status !== 'open'} variant={me?.ready ? 'secondary' : 'primary'}>{me?.ready ? 'Not ready' : 'Ready'}</Button>
          {room.host && (
            <Button size="lg" block onClick={start} disabled={!allReady} data-primary="click">
              {!enough ? 'Waiting for someone to join' : allReady ? `Start drawing (${room.members.length} players)` : 'Waiting for everyone to be ready'}
            </Button>
          )}
          {!room.host && enough && <p className="small muted center" style={{ margin: 0 }}>The host starts when everyone is ready. Everyone draws once.</p>}
          <Button variant="ghost" onClick={onLeave}>Leave the room</Button>
        </div>
      </Stage>
    )
  }

  const strip = <ScoreStrip players={lineup.map((p) => ({ name: label(p), score: present(p.id) ? `${scores[p.id] ?? 0}` : `${scores[p.id] ?? 0} · left`, me: p.id === room.me, player: p.seat }))} />

  if (phase === 'done') {
    const order = [...lineup].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0) || a.seat - b.seat)
    const placeOf = (id: string) => 1 + order.filter((p) => (scores[p.id] ?? 0) > (scores[id] ?? 0)).length
    const myPlace = placeOf(room.me), myPts = scores[room.me] ?? 0
    const place = `${ordinal(myPlace)} of ${order.length}`
    return (
      <>
        <Stage style={{ position: 'relative' }}>
          <ol className="sr-ranking" aria-label="Final scores">
            {order.map((p) => (
              <li key={p.id} data-me={p.id === room.me || undefined}>
                <span className="sr-place">{ordinal(placeOf(p.id))}</span>
                <PlayerChip player={p.seat} name={p.id === room.me ? 'You' : label(p)} />
                <span className="sr-level">{scores[p.id] ?? 0} pts{present(p.id) ? '' : ' · left'}</span>
              </li>
            ))}
          </ol>
          {myPlace === 1 && myPts > 0 && <Burst y="10%" color={game.color} />}
        </Stage>
        <ResultCard
          game={game}
          headline={place}
          detail={`${myPts} points · 2 for guessing first, 1 for drawing something guessed`}
          shareText={`✏️ Quick Draw\n${place} · ${myPts} points`}
          finishData={{ score: myPts, place: myPlace, players: order.length }}
          challenge={{ seed: code, score: myPts, text: `${count(myPts, 'pt')}`, lowerIsBetter: false }}
          plainLink
          onReplay={room.members.length >= 2 ? rematch : onLeave}
          replayLabel={room.members.length >= 2 ? 'Rematch' : 'Back to rooms'}
        />
      </>
    )
  }

  const winner = ends[k]
  const left = Math.max(0, DRAW_S - (now - roundStart.current) / 1000)
  return (
    <>
      <div style={{ marginBottom: 'var(--space-3)' }}>{strip}</div>
      <Stage className="qd-stage" style={{ position: 'relative' }}>
        <div className="stack">
          <div className="between">
            <span className="small muted">Round {k + 1} of {lineup.length} · {iDraw ? 'you draw' : `${label(drawer)} draws`}</span>
            {phase === 'draw' && <span className="small" style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.ceil(left)}s</span>}
          </div>
          {iDraw || phase === 'between'
            ? <p className="qd-word" aria-live="polite">{phase === 'between' ? `It was “${word}”${winner ? ` · ${winner === room.me ? 'you' : label(seatOf(winner))} got it` : ' · nobody got it'}` : word}</p>
            : <p className="qd-blanks" aria-label={`${word.replace(/ /g, '').length} letters`}>{blanks(word)}</p>}
          <canvas
            ref={canvas}
            className={`qd-canvas${iDraw && phase === 'draw' ? ' is-mine' : ''}`}
            role={iDraw ? 'application' : 'img'}
            aria-label={iDraw ? `Draw “${word}”` : 'The drawing so far'}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
          {phase === 'draw' && !iDraw && (
            gotIt
              ? <p className="body-strong center" style={{ margin: 0, color: 'var(--success)' }}>You got it! Waiting for the round to end…</p>
              : (
                <form className="qd-guess" onSubmit={(e) => { e.preventDefault(); submitGuess() }}>
                  <TextField id="qd-guess" label="Your guess" value={guess} onChange={setGuess} maxLength={24} placeholder="Type and press Enter" />
                  <Button type="submit" color={game.color}>Guess</Button>
                </form>
              )
          )}
          {note && <p className="small center" style={{ margin: 0 }} aria-live="polite">{note}</p>}
          {iDraw && phase === 'draw' && <p className="small muted center" style={{ margin: 0 }}>Draw with your finger or the mouse. No letters or numbers!</p>}
          {feed.length > 0 && (
            <ul className="qd-feed" aria-label="Guesses">
              {feed.slice(-6).map((f, i) => <li key={i}><b>{f.from === room.me ? 'You' : label(seatOf(f.from))}:</b> {f.text}</li>)}
            </ul>
          )}
        </div>
        {phase === 'between' && winner === room.me && <Burst y="20%" color={game.color} />}
      </Stage>
    </>
  )
}
