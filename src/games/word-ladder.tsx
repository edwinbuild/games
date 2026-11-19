import { useMemo, useRef, useState } from 'react'
import { getGame } from './registry'
import { canStep, isWord, puzzleFor, shortest } from './word-ladder/ladder'
import { readChallenge } from '../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { count } from '../shell/plural'
import { ResultCard } from '../shell/ResultCard'
import { useRunState } from '../shell/session'
import { load } from '../shell/storage'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'
import { Burst, Button, Stage } from '../ui'

const game = getGame('word-ladder')
/** A finished try: the words between start and end, in order (end included). */
type Try = string[]

function Word({ word, prev, tone }: { word: string; prev?: string; tone?: 'start' | 'end' | 'step' }) {
  return (
    <span className={`wl-word${tone ? ` wl-word--${tone}` : ''}`} aria-label={word}>
      {[...word].map((c, i) => <span key={i} className={prev && prev[i] !== c ? 'wl-tile is-new' : 'wl-tile'} aria-hidden="true">{c}</span>)}
    </span>
  )
}

export default function WordLadder() {
  const { day, oneOff } = dailyDayFor(readChallenge(game.slug)?.s)
  const seed = dateKey(day)
  const { start, end, par } = useMemo(() => puzzleFor(seed), [seed])
  const [tries, setTries] = useState<Try[]>(() => (oneOff ? [] : loadToday(game.slug, [] as Try[])))
  // The ladder so far survives a refresh.
  const [steps, setSteps] = useRunState<string[]>(`${game.slug}:${seed}:${oneOff ? 'once' : tries.length}`, [])
  const [done, setDone] = useState(tries.length > 0 && steps.length === 0)
  const [fresh, setFresh] = useState(false)
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const last = steps.length ? steps[steps.length - 1] : start
  const solved = last === end
  const testLadder = useMemo(() => (load<boolean>('test-solutions', false) ? shortest(start, end)!.slice(1).join(' ') : undefined), [start, end])

  function add() {
    const w = text.trim().toLowerCase()
    if (solved || !w) return
    if (w.length !== 4) { setMsg('Four letters, please.'); feel.bad(); return }
    if (!isWord(w)) { setMsg(`“${w.toUpperCase()}” isn’t in the word list.`); feel.bad(); return }
    if (!canStep(last, w)) { setMsg(`Change exactly one letter of ${last.toUpperCase()}.`); feel.bad(); return }
    if (w === start || steps.includes(w)) { setMsg('That word is already in your ladder.'); feel.bad(); return }
    const next = [...steps, w]
    setSteps(next)
    setText('')
    setMsg('')
    if (w === end) {
      // Saved at the last step, so a refresh can't lose it.
      const all = [...tries, next]
      if (!oneOff) {
        saveToday(game.slug, all)
        const best = Math.min(...all.map((t) => t.length))
        recordDaily(game.slug, best, new Date(), count(best, 'step'), true)
      }
      setFresh(true)
      next.forEach((_, i) => setTimeout(() => feel.chime(i + 2), 90 * i))
      feel.success()
    } else {
      feel.pop(Math.min(next.length, 9))
      feel.light()
      input.current?.focus()
    }
  }
  function undo() {
    if (solved || !steps.length) return
    setSteps(steps.slice(0, -1))
    setMsg('')
    feel.tap()
  }
  function seeResult() {
    setTries([...tries, steps])
    setDone(true)
  }
  function again() {
    setSteps([])
    setDone(false)
  }

  if (done && tries.length) {
    const best = tries.reduce((a, b) => (b.length < a.length ? b : a))
    const n = count(tries.length, 'try', 'tries')
    const stats = getStats(game.slug)
    return (
      <>
        <Stage>
          <div className="wl-ladder wl-ladder--done">
            {[start, ...best].map((w, i, all) => <Word key={i} word={w} prev={i ? all[i - 1] : undefined} tone={i === 0 ? 'start' : i === all.length - 1 ? 'end' : 'step'} />)}
          </div>
        </Stage>
        <ResultCard
          game={game}
          headline={`${start.toUpperCase()} to ${end.toUpperCase()} in ${count(best.length, 'step')}`}
          detail={<>Par {par}{best.length === par ? ' · on par' : ''} · best of {n}{!oneOff && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`🪜 Word Ladder ${puzzleLabel(day)}\n${start.toUpperCase()} → ${end.toUpperCase()} in ${best.length} (par ${par})\n${best.map((_, i) => (i < par ? '🟩' : '🟨')).join('')}`}
          finishData={{ steps: best.length, par, tries: tries.length }}
          trackFinish={fresh}
          challenge={{ seed, score: best.length, text: count(best.length, 'step'), lowerIsBetter: true }}
          onReplay={again}
          replayLabel="Try again"
        />
      </>
    )
  }

  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="small muted">Par {par}{tries.length ? ` · try ${tries.length + 1}` : ''}</span>
        <span className="small muted" aria-live="polite">{count(steps.length, 'step')}</span>
      </div>
      <Stage style={{ position: 'relative' }}>
        <div className="wl-ladder" data-ladder={testLadder}>
          <Word word={start} tone="start" />
          {steps.map((w, i) => <Word key={i} word={w} prev={i ? steps[i - 1] : start} tone={w === end ? 'end' : 'step'} />)}
          {!solved && <span className="wl-gap" aria-hidden="true">⋮</span>}
          {!solved && <Word word={end} tone="end" />}
        </div>
        {solved && <Burst y="30%" color={game.color} />}
      </Stage>
      <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
        {solved ? (
          <Button size="lg" block color={game.color} onClick={seeResult} data-primary="click" hint="Space">See my result ({count(steps.length, 'step')})</Button>
        ) : (
          <>
            <form className="wl-entry" onSubmit={(e) => { e.preventDefault(); add() }}>
              <label className="eyebrow muted" htmlFor="wl-input">Next word: change one letter of {last.toUpperCase()}</label>
              <div className="wl-entry-row">
                <input
                  id="wl-input" ref={input} className="wl-input" value={text} maxLength={4} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
                  onChange={(e) => { setText(e.target.value.replace(/[^a-zA-Z]/g, '')); setMsg('') }} aria-describedby="wl-msg"
                />
                <Button type="submit" color={game.color} disabled={text.length !== 4}>Add</Button>
              </div>
              <p id="wl-msg" className="small wl-msg" role="status">{msg}</p>
            </form>
            <Button variant="ghost" onClick={undo} disabled={!steps.length}>Take back the last word</Button>
          </>
        )}
        <p className="small muted center" style={{ margin: 0 }}>Each word changes one letter of the one before it; every word must be a real everyday word. Reach {end.toUpperCase()} in as few steps as you can.</p>
      </div>
    </>
  )
}
