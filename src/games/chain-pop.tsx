import { useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { boardFor, bubbleAt, chain, COUNT, H, RADIUS, REACH, RING_SPEED, W, type Pop } from './chain-pop/chain'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Burst, Stage } from '../ui/components'
import './chain-pop.css'

const game = getGame('chain-pop')
/** Three quarters of the board in one chain is a great tap. */
const GREAT = Math.round(COUNT * 0.75)
type Phase = 'ready' | 'chain' | 'shown' | 'done'
type Colors = { surface: string; fill: string; edge: string; ink: string; muted: string; shine: string; focus: string }

export default function ChainPop() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const board = useMemo(() => boardFor(seed), [seed])
  const [tries, setTries] = useState<number[]>(() => (oneOff ? [] : loadToday(game.slug, [] as number[])))
  const [phase, setPhase] = useState<Phase>(tries.length ? 'done' : 'ready')
  const [last, setLast] = useState<number | null>(null)
  const [fresh, setFresh] = useState(false)
  const [cursor, setCursor] = useState(() => nearest(W / 2, H / 2))
  const [keyboard, setKeyboard] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const size = useRef({ w: 300, h: 400, dpr: 1 })
  const colors = useRef<Colors | null>(null)
  const reduced = useRef(false)
  const pops = useRef<Pop[]>([])
  const tapAt = useRef(0)
  const sounded = useRef(0)
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const pending = useRef<number[] | null>(null)
  const doneTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(doneTimer.current), [])
  const view = useRef({ cursor, keyboard })
  view.current = { cursor, keyboard }

  function nearest(x: number, y: number) {
    let best = 0
    board.forEach((b, i) => { if (Math.hypot(b.x - x, b.y - y) < Math.hypot(board[best].x - x, board[best].y - y)) best = i })
    return best
  }

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    reduced.current = matchMedia('(prefers-reduced-motion: reduce)').matches
    const read = () => {
      const s = getComputedStyle(c)
      const v = (n: string, f: string) => s.getPropertyValue(n).trim() || f
      colors.current = { surface: v('--surface', '#fff'), fill: v('--game', '#cbf'), edge: v('--edge', '#000'), ink: v('--ink', '#000'), muted: v('--ink-muted', '#666'), shine: v('--highlight', '#fff'), focus: v('--focus', '#06f') }
    }
    const ro = new ResizeObserver(([e]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      size.current = { w: e.contentRect.width, h: e.contentRect.height, dpr }
      c.width = Math.round(e.contentRect.width * dpr)
      c.height = Math.round(e.contentRect.height * dpr)
      read()
    })
    ro.observe(c)
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', read)
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => { ro.disconnect(); mq.removeEventListener('change', read); mo.disconnect() }
  }, [phase === 'done'])

  useEffect(() => {
    if (phase === 'done') return
    let raf = 0
    const frame = () => {
      const t = phaseRef.current === 'ready' ? -1 : (performance.now() - tapAt.current) / 1000
      if (phaseRef.current === 'chain') {
        // One pop sound per bubble, in chain order, pitch climbing.
        while (sounded.current < pops.current.length && pops.current[sounded.current].t <= t) feel.pop(sounded.current++)
        const end = pops.current[pops.current.length - 1].t
        if (t > end + 0.6) show()
      }
      draw(t)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function draw(t: number) {
    const c = canvas.current, col = colors.current
    if (!c || !col) return
    const g = c.getContext('2d')!
    const { dpr } = size.current
    const k = c.width / W
    const still = reduced.current
    g.clearRect(0, 0, c.width, c.height)
    const popTime = new Map(pops.current.map((p) => [p.i, p.t]))
    let count = 0
    board.forEach((b, i) => {
      const pt = popTime.get(i)
      const since = pt == null || t < 0 ? -1 : t - pt
      if (since >= 0) count++
      const wob = still ? 0 : 1.6
      const x = (b.x + Math.sin(performance.now() / 900 + i * 1.7) * wob) * k
      const y = (b.y + Math.cos(performance.now() / 1100 + i * 2.3) * wob) * k
      const r = RADIUS[b.size] * k
      // The ring this bubble sends out once it pops.
      if (since >= 0) {
        const ringR = RADIUS[b.size] + since * RING_SPEED
        if (ringR <= REACH[b.size] + RADIUS[b.size]) {
          g.strokeStyle = col.edge
          g.globalAlpha = 0.55 * (1 - (ringR - RADIUS[b.size]) / REACH[b.size])
          g.lineWidth = 2 * dpr
          g.beginPath(); g.arc(x, y, ringR * k, 0, Math.PI * 2); g.stroke()
          g.globalAlpha = 1
        }
        // Droplets fly off.
        if (since < 0.3 && !still) {
          g.fillStyle = col.fill
          g.strokeStyle = col.edge
          g.lineWidth = 1.2 * dpr
          for (let d = 0; d < 6; d++) {
            const a = d * 1.047 + i
            const dist = r + since * 140 * k
            g.globalAlpha = 1 - since / 0.3
            g.beginPath(); g.arc(x + Math.cos(a) * dist, y + Math.sin(a) * dist, 2.4 * dpr, 0, Math.PI * 2); g.fill(); g.stroke()
          }
          g.globalAlpha = 1
        }
        // The bubble itself swells and vanishes.
        if (since < 0.16 && !still) {
          const s = 1 + since * 3
          g.globalAlpha = 1 - since / 0.16
          g.fillStyle = col.fill
          g.beginPath(); g.arc(x, y, r * s, 0, Math.PI * 2); g.fill()
          g.globalAlpha = 1
        }
        return
      }
      g.fillStyle = col.fill
      g.strokeStyle = col.edge
      g.lineWidth = 2 * dpr
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke()
      g.strokeStyle = col.shine
      g.lineWidth = Math.max(1.5, r * 0.18)
      g.beginPath(); g.arc(x, y, r * 0.6, Math.PI * 1.1, Math.PI * 1.45); g.stroke()
      if (view.current.keyboard && i === view.current.cursor && phaseRef.current === 'ready') {
        g.strokeStyle = col.focus
        g.lineWidth = 3 * dpr
        g.beginPath(); g.arc(x, y, r + 5 * dpr, 0, Math.PI * 2); g.stroke()
      }
    })
    // The count, drawn on the canvas so nothing on the page moves while the chain runs.
    g.textAlign = 'center'
    g.textBaseline = 'top'
    if (phaseRef.current === 'ready') {
      g.fillStyle = col.muted
      g.font = `700 ${Math.round(15 * dpr)}px Figtree, system-ui, sans-serif`
      g.fillText('One tap. Pick your bubble.', c.width / 2, 10 * dpr)
    } else {
      g.fillStyle = col.surface
      g.strokeStyle = col.edge
      g.lineWidth = 2 * dpr
      g.beginPath(); g.roundRect(c.width / 2 - 62 * dpr, 4 * dpr, 124 * dpr, 66 * dpr, 14 * dpr); g.fill(); g.stroke()
      g.fillStyle = col.ink
      g.font = `800 ${Math.round(40 * dpr)}px "Bricolage Grotesque", system-ui, sans-serif`
      g.fillText(String(count), c.width / 2, 10 * dpr)
      g.fillStyle = col.muted
      g.font = `700 ${Math.round(13 * dpr)}px Figtree, system-ui, sans-serif`
      g.fillText(`of ${COUNT} popped`, c.width / 2, 52 * dpr)
    }
  }

  function tap(i: number) {
    if (phaseRef.current !== 'ready' || i < 0) return
    pops.current = chain(board, i)
    tapAt.current = performance.now()
    sounded.current = 0
    setPhase('chain')
    phaseRef.current = 'chain'
    // The chain is decided by the tap: record it now, so a refresh while it pops can't lose it.
    const all = [...tries, pops.current.length]
    pending.current = all
    if (!oneOff) {
      saveToday(game.slug, all)
      const best = Math.max(...all)
      recordDaily(game.slug, best, new Date(), `${best} of ${COUNT}`)
    }
    setFresh(true)
  }
  function show() {
    const n = pops.current.length
    setLast(n)
    setPhase('shown')
    phaseRef.current = 'shown'
    if (n >= GREAT) { feel.chime(4); feel.success() } else feel.thud()
    setTries(pending.current ?? [...tries, n])
    pending.current = null
    doneTimer.current = setTimeout(() => setPhase('done'), n >= GREAT ? 1700 : 1200)
  }
  function again() {
    pops.current = []
    setLast(null)
    setPhase('ready')
  }

  // Keyboard: arrows move to the nearest bubble in that direction, Space or Enter taps it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'ready' || e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.target as HTMLElement | null)?.closest('input, textarea, button, a')) return
      const dir: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
      if (e.key in dir) {
        e.preventDefault()
        setKeyboard(true)
        const [dx, dy] = dir[e.key]
        const from = board[view.current.cursor]
        let best = -1, score = Infinity
        board.forEach((b, i) => {
          const vx = b.x - from.x, vy = b.y - from.y
          const along = vx * dx + vy * dy
          if (along <= 0) return
          const side = Math.abs(vx * dy - vy * dx)
          const s = along + side * 2
          if (s < score) { score = s; best = i }
        })
        if (best >= 0) setCursor(best)
      } else if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
        e.preventDefault()
        tap(view.current.cursor)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (phase === 'done' && tries.length) {
    const best = Math.max(...tries)
    const n = `${tries.length} ${tries.length === 1 ? 'try' : 'tries'}`
    const stats = getStats(game.slug)
    return (
      <>
        {fresh && last != null && (
          <Stage>
            <p className="body-strong center" style={{ margin: 0 }}>Last tap: {last} of {COUNT} popped</p>
          </Stage>
        )}
        <ResultCard
          game={game}
          headline={`${best} of ${COUNT} popped`}
          detail={<>{best >= GREAT ? 'A huge chain' : 'Your longest chain'} · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`🫧 Chain Pop ${puzzleLabel(day)}\nPopped ${best} of ${COUNT} with one tap\nBest of ${n}`}
          finishData={{ score: best, tries: tries.length }}
          trackFinish={fresh}
          challenge={{ seed, score: best, text: `${best} of ${COUNT}`, lowerIsBetter: false }}
          onReplay={again}
          replayLabel="Try again"
        />
      </>
    )
  }

  const k = size.current.w / W
  return (
    <Stage
      flush
      className="cp-stage"
      role="button"
      tabIndex={0}
      aria-label={`Tap one bubble to start a chain. ${COUNT} bubbles.`}
      data-cursor-x={Math.round(board[cursor].x * k)}
      data-cursor-y={Math.round(board[cursor].y * k)}
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        const s = W / r.width
        tap(bubbleAt(board, (e.clientX - r.left) * s, (e.clientY - r.top) * s))
      }}
    >
      <canvas ref={canvas} className="cp-canvas" aria-hidden="true" />
      {phase === 'ready' && <kbd className="qg-kbd cp-kbd" aria-hidden="true">Arrows · Space</kbd>}
      {phase === 'shown' && last != null && last >= GREAT && <Burst y="12%" color={game.color} />}
    </Stage>
  )
}
