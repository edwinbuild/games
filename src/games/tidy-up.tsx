import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { getGame } from './registry'
import { boardFor, CELL, COLS, finalTime, H, judge, MESS, NAMES, ORG, ROWS, W, type Item } from './tidy-up/rules'
import { FILL, SHAPE } from './tidy-up/icons'
import { newSeed, readChallenge } from '../shell/challenge'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, recordPlay } from '../shell/stats'
import { Burst, Score, Stage } from '../ui'

const game = getGame('tidy-up')
const SIZE = 58 // drawn size of a thing, in world units
type Live = Item & { id: number; home: { x: number; y: number }; placed: boolean; mood?: 'snap' | 'nope' | 'wrong' }

const pct = (v: number, of: number) => `${(v / of) * 100}%`

export default function TidyUp() {
  const challenge = readChallenge(game.slug)
  const [seed, setSeed] = useState(() => challenge?.s ?? newSeed())
  const [board, setBoard] = useState(() => boardFor(seed))
  const [items, setItems] = useState<Live[]>(() => board.items.map((it, id) => ({ ...it, id, home: { x: it.x, y: it.y }, placed: false })))
  const [wrong, setWrong] = useState(0)
  const [startAt, setStartAt] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [result, setResult] = useState<number | null>(null)
  const [closing, setClosing] = useState(false)
  const [fresh, setFresh] = useState(false)
  const drag = useRef<{ id: number; px: number; py: number; moved: boolean; at: number; el: HTMLElement } | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const top = useRef(100)
  const filled = board.slots.map((s) => items.some((i) => i.placed && i.kind === s.kind))
  const done = items.every((i) => i.placed)

  useEffect(() => {
    if (startAt == null || done) return
    const t = setInterval(() => setNow(performance.now()), 100)
    return () => clearInterval(t)
  }, [startAt, done])

  function start() { if (startAt == null) { setStartAt(performance.now()); setNow(performance.now()) } }
  const update = (id: number, patch: Partial<Live>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  /** Let go of an item at a world position. */
  function drop(it: Live, x: number, y: number) {
    const j = judge(it.kind, x, y, it.turns, board.slots, filled)
    if (j.result === 'snap') {
      const s = board.slots[j.slot]
      feel.click()
      feel.light()
      const next = items.map((i) => (i.id === it.id ? { ...i, x: s.x, y: s.y, placed: true, mood: 'snap' as const } : i))
      setItems(next)
      if (next.every((i) => i.placed)) finish()
    } else if (j.result === 'wrong-slot') {
      feel.bad()
      setWrong((w) => w + 1)
      update(it.id, { x: it.home.x, y: it.home.y, mood: 'wrong' })
    } else if (j.result === 'wrong-way') {
      feel.tap()
      update(it.id, { x, y: y + 34, mood: 'nope' })
    } else {
      update(it.id, { x: Math.max(SIZE / 2, Math.min(W - SIZE / 2, x)), y: Math.max(SIZE / 2, Math.min(H - SIZE / 2, y)), home: { x, y }, mood: undefined })
    }
  }

  function finish() {
    const t = finalTime((performance.now() - (startAt ?? performance.now())) / 1000, wrong)
    setResult(t)
    setClosing(true)
    feel.chime(4)
    feel.success()
    recordPlay(game.slug, t, (a, b) => a < b, `${t.toFixed(1)}s`)
    setFresh(true)
  }

  function rotate(it: Live) {
    if (it.placed) return
    start()
    feel.tap()
    update(it.id, { turns: it.turns + 1, mood: undefined })
  }

  function onDown(e: PointerEvent<HTMLButtonElement>, it: Live) {
    if (it.placed) return
    e.preventDefault()
    start()
    e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.style.zIndex = String(++top.current)
    drag.current = { id: it.id, px: e.clientX, py: e.clientY, moved: false, at: performance.now(), el: e.currentTarget }
  }
  function onMove(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.px, dy = e.clientY - d.py
    if (Math.hypot(dx, dy) > 6) d.moved = true
    if (d.moved) d.el.style.translate = `${dx}px ${dy}px`
  }
  function onUp(e: PointerEvent<HTMLButtonElement>, it: Live) {
    const d = drag.current
    drag.current = null
    if (!d) return
    d.el.style.translate = ''
    if (!d.moved) return rotate(it)
    const k = W / (stage.current?.getBoundingClientRect().width || W)
    drop(it, it.x + (e.clientX - d.px) * k, it.y + (e.clientY - d.py) * k)
  }
  function onKey(e: KeyboardEvent<HTMLButtonElement>, it: Live) {
    if (it.placed) return
    const step = e.shiftKey ? 2 : 8
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    if (e.key in moves) {
      e.preventDefault()
      start()
      const [dx, dy] = moves[e.key]
      update(it.id, { x: Math.max(SIZE / 2, Math.min(W - SIZE / 2, it.x + dx)), y: Math.max(SIZE / 2, Math.min(H - SIZE / 2, it.y + dy)), mood: undefined })
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault()
      rotate(it)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      start()
      drop(it, it.x, it.y)
    }
  }

  function again() {
    const next = challenge ? seed : newSeed()
    const b = boardFor(next)
    setSeed(next)
    setBoard(b)
    setItems(b.items.map((it, id) => ({ ...it, id, home: { x: it.x, y: it.y }, placed: false })))
    setWrong(0)
    setStartAt(null)
    setResult(null)
    setClosing(false)
  }

  // Show the ticket a moment after the lid closes.
  const [showTicket, setShowTicket] = useState(false)
  useEffect(() => {
    if (!closing) { setShowTicket(false); return }
    const t = setTimeout(() => setShowTicket(true), 1300)
    return () => clearTimeout(t)
  }, [closing])

  const best = getStats(game.slug).best
  const elapsed = startAt == null ? 0 : ((closing && result != null ? result : (now - startAt) / 1000 + wrong * 2))
  const left = items.filter((i) => !i.placed).length
  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <Score label={startAt == null ? 'Starts on first touch' : 'Time'} value={`${elapsed.toFixed(1)}s`} size="md" />
        <Score label="Left" value={left} size="md" />
      </div>
      <Stage flush>
        <div ref={stage} className="tu-board" role="group" aria-label="A tray of things and an organiser. Drag each thing into its outline, the right way round. Tap a thing to turn it.">
          <div className="tu-tray" style={{ left: pct(ORG.x - 8, W), top: pct(ORG.y - 8, H), width: pct(COLS * CELL + 16, W), height: pct(ROWS * CELL + 16, H) }}>
            <span className={`tu-lid${closing ? ' is-closed' : ''}`} />
          </div>
          {board.slots.map((s, i) => (
            <svg key={s.kind} className={`tu-slot${filled[i] ? ' is-filled' : ''}`} viewBox="0 0 48 48" aria-hidden="true" data-kind={s.kind} data-turns={s.turns}
              style={{ left: pct(s.x - SIZE / 2, W), top: pct(s.y - SIZE / 2, H), width: pct(SIZE, W), height: pct(SIZE, H), rotate: `${s.turns * 90}deg` }}>
              {SHAPE[s.kind]}
            </svg>
          ))}
          <span className="tu-mess-label small muted" style={{ top: pct(MESS.y - 22, H) }}>Tap to turn · drag to put away</span>
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              className={`tu-item${it.placed ? ' is-placed' : ''}${it.mood ? ` is-${it.mood}` : ''}`}
              data-kind={it.kind}
              data-turns={it.turns % 4}
              style={{ left: pct(it.x - SIZE / 2, W), top: pct(it.y - SIZE / 2, H), width: pct(SIZE, W), height: pct(SIZE, H), rotate: `${it.turns * 90}deg`, '--qg-fill': `var(--${FILL[it.kind]})` } as CSSProperties}
              aria-label={`${NAMES[it.kind]}${it.placed ? ', put away' : `, turned ${(it.turns % 4) * 90} degrees`}`}
              aria-disabled={it.placed || undefined}
              tabIndex={it.placed ? -1 : 0}
              onPointerDown={(e) => onDown(e, it)}
              onPointerMove={onMove}
              onPointerUp={(e) => onUp(e, it)}
              onPointerCancel={(e) => { if (drag.current) drag.current.el.style.translate = ''; drag.current = null; void e }}
              onKeyDown={(e) => onKey(e, it)}
              onAnimationEnd={() => it.mood && it.mood !== 'snap' && update(it.id, { mood: undefined })}
            >
              <svg viewBox="0 0 48 48" aria-hidden="true">{SHAPE[it.kind]}</svg>
            </button>
          ))}
          {closing && <Burst y="24%" color={game.color} />}
        </div>
      </Stage>
      {!closing && <p className="small muted center" style={{ margin: 'var(--space-2) 0 0' }}>On a computer: Tab to a thing, arrows to move, R to turn, Enter to drop.</p>}
      {showTicket && result != null && <ResultCard
        game={game}
        headline={`${result.toFixed(1)} seconds`}
        detail={<>{items.length} things tidied{wrong ? ` · ${wrong} wrong slot${wrong === 1 ? '' : 's'} (+${wrong * 2}s)` : ''}{best != null && best < result ? ` · your best ${best.toFixed(1)}s` : ''}</>}
        shareText={`🧺 Tidy Up\nTidied ${items.length} things in ${result.toFixed(1)}s`}
        finishData={{ score: result, wrong }}
        trackFinish={fresh}
        challenge={{ seed, score: result, text: `${result.toFixed(1)}s`, lowerIsBetter: true }}
        onReplay={again}
        replayLabel="Play again"
      />}
    </>
  )
}
