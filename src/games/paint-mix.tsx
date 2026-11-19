import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { css, dayFor, dayScore, MAX_DROPS, matchScore, mixColor, paintColor, PAINTS, ROUNDS, stars, empty, type Drops, type Rgb } from './paint-mix/mix'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { count } from '../shell/plural'
import { ResultCard } from '../shell/ResultCard'
import { useRunState } from '../shell/session'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { AttemptTiles, Burst, Button, Stage, type Attempt } from '../ui'

const game = getGame('paint-mix')
/** A finished day: the try it was (each try has its own five colours), each colour's score and your mixes. */
type Try = { k: number; scores: number[]; mixes: Rgb[] }
/** The day in progress: which colour, the drops in the bowl (paint indexes, in order), scores so far, paint used. */
type Run = { round: number; bowl: number[]; scores: number[]; mixes: Rgb[]; spent: number }
const fresh0 = (): Run => ({ round: 0, bowl: [], scores: [], mixes: [], spent: 0 })
const grade = (s: number): Attempt => (s >= 90 ? 'hit' : s >= 75 ? 'near' : 'miss')
const square = (s: number) => (s === 100 ? '⭐' : ({ hit: '🟩', near: '🟨', miss: '🟥', empty: '⬜' })[grade(s)])
const dropsOf = (bowl: number[]): Drops => bowl.reduce((d, i) => { d[i]++; return d }, empty())
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const verdict = (s: number) => (s === 100 ? 'Exact! ⭐' : s >= 95 ? 'Spot on' : s >= 85 ? 'Very close' : s >= 70 ? 'Close' : 'Not quite')

export default function PaintMix() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  // Days saved by the first version (one colour) aren't comparable: only five-colour days count.
  const [tries, setTries] = useState<Try[]>(() => (oneOff ? [] : loadToday<unknown[]>(game.slug, []).filter((t): t is Try => !!t && Array.isArray((t as Try).scores))))
  const k = oneOff ? 0 : tries.length
  const today = dayFor(seed, k)
  // The day in progress survives a refresh, mid-colour or on a colour's reveal.
  const [run, setRun] = useRunState<Run>(`${game.slug}:v2:${seed}:${oneOff ? 'once' : k}`, fresh0)
  const [done, setDone] = useState(tries.length > 0 && run.scores.length === 0 && run.bowl.length === 0)
  const [fresh, setFresh] = useState(false)
  const revealing = run.scores.length > run.round
  const target = mixColor(today.targets[Math.min(run.round, ROUNDS - 1)])!
  const drops = dropsOf(run.bowl)
  const mine = mixColor(drops)
  const left = today.budget - run.spent - (revealing ? 0 : run.bowl.length)

  function add(i: number) {
    if (done || revealing) return
    if (left <= 0 || run.bowl.length >= MAX_DROPS) { feel.bad(); return }
    setRun({ ...run, bowl: [...run.bowl, i] })
    feel.pop(Math.min(run.bowl.length, 9))
    feel.light()
  }

  function lockIn() {
    if (revealing || done) return
    // Out of paint with an empty bowl: the colour scores nothing.
    const score = mine ? matchScore(target, mine) : 0
    const scores = [...run.scores, score]
    const mixes = [...run.mixes, mine ?? ([0, 0, 0] as Rgb)]
    const next: Run = { ...run, scores, mixes, spent: run.spent + run.bowl.length }
    setRun(next)
    if (score === 100) { feel.chime(5); feel.success() } else if (score >= 85) { feel.good() } else { feel.thud() }
    // The fifth colour finishes the day: saved now, so a refresh on the reveal can't lose it.
    if (scores.length === ROUNDS) {
      const all = [...tries, { k, scores, mixes }]
      if (!oneOff) {
        saveToday(game.slug, all)
        const best = Math.max(...all.map((t) => dayScore(t.scores)))
        recordDaily(game.slug, best, new Date(), `${best}%`)
      }
      setFresh(true)
    }
  }
  function next() {
    if (!revealing) return
    if (run.scores.length < ROUNDS) { setRun({ ...run, round: run.round + 1, bowl: [] }); return }
    setTries([...tries, { k, scores: run.scores, mixes: run.mixes }])
    setDone(true)
  }
  function again() {
    setRun(fresh0())
    setDone(false)
  }

  // Keyboard: 1–5 add a drop of that paint. There is no undo: paint can't come back out.
  useEffect(() => {
    if (done || revealing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement | null)?.closest('input, textarea')) return
      const n = Number(e.key)
      if (n >= 1 && n <= PAINTS.length) { e.preventDefault(); add(n - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (done && tries.length) {
    const best = tries.reduce((a, b) => (dayScore(b.scores) > dayScore(a.scores) ? b : a))
    const score = dayScore(best.scores)
    const bestTargets = dayFor(seed, best.k).targets
    const n = count(tries.length, 'try', 'tries')
    const stats = getStats(game.slug)
    const st = stars(best.scores)
    return (
      <>
        <Stage>
          <div className="pm-strip" aria-label="Your best day: each colour and your mix">
            {bestTargets.map((t, i) => (
              <div key={i} className="pm-strip-pair">
                <span className="pm-chip" style={{ background: css(mixColor(t)!) }} />
                <span className="pm-chip" style={{ background: css(best.mixes[i]) }} />
                <span className="small">{best.scores[i] === 100 ? '⭐' : `${best.scores[i]}%`}</span>
              </div>
            ))}
          </div>
        </Stage>
        <ResultCard
          game={game}
          headline={`${score}% match`}
          detail={<>Five colours{st ? ` · ${st} exact ⭐` : ''} · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`🎨 Paint Mix ${puzzleLabel(day)}\n${best.scores.map(square).join('')} ${score}% match\nBest of ${n}`}
          finishData={{ score, stars: st, tries: tries.length }}
          trackFinish={fresh}
          challenge={{ seed, score, text: `${score}%`, lowerIsBetter: false }}
          onReplay={again}
          replayLabel="Try again (five new colours)"
        />
      </>
    )
  }

  const lastScore = run.scores[run.scores.length - 1]
  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="small muted">Colour {run.round + 1} of {ROUNDS}{tries.length && !oneOff ? ` · try ${tries.length + 1}` : ''}</span>
        <AttemptTiles attempts={Array.from({ length: ROUNDS }, (_, i) => (i < run.scores.length ? grade(run.scores[i]) : 'empty'))} />
      </div>
      <div className="pm-tube" role="img" aria-label={`${count(left, 'drop')} of paint left for today`}>
        <span className="pm-tube-fill" style={{ width: `${(left / today.budget) * 100}%` }} />
        <span className="pm-tube-text">{count(left, 'drop')} of paint left today</span>
      </div>
      <Stage className="pm-stage" style={{ position: 'relative' }}>
        <div className="pm-pair">
          <Swatch color={target} label={`Colour ${run.round + 1}`} />
          <div className="pm-swatch">
            <Bowl run={run.bowl} color={mine} />
            <span className="small muted">Your mix · {count(run.bowl.length, 'drop')}</span>
          </div>
        </div>
        {revealing ? (
          <div className="pm-verdict" aria-live="polite">
            <span className="score">{lastScore}%</span>
            <span className="body-strong">{verdict(lastScore)}</span>
            {lastScore === 100 && <Burst y="0%" color={game.color} />}
          </div>
        ) : (
          <div className="pm-trail" aria-hidden="true">
            {run.bowl.map((i, j) => <span key={j} style={{ background: css(paintColor(PAINTS[i])) }} />)}
          </div>
        )}
      </Stage>
      {!revealing ? (
        <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
          <div className="pm-pots" role="group" aria-label="Add a drop of paint">
            {PAINTS.map((p, i) => (
              <button key={p.id} type="button" className="pm-pot" onClick={() => add(i)} disabled={left <= 0 || run.bowl.length >= MAX_DROPS} aria-label={`Add a drop of ${p.name.toLowerCase()} (${drops[i]} in)`}>
                <span className="pm-pot-paint" style={{ background: css(paintColor(p)) }} />
                <span className="pm-pot-name">{p.name}</span>
                {drops[i] > 0 && <span className="pm-pot-count" aria-hidden="true">{drops[i]}</span>}
                <kbd className="qg-kbd" aria-hidden="true">{i + 1}</kbd>
              </button>
            ))}
          </div>
          <Button size="lg" block color={game.color} onClick={lockIn} disabled={!run.bowl.length && left > 0} data-primary="click" hint="Enter">
            {!run.bowl.length && left <= 0 ? 'Out of paint: move on' : `Lock in colour ${run.round + 1}`}
          </Button>
          <p className="small muted center" style={{ margin: 0 }}>Paint can’t come back out, so add carefully. Yellow and blue make green; white lightens, black darkens. Only the mix counts, and your score shows after you lock in.</p>
        </div>
      ) : (
        <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
          <Button size="lg" block color={game.color} onClick={next} data-primary="click" hint="Space">
            {run.scores.length < ROUNDS ? `Next colour (${run.scores.length + 1} of ${ROUNDS})` : 'See my result'}
          </Button>
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
function Bowl({ run, color }: { run: number[]; color: Rgb | null }) {
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
