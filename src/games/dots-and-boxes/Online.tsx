// Dots & Boxes with a friend on their own phone: a room link, the lobby, then turns sent over the room.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getGame } from '../registry'
import { isOver, newGame, play, scores, type Player, type State } from './board'
import { DotsBoard } from './Board'
import { myName, setMyName } from '../../shell/challenge'
import { feel } from '../../shell/feel'
import { goToRoom, roomFromUrl, RoomLanding, RoomNotice } from '../../shell/online'
import { ResultCard } from '../../shell/ResultCard'
import { useRoom, useStepOutIfStale } from '../../shell/room'
import { countPlay } from '../../shell/stats'
import { Button, Lobby, PLAYERS, RoomCode, ScoreStrip, Stage, TextField } from '../../ui'

const game = getGame('dots-and-boxes')
const MAX = 2
const SIZE = 4
const drawnCount = (s: State) => s.lines.filter((x) => x != null).length

export default function Online({ picker }: { picker: ReactNode }) {
  const [code, setCode] = useState<string | null>(roomFromUrl)
  if (!code) return <>{picker}<RoomLanding game={game} intro="Play a friend on their own phone. One of you makes a room and sends the link; the other joins. The host draws first." onRoom={(c) => { goToRoom(c); setCode(c) }} /></>
  return <Room code={code} onLeave={() => { goToRoom(null); setCode(null) }} />
}

function Room({ code, onLeave }: { code: string; onLeave: () => void }) {
  const room = useRoom(game.slug, code, MAX)
  const [name, setName] = useState(myName)
  const [s, setS] = useState<State | null>(null)
  const [left, setLeft] = useState(false)
  // Matches played in this room: the first player swaps each time.
  const [played, setPlayed] = useState(0)
  const tookPart = useRef(false)
  const counted = useRef(false)
  useStepOutIfStale(room, s == null && !tookPart.current)

  const me = room.members.find((m) => m.id === room.me)
  const opponent = room.members.find((m) => m.id !== room.me)
  // The host is player 0 (Coral), the guest player 1 (Aqua).
  const seat: Player = room.members[0]?.id === room.me ? 0 : 1
  const label = (p: Player) => (p === seat ? me?.name : opponent?.name) || PLAYERS[p].name
  const url = `${location.origin}/${game.slug}/?room=${code}`
  const over = s != null && isOver(s)

  // Messages from the other phone: the match starting, and each line drawn (with the whole board,
  // so a missed message is caught up by the next one).
  useEffect(() => {
    const offStart = room.on('start', (p) => begin(p.first as Player))
    const offMove = room.on('move', (p) => {
      const next = p.state as State
      setS((cur) => {
        if (!cur || drawnCount(next) <= drawnCount(cur)) return cur
        if (isOver(next)) feel.done()
        else if (next.last != null && next.boxes.some((b, i) => b != null && cur.boxes[i] == null)) feel.pop(3)
        else feel.light()
        return next
      })
    })
    return () => { offStart(); offMove() }
  })

  // Every finished match counts as played, once.
  useEffect(() => {
    if (over && !counted.current) { counted.current = true; countPlay(game.slug) }
  }, [over])

  // The opponent leaving mid-match ends it.
  useEffect(() => {
    if (s && !over && room.members.length < 2) setLeft(true)
  }, [room.members.length, s, over])

  function begin(f: Player) {
    tookPart.current = true
    room.update({ ready: false })
    setPlayed((n) => n + 1)
    counted.current = false
    setLeft(false)
    setS(newGame(SIZE, SIZE, f))
  }
  function start() {
    const f: Player = played % 2 === 0 ? 0 : 1
    room.update({ started: room.members.map((m) => m.id), ready: false })
    room.send('start', { first: f })
    begin(f)
  }
  function draw(e: number) {
    if (!s || s.turn !== seat || over || left) return
    const { state, claimed } = play(s, e)
    if (state === s) return
    setS(state)
    room.send('move', { state })
    if (claimed) feel.pop(Math.min(scores(state)[seat], 12))
    else feel.light()
  }

  if (room.status === 'full') return <RoomNotice game={game} text="That room already has two players. Ask your friend for a new link, or create your own room." onLeave={onLeave} />
  if (room.status === 'started') return <RoomNotice game={game} text="That match has already started. Wait for it to finish and ask for a new link, or create your own room." onLeave={onLeave} />
  if (room.status === 'error') return <RoomNotice game={game} text="Couldn’t connect to the room. Check your connection and try again." onLeave={onLeave} />

  const both = room.members.length === MAX
  const allReady = both && room.members.every((m) => m.ready)
  if (!s) {
    return (
      <Stage>
        <div className="stack">
          {room.status === 'connecting' ? <p className="body muted" style={{ margin: 0 }}>Joining room {code}…</p> : <RoomCode code={code} url={url} />}
          <Lobby players={room.members.map((m, i) => ({ name: m.name || PLAYERS[i].name, ready: m.ready, me: m.id === room.me, host: i === 0 }))} max={MAX} />
          {!me?.ready && <TextField id="dots-name" label="Your name (optional)" value={name} onChange={setName} maxLength={16} placeholder="Shown to your opponent" />}
          <Button size="lg" block color={game.color} onClick={() => { setMyName(name); room.update({ name, ready: !me?.ready }) }} disabled={room.status !== 'open'} variant={me?.ready ? 'secondary' : 'primary'}>
            {me?.ready ? 'Not ready' : 'Ready'}
          </Button>
          {room.host && <Button size="lg" block onClick={start} disabled={!allReady} data-primary="click">{both ? (allReady ? 'Start the match' : 'Waiting for both to be ready') : 'Waiting for your friend to join'}</Button>}
          {!room.host && both && <p className="small muted center" style={{ margin: 0 }}>The host starts the match when you’re both ready.</p>}
          <Button variant="ghost" onClick={onLeave}>Leave the room</Button>
        </div>
      </Stage>
    )
  }

  const sc = scores(s)
  const mine = sc[seat], theirs = sc[seat === 0 ? 1 : 0]
  const them = label(seat === 0 ? 1 : 0)
  const turnText = left ? `${them} left the match` : over ? '' : s.turn === seat ? 'Your turn' : `${them} is thinking…`
  const names: [string, string] = [seat === 0 ? 'You' : label(0), seat === 1 ? 'You' : label(1)]
  return (
    <>
      <div className="db-strip" data-turn={over || left ? undefined : s.turn}>
        <ScoreStrip players={[{ name: label(0), score: sc[0], player: 0, me: seat === 0 }, { name: label(1), score: sc[1], player: 1, me: seat === 1 }]} />
      </div>
      <p className="small muted center db-turn" aria-live="polite">{turnText}</p>
      <Stage className="db-stage">
        <DotsBoard s={s} canPlay={!over && !left && s.turn === seat} onPlay={draw} names={names} />
      </Stage>
      {(over || left) && (
        <ResultCard
          game={game}
          headline={left && !over ? `${them} left the match` : mine > theirs ? `You beat ${them} ${mine}–${theirs}` : mine < theirs ? `${them} won ${theirs}–${mine}` : `A draw, ${mine}–${theirs}`}
          detail={`${SIZE}×${SIZE} boxes, online`}
          shareText={`✏️ Dots & Boxes\n${mine > theirs ? `I beat ${them}` : mine < theirs ? `${them} beat me` : `A draw with ${them}`} ${Math.max(mine, theirs)}–${Math.min(mine, theirs)}`}
          finishData={{ mode: 'online', mine, theirs }}
          challenge={{ seed: code, score: mine - theirs, text: `${mine}–${theirs}`, lowerIsBetter: false }}
          plainLink
          onReplay={left ? onLeave : () => { setS(null); room.update(room.host ? { ready: true, started: undefined } : { ready: true }) }}
          replayLabel={left ? 'Back to rooms' : 'Rematch'}
        />
      )}
    </>
  )
}
