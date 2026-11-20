import { useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { autoFacing, boardFor, canPlace, FALL, H, run, SPARES, W, type Domino, type Fall, type V } from './domino-drop/dominoes'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Burst, Button, Stage } from '../ui/components'

const game = getGame('domino-drop')
const TOTAL = 40
type Phase = 'place' | 'run' | 'shown' | 'done'
type Colors = { fill: string; edge: string; ink: string; muted: string; surface: string; sunken: string; focus: string }

export default function DominoDrop() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const board = useMemo(() => boardFor(seed), [seed])
  const [tries, setTries] = useState<number[]>(() => (oneOff ? [] : loadToday(game.slug, [] as number[])))
  const [phase, setPhase] = useState<Phase>(tries.length ? 'done' : 'place')
  const [spares, setSpares] = useState<Domino[]>([])
  const [last, setLast] = useState<number | null>(null)
  const [fresh, setFresh] = useState(false)
  const [cursor, setCursor] = useState<V | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const size = useRef({ w: 300, dpr: 1 })
  const colors = useRef<Colors | null>(null)
  const reduced = useRef(false)
  const falls = useRef<Fall[]>([])
  const pending = useRef<number[] | null>(null)
  const doneTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(doneTimer.current), [])
  const pushAt = useRef(0)
  const ticked = useRef(0)
  const cam = useRef({ x: W / 2, y: H / 2, z: 1 })
  const drag = useRef<{ k: number; moved: boolean; from: V } | null>(null)
  const live = useRef({ spares, phase, cursor })
  live.current = { spares, phase, cursor }

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    reduced.current = matchMedia('(prefers-reduced-motion: reduce)').matches
    const read = () => {
      const s = getComputedStyle(c)
      const v = (n: string, f: string) => s.getPropertyValue(n).trim() || f
      colors.current = { fill: v('--game', '#ee8'), edge: v('--edge', '#000'), ink: v('--ink', '#000'), muted: v('--ink-muted', '#666'), surface: v('--surface', '#fff'), sunken: v('--surface-sunken', '#eee'), focus: v('--focus', '#06f') }
    }
    const ro = new ResizeObserver(([e]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      size.current = { w: e.contentRect.width, dpr }
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
      const t = live.current.phase === 'place' ? -1 : (performance.now() - pushAt.current) / 1000
      if (live.current.phase === 'run') {
        while (ticked.current < falls.current.length && falls.current[ticked.current].t <= t) feel.tick(ticked.current++)
        if (t > falls.current[falls.current.length - 1].t + FALL + 0.6) show()
      }
      draw(t)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const all = (s: Domino[]) => [...board.dominoes, ...s]

  function draw(t: number) {
    const c = canvas.current, col = colors.current
    if (!c || !col) return
    const g = c.getContext('2d')!
    const { dpr } = size.current
    const base = c.width / W
    const { spares: sp, phase: ph, cursor: cur } = live.current
    const doms = all(sp)
    const fallAt = new Map(falls.current.map((f) => [f.i, f]))
    // The camera follows the front of the run, a little zoomed in, and eases back at the end.
    const front = falls.current.filter((f) => f.t <= t).at(-1)
    const want = ph === 'run' && front && !reduced.current ? { x: doms[front.i].x, y: doms[front.i].y, z: 1.35 } : { x: W / 2, y: H / 2, z: 1 }
    const cm = cam.current
    cm.x += (want.x - cm.x) * 0.08; cm.y += (want.y - cm.y) * 0.08; cm.z += (want.z - cm.z) * 0.06
    const k = base * cm.z
    const vw = W / cm.z, vh = H / cm.z
    const ox = Math.max(0, Math.min(W - vw, cm.x - vw / 2)), oy = Math.max(0, Math.min(H - vh, cm.y - vh / 2))
    const X = (x: number) => (x - ox) * k, Y = (y: number) => (y - oy) * k
    g.clearRect(0, 0, c.width, c.height)
    // Blocks.
    for (const b of board.blocks) {
      g.fillStyle = col.sunken; g.strokeStyle = col.edge; g.lineWidth = 2 * dpr
      g.beginPath(); g.roundRect(X(b.x), Y(b.y), b.w * k, b.h * k, 4 * dpr); g.fill(); g.stroke()
    }
    // Dominoes: a thin bar standing; a slab lying flat once fallen.
    doms.forEach((d, i) => {
      const f = fallAt.get(i)
      const p = f && t >= f.t ? Math.min(1, (t - f.t) / FALL) : 0
      const n = f && p > 0 ? { x: f.dx, y: f.dy } : { x: d.nx, y: d.ny }
      const depth = 4 + 12 * (reduced.current ? (p > 0 ? 1 : 0) : p)
      const width = 13
      const px = -n.y, py = n.x
      const cx = d.x + n.x * (depth / 2 - 2), cy = d.y + n.y * (depth / 2 - 2)
      g.beginPath()
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [cx + n.x * (a * depth) / 2 + px * (b * width) / 2, cy + n.y * (a * depth) / 2 + py * (b * width) / 2])
      corners.forEach(([x, y], q) => (q ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))))
      g.closePath()
      g.fillStyle = p > 0 || d.spare ? col.fill : col.surface
      g.strokeStyle = col.edge
      g.lineWidth = (d.spare && ph === 'place' ? 2.6 : 1.8) * dpr
      g.fill(); g.stroke()
    })
    // The first domino gets a small arrow showing which way the push goes.
    if (ph === 'place') {
      const d = board.dominoes[0]
      g.strokeStyle = col.ink; g.lineWidth = 2.5 * dpr
      const ax = d.x - d.nx * 20, ay = d.y - d.ny * 20
      g.beginPath(); g.moveTo(X(ax - d.nx * 10), Y(ay - d.ny * 10)); g.lineTo(X(ax), Y(ay)); g.stroke()
      g.beginPath(); g.moveTo(X(ax), Y(ay)); g.lineTo(X(ax - d.nx * 6 - d.ny * 5), Y(ay - d.ny * 6 + d.nx * 5)); g.lineTo(X(ax - d.nx * 6 + d.ny * 5), Y(ay - d.ny * 6 - d.nx * 5)); g.closePath(); g.fillStyle = col.ink; g.fill()
      if (cur) {
        g.strokeStyle = col.focus; g.lineWidth = 2.5 * dpr
        g.beginPath(); g.arc(X(cur.x), Y(cur.y), 9 * k, 0, Math.PI * 2); g.stroke()
      }
    }
    // Count while running.
    if (ph !== 'place') {
      const count = falls.current.filter((f) => f.t <= t).length
      g.fillStyle = col.surface; g.strokeStyle = col.edge; g.lineWidth = 2 * dpr
      g.beginPath(); g.roundRect(c.width / 2 - 56 * dpr, 6 * dpr, 112 * dpr, 58 * dpr, 12 * dpr); g.fill(); g.stroke()
      g.fillStyle = col.ink; g.textAlign = 'center'; g.textBaseline = 'top'
      g.font = `800 ${Math.round(32 * dpr)}px "Bricolage Grotesque", system-ui, sans-serif`
      g.fillText(String(count), c.width / 2, 10 * dpr)
      g.fillStyle = col.muted
      g.font = `700 ${Math.round(12 * dpr)}px Figtree, system-ui, sans-serif`
      g.fillText(`of ${TOTAL} fell`, c.width / 2, 44 * dpr)
    }
  }

  function toWorld(e: { clientX: number; clientY: number }): V {
    const r = canvas.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }
  const spareAt = (p: V) => spares.findIndex((s) => Math.hypot(s.x - p.x, s.y - p.y) < 11)

  /** Place a spare, or turn the one already there. Returns its index, or -1. */
  function placeOrTurn(p: V): number {
    const k = spareAt(p)
    if (k >= 0) {
      feel.click()
      const s = spares[k]
      const a = Math.atan2(s.ny, s.nx) + Math.PI / 4
      setSpares(spares.map((x, i) => (i === k ? { ...x, nx: Math.cos(a), ny: Math.sin(a) } : x)))
      return k
    }
    if (spares.length >= SPARES || !canPlace(p, all(spares), board.blocks)) { feel.bad(); return -1 }
    const f = autoFacing(p, all(spares))
    feel.click(); feel.light()
    setSpares([...spares, { x: p.x, y: p.y, nx: f.x, ny: f.y, spare: true }])
    return spares.length
  }

  function push() {
    if (phase !== 'place') return
    falls.current = run(all(spares), board.blocks)
    pushAt.current = performance.now()
    ticked.current = 0
    setPhase('run')
    // The run is decided by the push: record it now, so a refresh while it falls can't lose it.
    const list = [...tries, falls.current.length]
    pending.current = list
    if (!oneOff) {
      saveToday(game.slug, list)
      const best = Math.max(...list)
      recordDaily(game.slug, best, new Date(), `${best} of ${TOTAL}`)
    }
    setFresh(true)
  }
  function show() {
    const n = falls.current.length
    setLast(n)
    setPhase('shown')
    live.current.phase = 'shown'
    if (n === TOTAL) { feel.chime(5); feel.chime(7); feel.success() } else feel.thud()
    setTries(pending.current ?? [...tries, n])
    pending.current = null
    doneTimer.current = setTimeout(() => setPhase('done'), n === TOTAL ? 1800 : 1300)
  }
  function again() {
    falls.current = []
    cam.current = { x: W / 2, y: H / 2, z: 1 }
    setLast(null)
    setPhase('place')
  }

  // Keyboard: arrows move a cursor, Enter places or turns a spare there; Space pushes (via the Push key).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'place' || e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.target as HTMLElement | null)?.closest('input, textarea, button, a')) return
      const step = e.shiftKey ? 1 : 4
      const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
      if (e.key in d) {
        e.preventDefault()
        const c = cursor ?? { x: board.dominoes[0].x, y: board.dominoes[0].y }
        setCursor({ x: Math.max(6, Math.min(W - 6, c.x + d[e.key][0])), y: Math.max(6, Math.min(H - 6, c.y + d[e.key][1])) })
      } else if (e.key === 'Enter') {
        // Enter only ever places (Space pushes): without a cursor yet, it brings the cursor out.
        e.preventDefault()
        if (cursor) placeOrTurn(cursor)
        else setCursor({ x: board.dominoes[0].x, y: board.dominoes[0].y })
      }
    }
    // Capture phase, so Enter places a spare before the page-wide shortcut could press Push.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  if (phase === 'done' && tries.length) {
    const best = Math.max(...tries)
    const n = `${tries.length} ${tries.length === 1 ? 'try' : 'tries'}`
    const stats = getStats(game.slug)
    return (
      <>
        {fresh && last != null && <Stage><p className="body-strong center" style={{ margin: 0 }}>Last run: {last} of {TOTAL} fell</p></Stage>}
        <ResultCard
          game={game}
          headline={`${best} of ${TOTAL} fell`}
          detail={<>{best === TOTAL ? 'The whole run went down' : 'Your longest run'} · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`🁢 Domino Drop ${puzzleLabel(day)}\n${best} of ${TOTAL} fell\nBest of ${n}`}
          finishData={{ score: best, tries: tries.length }}
          trackFinish={fresh}
          challenge={{ seed, score: best, text: `${best} of ${TOTAL}`, lowerIsBetter: false }}
          onReplay={again}
          replayLabel="Try again"
        />
      </>
    )
  }

  return (
    <>
      <Stage flush className="dd-stage">
        <canvas
          ref={canvas}
          className="dd-canvas"
          data-line={JSON.stringify(board.dominoes.map((d) => [Math.round(d.x * 10) / 10, Math.round(d.y * 10) / 10]))}
          role="application"
          aria-label={`A line of dominoes with gaps. Place up to ${SPARES} spare dominoes, then push the first one.`}
          onPointerDown={(e) => {
            if (phase !== 'place') return
            e.currentTarget.setPointerCapture(e.pointerId)
            const p = toWorld(e)
            const k = spareAt(p)
            if (k >= 0) drag.current = { k, moved: false, from: p }
            else { const placed = placeOrTurn(p); if (placed >= 0) drag.current = { k: placed, moved: true, from: p } }
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (!d) return
            const p = toWorld(e)
            if (!d.moved && Math.hypot(p.x - d.from.x, p.y - d.from.y) < 4) return
            d.moved = true
            setSpares((list) => (list[d.k] && canPlace(p, [...board.dominoes, ...list], board.blocks, board.dominoes.length + d.k) ? list.map((s, i) => (i === d.k ? { ...s, x: p.x, y: p.y } : s)) : list))
          }}
          onPointerUp={() => {
            const d = drag.current
            drag.current = null
            if (d && !d.moved) placeOrTurn(d.from)
          }}
        />
        {phase === 'shown' && last === TOTAL && <Burst y="12%" color={game.color} />}
      </Stage>
      <div className="row" style={{ marginTop: 'var(--space-3)' }}>
        <span className="small muted">Spares left: {SPARES - spares.length}</span>
        <Button variant="secondary" onClick={() => setSpares([])} disabled={!spares.length || phase !== 'place'}>Clear spares</Button>
        <Button color={game.color} onClick={push} disabled={phase !== 'place'} data-primary="click" hint="Space">Push</Button>
      </div>
      <p className="small muted center" style={{ margin: 'var(--space-2) 0 0' }}>Tap to place a spare, drag to move it, tap it again to turn it.</p>
    </>
  )
}
