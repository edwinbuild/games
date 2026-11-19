import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { css, empty, MAX_DROPS, matchScore, mixColor, paintColor, PAINTS, recipeFor, total, type Drops, type Rgb } from './paint-mix/mix'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { count } from '../shell/plural'
import { ResultCard } from '../shell/ResultCard'
import { useRunState } from '../shell/session'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { AttemptTiles, Burst, Button, Stage, type Attempt } from '../ui'

const game = getGame('paint-mix')
/** A finished try: its score and the drops it used (to show your mix again). */
type Try = { score: number; drops: Drops }
/** The order drops went in, as paint indexes (for Undo and the drop trail). */
type Run = number[]
const grade = (s: number): Attempt => (s >= 90 ? 'hit' : s >= 75 ? 'near' : 'miss')
const square = (s: number) => ({ hit: '🟩', near: '🟨', miss: '🟥', empty: '⬜' })[grade(s)]
const dropsOf = (run: Run): Drops => run.reduce((d, i) => { d[i]++; return d }, empty())
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function PaintMix() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const target = mixColor(recipeFor(seed))!
  const [tries, setTries] = useState<Try[]>(() => (oneOff ? [] : loadToday(game.slug, [] as Try[])))
  // The mix in progress survives a refresh.
  const [run, setRun] = useRunState<Run>(`${game.slug}:${seed}:${oneOff ? 'once' : tries.length}`, [])
  const [locked, setLocked] = useState<Try | null>(null)
  const [done, setDone] = useState(tries.length > 0 && run.length === 0)
  const [fresh, setFresh] = useState(false)
  const drops = dropsOf(run)
  const mine = mixColor(drops)

  function add(i: number) {
    if (locked || done || run.length >= MAX_DROPS) { if (run.length >= MAX_DROPS) feel.bad(); return }
    setRun([...run, i])
    feel.pop(Math.min(run.length, 9))
    feel.light()
  }
  function undo() { if (!locked && run.length) { setRun(run.slice(0, -1)); feel.tap() } }
  function clear() { if (!locked && run.length) { setRun([]); feel.tap() } }

  function lockIn() {
    if (!mine || locked) return
    const score = matchScore(target, mine)
    const t: Try = { score, drops }
    const all = [...tries, t]
    // Saved now, so a refresh on the comparison can't lose the try.
    if (!oneOff) {
      saveToday(game.slug, all)
      const best = Math.max(...all.map((x) => x.score))
      recordDaily(game.slug, best, new Date(), `${best}%`)
    }
    if (score >= 95) { feel.chime(5); feel.success() } else if (score >= 75) { feel.good() } else { feel.thud() }
    setLocked(t)
    setFresh(true)
  }
  function seeResult() {
    if (!locked) return
    setTries([...tries, locked])
    setLocked(null)
    setDone(true)
  }
  function again() {
    setRun([])
    setDone(false)
  }

  // Keyboard: 1–5 add a drop of that paint, Backspace takes the last one out.
  useEffect(() => {
    if (done || locked) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement | null)?.closest('input, textarea')) return
      const n = Number(e.key)
      if (n >= 1 && n <= PAINTS.length) { e.preventDefault(); add(n - 1) }
      else if (e.key === 'Backspace') { e.preventDefault(); undo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (done && tries.length) {
    const best = tries.reduce((a, b) => (b.score > a.score ? b : a))
    const n = count(tries.length, 'try', 'tries')
    const stats = getStats(game.slug)
    const last = tries[tries.length - 1]
    return (
      <>
        <Stage>
          <div className="stack" style={{ justifyItems: 'center' }}>
            <div className="pm-pair">
              <Swatch color={target} label="Today’s colour" />
              <Swatch color={mixColor(best.drops)!} label="Your best mix" />
            </div>
            {fresh && last !== best && <p className="body-strong" style={{ margin: 0 }}>Last try: {last.score}% match</p>}
            <AttemptTiles attempts={tries.slice(-8).map((t) => grade(t.score))} />
          </div>
        </Stage>
        <ResultCard
          game={game}
          headline={`${best.score}% match`}
          detail={<>{count(total(best.drops), 'drop')} of paint · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`🎨 Paint Mix ${puzzleLabel(day)}\n${square(best.score)} ${best.score}% match\nBest of ${n}`}
          finishData={{ score: best.score, tries: tries.length }}
          trackFinish={fresh}
          challenge={{ seed, score: best.score, text: `${best.score}%`, lowerIsBetter: false }}
          onReplay={again}
          replayLabel="Try again"
        />
      </>
    )
  }

  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="small muted">{tries.length ? `Try ${tries.length + 1}` : 'Match today’s colour'}</span>
        <span className="small muted" aria-live="polite">{count(run.length, 'drop')} · up to {MAX_DROPS}</span>
      </div>
      <Stage className="pm-stage" style={{ position: 'relative' }}>
        <div className="pm-pair">
          <Swatch color={target} label="Today’s colour" />
          <div className="pm-swatch">
            <Bowl run={run} color={mine} />
            <span className="small muted">Your mix</span>
          </div>
        </div>
        {locked ? (
          // Below the two colours, so they stay side by side to compare.
          <div className="pm-verdict" aria-live="polite">
            <span className="score">{locked.score}%</span>
            <span className="body-strong">{locked.score >= 95 ? 'Spot on!' : locked.score >= 85 ? 'Very close' : locked.score >= 70 ? 'Close' : 'Not quite'}</span>
            {locked.score >= 95 && <Burst y="0%" color={game.color} />}
          </div>
        ) : (
          <div className="pm-trail" aria-hidden="true">
            {run.map((i, k) => <span key={k} style={{ background: css(paintColor(PAINTS[i])) }} />)}
          </div>
        )}
      </Stage>
      {!locked ? (
        <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
          <div className="pm-pots" role="group" aria-label="Add a drop of paint">
            {PAINTS.map((p, i) => (
              <button key={p.id} type="button" className="pm-pot" onClick={() => add(i)} disabled={run.length >= MAX_DROPS} aria-label={`Add a drop of ${p.name.toLowerCase()} (${drops[i]} in)`}>
                <span className="pm-pot-paint" style={{ background: css(paintColor(p)) }} />
                <span className="pm-pot-name">{p.name}</span>
                {drops[i] > 0 && <span className="pm-pot-count" aria-hidden="true">{drops[i]}</span>}
                <kbd className="qg-kbd" aria-hidden="true">{i + 1}</kbd>
              </button>
            ))}
          </div>
          <div className="pm-tools">
            <Button variant="ghost" onClick={undo} disabled={!run.length}>Undo</Button>
            <Button variant="ghost" onClick={clear} disabled={!run.length}>Empty the bowl</Button>
          </div>
          <Button size="lg" block color={game.color} onClick={lockIn} disabled={!run.length} data-primary="click" hint="Enter">Lock in my mix</Button>
          <p className="small muted center" style={{ margin: 0 }}>Paint mixes like real paint: yellow and blue make green, white lightens. Only the mix counts, not how many drops.</p>
        </div>
      ) : (
        <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
          <Button size="lg" block color={game.color} onClick={seeResult} data-primary="click" hint="Space">See my result</Button>
        </div>
      )}
    </>
  )
}

function Swatch({ color, label }: { color: Rgb; label: string }) {
  return (
    <div className="pm-swatch">
      <span className="pm-disc" style={{ background: css(color) }} role="img" aria-label={label} />
      <span className="small muted">{label}</span>
    </div>
  )
}

/**
 * The bowl: the mix colour, and each new drop falling in and swirling round into it while
 * the colour shifts from the old mix to the new one.
 */
function Bowl({ run, color }: { run: Run; color: Rgb | null }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const shown = useRef<Rgb | null>(color)
  const anim = useRef<{ from: Rgb | null; to: Rgb | null; drop: Rgb | null; start: number; spin: number } | null>(null)
  const prevLen = useRef(run.length)
  const raf = useRef(0)

  useEffect(() => {
    const added = run.length > prevLen.current
    prevLen.current = run.length
    const dropColour = added ? paintColor(PAINTS[run[run.length - 1]]) : null
    if (reduced()) { shown.current = color; paint(performance.now()); return }
    anim.current = { from: shown.current, to: color, drop: dropColour, start: performance.now(), spin: Math.random() * Math.PI * 2 }
    cancelAnimationFrame(raf.current)
    const frame = (now: number) => {
      const going = paint(now)
      if (going) raf.current = requestAnimationFrame(frame)
    }
    raf.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf.current)
  }, [run.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ro = new ResizeObserver(([e]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      c.width = c.height = Math.round(e.contentRect.width * dpr)
      paint(performance.now())
    })
    ro.observe(c)
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /** Draws one frame; returns true while the animation still runs. */
  function paint(now: number): boolean {
    const c = canvas.current
    if (!c) return false
    const g = c.getContext('2d')!
    const W = c.width, R = W / 2
    const s = getComputedStyle(c)
    const sunken = s.getPropertyValue('--surface-sunken').trim() || '#eee'
    g.clearRect(0, 0, W, W)
    g.save()
    g.beginPath(); g.arc(R, R, R - 1, 0, Math.PI * 2); g.clip()
    g.fillStyle = sunken
    g.fillRect(0, 0, W, W)
    const a = anim.current
    let going = false
    if (a) {
      const t = (now - a.start) / 900
      going = t < 1
      const e = Math.min(1, t)
      const k = 1 - Math.pow(1 - Math.max(0, (e - 0.25) / 0.75), 3) // colour turns once the drop lands
      // From the old mix to the new one; into or out of an empty bowl it fades instead.
      if (a.from && a.to) {
        g.fillStyle = css(a.from.map((v, i) => Math.round(v + (a.to![i] - v) * k)) as Rgb)
        g.fillRect(0, 0, W, W)
      } else if (a.to || a.from) {
        g.globalAlpha = a.to ? k : 1 - k
        g.fillStyle = css((a.to ?? a.from)!)
        g.fillRect(0, 0, W, W)
        g.globalAlpha = 1
      }
      shown.current = going ? (a.to ?? a.from) : a.to
      // The drop: falls in, then spirals inwards as a thinning streak.
      if (a.drop && going) {
        const drop = css(a.drop)
        if (e < 0.25) {
          const y = -W * 0.1 + (e / 0.25) * (R * 0.9)
          g.fillStyle = drop
          g.beginPath(); g.arc(R + Math.cos(a.spin) * R * 0.25, y, W * 0.07, 0, Math.PI * 2); g.fill()
        } else {
          const p = (e - 0.25) / 0.75
          g.strokeStyle = drop
          g.lineCap = 'round'
          g.globalAlpha = 1 - p
          for (let j = 0; j < 22; j++) {
            const q = j / 22
            const ang = a.spin + (p * 5 + q * 2.4)
            const rad = R * 0.55 * (1 - p * 0.8) * (1 - q * 0.55)
            g.lineWidth = W * 0.06 * (1 - q) * (1 - p * 0.6)
            g.beginPath()
            g.arc(R, R, Math.max(1, rad), ang, ang + 0.18)
            g.stroke()
          }
          g.globalAlpha = 1
        }
      }
      // A soft sheen that turns while the paint is stirred.
      if (going && shown.current) {
        g.globalAlpha = 0.18 * (1 - e)
        g.strokeStyle = '#fff'
        g.lineWidth = W * 0.035
        for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(R, R, R * (0.3 + j * 0.2), a.spin + e * 4 + j, a.spin + e * 4 + j + 1.1); g.stroke() }
        g.globalAlpha = 1
      }
    } else if (shown.current) {
      g.fillStyle = css(shown.current)
      g.fillRect(0, 0, W, W)
    }
    if (!shown.current && !going) {
      g.fillStyle = s.getPropertyValue('--ink-muted').trim() || '#666'
      g.font = `700 ${Math.round(W * 0.075)}px Figtree, system-ui, sans-serif`
      g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText('Empty bowl', R, R)
    }
    g.restore()
    if (!going) anim.current = null
    return going
  }

  return <canvas ref={canvas} className="pm-disc pm-bowl" role="img" aria-label={color ? 'Your mix' : 'An empty bowl'} data-rgb={color ? color.join(',') : ''} />
}
