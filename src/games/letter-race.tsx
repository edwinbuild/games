import { useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { allWords, check, lettersFor, pointsFor, ROUND_S, score, type Verdict } from './letter-race/rules'
import { loadWords, type WordList } from './letter-race/words'
import { ordinal } from './spot-race/rules'
import { myName, newSeed, setMyName } from '../shell/challenge'
import { feel } from '../shell/feel'
import { goToRoom, roomFromUrl, RoomLanding, RoomNotice } from '../shell/online'
import { ResultCard } from '../shell/ResultCard'
import { useRoom, useStepOutIfStale } from '../shell/room'
import { count } from '../shell/plural'
import { load } from '../shell/storage'
import { Burst, Button, Stage, TextField } from '../ui/components'
import { Lobby, PlayerChip, PLAYERS, RoomCode, ScoreStrip } from '../ui/multiplayer'
import { avatarOf } from '../shell/roomAvatar'
import './letter-race.css'

const game = getGame('letter-race')
const MAX = 8
const COUNTDOWN_MS = 3000
/** After time's up, how long to wait for everyone's words before scoring what has arrived. */
const COLLECT_MS = 8000
const SAY: Record<Exclude<Verdict, 'ok'>, string> = {
  short: 'Three letters or more.',
  letters: 'Only the letters on the tiles (each as often as it shows).',
  again: 'You have that one already.',
  unknown: 'Not in the word list.',
}

export default function LetterRace() {
  const [code, setCode] = useState<string | null>(roomFromUrl)
  if (!code) {
    return <RoomLanding game={game} intro="Two to eight friends, each on their own phone, get the same seven letters and one minute. Make as many words as you can: longer words score more, and a word nobody else found scores double." onRoom={(c) => { goToRoom(c); setCode(c) }} />
  }
  return <Room code={code} onLeave={() => { goToRoom(null); setCode(null) }} />
}

type Phase = 'lobby' | 'play' | 'wait' | 'done'
type Seat = { id: string; name: string; seat: number }

function Room({ code, onLeave }: { code: string; onLeave: () => void }) {
  const room = useRoom(game.slug, code, MAX)
  const [name, setName] = useState(myName)
  const [phase, setPhase] = useState<Phase>('lobby')
  const tookPart = useRef(false)
  useStepOutIfStale(room, phase === 'lobby' && !tookPart.current)
  const [list, setList] = useState<WordList | null>(null)
  const words = list?.words ?? null
  const [failed, setFailed] = useState(false)
  const [letters, setLetters] = useState<string[]>([])
  const [order, setOrder] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [picked, setPickedState] = useState<number[]>([]) // tile indexes, in the order tapped
  // Kept in a ref too, so fast typing (several keys before a redraw) never loses a letter.
  const pickedRef = useRef<number[]>([])
  const setPicked = (v: number[]) => { pickedRef.current = v; setPickedState(v) }
  const [found, setFound] = useState<string[]>([])
  const [msg, setMsg] = useState<{ text: string; good: boolean } | null>(null)
  const [lineup, setLineup] = useState<Seat[]>([])
  const [lists, setLists] = useState<Record<string, string[]>>({})
  const [now, setNow] = useState(0)
  const startAt = useRef(0)
  const endAt = useRef(0)
  const roundMs = useMemo(() => load<number>('test-round', ROUND_S) * 1000, [])
  const me = room.members.find((m) => m.id === room.me)
  const present = (id: string) => room.members.some((m) => m.id === id)
  const url = `${location.origin}/${game.slug}/?room=${code}`
  const label = (p: Seat) => p.name || PLAYERS[p.seat % PLAYERS.length].name
  const word = picked.map((i) => letters[i]).join('')

  useEffect(() => { loadWords().then(setList, () => setFailed(true)) }, [])

  useEffect(() => {
    const offs = [
      room.on('start', (p) => begin(String(p.seed), p.lineup as Seat[])),
      room.on('words', (p, from) => setLists((all) => ({ ...all, [from]: Array.isArray(p.list) ? (p.list as unknown[]).map(String).slice(0, 300) : [] }))),
    ]
    return () => offs.forEach((off) => off())
  })

  function begin(seed: string, seats: Seat[]) {
    tookPart.current = true
    room.update({ ready: false })
    setLetters(list ? lettersFor(seed, list.seeds) : [])
    setOrder([0, 1, 2, 3, 4, 5, 6])
    setPicked([])
    setFound([])
    setMsg(null)
    setLists({})
    setLineup(seats)
    startAt.current = performance.now() + COUNTDOWN_MS
    endAt.current = startAt.current + roundMs
    setNow(performance.now())
    setPhase('play')
  }

  // The clock: a tick for the countdown, then time's up sends this phone's words.
  const sent = useRef(false)
  useEffect(() => {
    if (phase !== 'play') return
    sent.current = false
    let lastBeat = -1
    const id = setInterval(() => {
      const t = performance.now()
      setNow(t)
      const toGo = Math.ceil((startAt.current - t) / 1000)
      if (toGo > 0 && toGo !== lastBeat) { lastBeat = toGo; feel.tick(4 - toGo) }
      if (t >= endAt.current && !sent.current) finish()
    }, 100)
    return () => clearInterval(id)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const foundRef = useRef(found)
  foundRef.current = found
  function finish() {
    sent.current = true
    const list = foundRef.current
    room.send('words', { list })
    setLists((all) => ({ ...all, [room.me]: list }))
    feel.thud()
    setPhase('wait')
  }

  // Scored when every player still here has sent their words, or after a short wait.
  useEffect(() => {
    if (phase !== 'wait') return
    const missing = lineup.filter((p) => present(p.id) && !lists[p.id])
    if (!missing.length) { setPhase('done'); return }
    const t = setTimeout(() => setPhase('done'), COLLECT_MS)
    return () => clearTimeout(t)
  }, [phase, lists, room.members.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const playing = phase === 'play' && now >= startAt.current && now < endAt.current
  function tap(i: number) {
    const cur = pickedRef.current
    if (!playing || cur.includes(i)) return
    setPicked([...cur, i])
    setMsg(null)
    feel.light()
  }
  function back() { const cur = pickedRef.current; if (playing && cur.length) { setPicked(cur.slice(0, -1)); feel.tap() } }
  function submit() {
    const word = pickedRef.current.map((i) => letters[i]).join('')
    if (!playing || !words || !word) return
    const v = check(word, letters, words, foundRef.current)
    if (v === 'ok') {
      foundRef.current = [word, ...foundRef.current]
      setFound(foundRef.current)
      setMsg({ text: `${word.toUpperCase()} +${pointsFor(word)}`, good: true })
      feel.chime(Math.min(word.length, 8))
      feel.success()
    } else {
      setMsg({ text: SAY[v], good: false })
      feel.bad()
    }
    setPicked([])
  }
  function shuffle() {
    const o = [...order]
    for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]] }
    setOrder(o)
    feel.tap()
  }

  // Keyboard: type letters, Backspace, Enter; Escape clears; Space shuffles.
  useEffect(() => {
    if (phase !== 'play') return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, textarea')) return
      if (e.key === 'Enter') { e.preventDefault(); submit() }
      else if (e.key === 'Backspace') { e.preventDefault(); back() }
      else if (e.key === 'Escape') setPicked([])
      else if (e.key === ' ') { e.preventDefault(); shuffle() }
      else if (/^[a-z]$/i.test(e.key)) {
        const c = e.key.toLowerCase()
        const i = order.find((k) => letters[k] === c && !pickedRef.current.includes(k))
        if (i != null) tap(i)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

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
    if (room.status === 'started') return <RoomNotice game={game} text="That race has already started. Wait for it to finish and ask for a new link, or create your own room." onLeave={onLeave} />
    if (room.status === 'error') return <RoomNotice game={game} text="Couldn’t connect to the room. Check your connection and try again." onLeave={onLeave} />
    const enough = room.members.length >= 2
    const allReady = enough && room.members.every((m) => m.ready)
    return (
      <Stage>
        <div className="stack">
          <RoomCode code={code} url={url} />
          {room.status === 'connecting' && <p className="small muted" role="status" style={{ margin: 0 }}>Connecting to the room…</p>}
          <Lobby players={room.members.map((m, i) => ({ name: m.name || PLAYERS[i % PLAYERS.length].name, ready: m.ready, avatar: avatarOf(m), me: m.id === room.me, host: i === 0 }))} max={MAX} />
          {failed && <p className="small center" role="status" style={{ margin: 0 }}>Couldn’t load the word list. Check your connection and reload.</p>}
          {!me?.ready && <TextField id="lr-name" label="Your name (optional)" value={name} onChange={setName} maxLength={16} placeholder="Shown to the other players" />}
          <Button size="lg" block color={game.color} onClick={ready} disabled={room.status !== 'open' || !words} variant={me?.ready ? 'secondary' : 'primary'}>
            {!words ? 'Loading words…' : me?.ready ? 'Not ready' : 'Ready'}
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

  if (phase === 'done' && words) {
    const results = score(Object.fromEntries(lineup.filter((p) => lists[p.id]).map((p) => [p.id, lists[p.id]])), letters, words)
    const pts = (id: string) => results.find((r) => r.id === id)?.points ?? 0
    const ranked = [...lineup].sort((a, b) => pts(b.id) - pts(a.id) || a.seat - b.seat)
    const placeOf = (id: string) => 1 + ranked.filter((p) => pts(p.id) > pts(id)).length
    const mine = results.find((r) => r.id === room.me)
    const myPlace = placeOf(room.me)
    const place = `${ordinal(myPlace)} of ${ranked.length}`
    const anyone = new Set(results.flatMap((r) => r.words.map((w) => w.word)))
    const missed = allWords(letters, words).filter((w) => !anyone.has(w))
    return (
      <>
        <Stage style={{ position: 'relative' }}>
          <div className="stack">
            <p className="lr-letters-done" aria-label={`The letters: ${letters.join(' ').toUpperCase()}`}>{letters.join('').toUpperCase()}</p>
            <ol className="sr-ranking" aria-label="Final scores">
              {ranked.map((p) => (
                <li key={p.id} data-me={p.id === room.me || undefined}>
                  <span className="sr-place">{ordinal(placeOf(p.id))}</span>
                  <PlayerChip player={p.seat} name={p.id === room.me ? 'You' : label(p)} />
                  <span className="sr-level">{pts(p.id)} pts{lists[p.id] ? '' : present(p.id) ? ' · no words came' : ' · left'}</span>
                </li>
              ))}
            </ol>
            {ranked.filter((p) => lists[p.id]).map((p) => {
              const r = results.find((x) => x.id === p.id)
              return (
                <div key={p.id} className="lr-list">
                  <p className="eyebrow muted" style={{ margin: 0 }}>{p.id === room.me ? 'Your words' : `${label(p)}’s words`}</p>
                  <p className="lr-words">{r?.words.length ? r.words.map((w) => <span key={w.word} className={w.only ? 'lr-word is-only' : 'lr-word'}>{w.word}{w.only ? ' ★' : ''} <small>{w.points}</small></span>) : <span className="muted">none</span>}</p>
                </div>
              )
            })}
            <p className="small muted" style={{ margin: 0 }}>★ only that player found it: double points. {missed.length ? `Nobody found ${missed.length > 8 ? `${missed.length} words, like ` : ''}${missed.slice(0, 8).map((w) => w.toUpperCase()).join(', ')}.` : 'Every word was found!'}</p>
          </div>
          {myPlace === 1 && <Burst y="10%" color={game.color} />}
        </Stage>
        <ResultCard
          game={game}
          headline={place}
          detail={`${mine?.points ?? 0} points from ${count(mine?.words.length ?? 0, 'word')}${mine?.words.some((w) => w.only) ? ` · ${mine.words.filter((w) => w.only).length} only you found` : ''}`}
          shareText={`🔤 Letter Race\n${place} · ${mine?.points ?? 0} points, ${count(mine?.words.length ?? 0, 'word')}${mine?.words[0] ? `\nLongest: ${mine.words.reduce((a, b) => (b.word.length > a.word.length ? b : a)).word.length} letters` : ''}`}
          finishData={{ score: mine?.points ?? 0, place: myPlace, players: ranked.length, words: mine?.words.length ?? 0 }}
          challenge={{ seed: code, score: mine?.points ?? 0, text: count(mine?.points ?? 0, 'pt'), lowerIsBetter: false }}
          plainLink
          onReplay={room.members.length >= 2 ? rematch : onLeave}
          replayLabel={room.members.length >= 2 ? 'Rematch' : 'Back to rooms'}
        />
      </>
    )
  }

  const toGo = Math.ceil((startAt.current - now) / 1000)
  const left = Math.max(0, (endAt.current - now) / 1000)
  const myPts = found.reduce((t, w) => t + pointsFor(w), 0)
  return (
    <>
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <ScoreStrip players={lineup.map((p) => ({ name: label(p), score: p.id === room.me ? `${myPts}` : present(p.id) ? '…' : 'left', me: p.id === room.me, player: p.seat }))} />
      </div>
      <Stage>
        <div className="stack lr-play">
          {phase === 'wait' ? (
            <p className="body-strong center" style={{ margin: 0 }} aria-live="polite">Time’s up! Waiting for everyone’s words…</p>
          ) : toGo > 0 ? (
            <p className="lr-count" aria-live="assertive">{toGo}</p>
          ) : (
            <>
              <div className="between">
                <span className="small muted">{count(found.length, 'word')} · {myPts} pts</span>
                <span className={`lr-clock${left < 10 ? ' is-low' : ''}`} aria-live="off">{Math.ceil(left)}s</span>
              </div>
              <span className="hl-timer" style={{ width: `${(left / (roundMs / 1000)) * 100}%` }} aria-hidden="true" />
              <p className={`lr-word-now${word ? '' : ' is-empty'}`} aria-live="polite">{word ? word.toUpperCase() : 'Tap letters'}</p>
              <div className="lr-tiles" role="group" aria-label="Letters">
                {order.map((i) => (
                  <button key={i} type="button" className={`lr-tile${picked.includes(i) ? ' is-used' : ''}`} onClick={() => tap(i)} disabled={picked.includes(i)} aria-label={letters[i].toUpperCase()}>
                    {letters[i].toUpperCase()}
                  </button>
                ))}
              </div>
              <p className={`small center lr-msg${msg?.good ? ' is-good' : ''}`} role="status">{msg?.text ?? ' '}</p>
              <div className="lr-keys">
                <Button variant="secondary" onClick={shuffle} aria-label="Shuffle the letters">🔀</Button>
                <Button variant="secondary" onClick={back} disabled={!picked.length} aria-label="Delete the last letter">⌫</Button>
                <Button color={game.color} onClick={submit} disabled={word.length < 3} hint="Enter">Enter</Button>
              </div>
            </>
          )}
          {found.length > 0 && (
            <p className="lr-words" aria-label="Your words">{found.map((w) => <span key={w} className="lr-word">{w} <small>{pointsFor(w)}</small></span>)}</p>
          )}
        </div>
      </Stage>
    </>
  )
}
