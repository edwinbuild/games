// One screen for every version of Hidden Word (1, 2, 4 or 8 hidden words at once). Each version is
// its own game page with its own daily board; this file holds what they share.
import { useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from '../registry'
import { answersFor, keyMarks, LEN, mark, MODES, scoreOf, scoreText, solvedAt, type Mark, type Mode } from './rules'
import { loadWords, type WordList } from './words'
import { newSeed, readChallenge } from '../../shell/challenge'
import { dailyDayFor, dateKey, puzzleLabel } from '../../shell/daily'
import { feel } from '../../shell/feel'
import { count } from '../../shell/plural'
import { ResultCard } from '../../shell/ResultCard'
import { useRunState } from '../../shell/session'
import { load } from '../../shell/storage'
import { getStats, loadToday, recordDaily, saveToday } from '../../shell/stats'
import { Burst, Button, Stage } from '../../ui/components'
import '../hidden-word.css'

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
const EMOJI: Record<Mark, string> = { right: '🔵', elsewhere: '🟡', out: '⚪' }
const SAY = { short: 'Five letters, please.', unknown: 'That’s not in the word list.' }

/**
 * On a computer the boards fill the space between the heading and the keyboard: try 1, 2, 4 or 8
 * boards across and keep whichever gives the biggest squares. Phones keep their own layout.
 */
function useFit(n: number, rows: number, ready: unknown) {
  const ref = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<{ cols: number; cell: number } | null>(null)
  useEffect(() => {
    const measure = () => {
      const el = ref.current
      if (!el || window.innerWidth < 1000) { setFit(null); return }
      const gap = 12, inner = 3 // between boards, between squares
      const width = el.clientWidth
      const bottom = document.querySelector('.hw-bottom')?.getBoundingClientRect().height ?? 260
      const height = window.innerHeight - (el.getBoundingClientRect().top + window.scrollY) - bottom - 16
      let best = { cols: Math.min(n, 2), cell: 0 }
      for (const cols of [1, 2, 4, 8].filter((c) => c <= n)) {
        const across = Math.ceil(n / cols)
        const w = (width - (cols - 1) * gap - cols * 8) / cols / 5 - inner
        const h = (height - (across - 1) * gap - across * 8) / across / rows - inner
        const cell = Math.min(w, h, 76)
        if (cell > best.cell) best = { cols, cell }
      }
      // Too small to read when everything has to fit: four across at a readable size, and scroll.
      if (best.cell < 24) {
        const cols = Math.min(n, 4)
        best = { cols, cell: Math.min((width - (cols - 1) * gap - cols * 8) / cols / 5 - inner, 40) }
      }
      setFit(best.cell >= 14 ? { cols: best.cols, cell: Math.floor(best.cell) } : null)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [n, rows, ready])
  return [ref, fit] as const
}

export default function HiddenWordGame({ mode }: { mode: Mode }) {
  const game = getGame(mode)
  const { boards: n, guesses: max } = MODES[mode]
  const { day, oneOff } = dailyDayFor(readChallenge(mode)?.s)
  // After the daily, practice rounds with new words: just for fun (no board, no streak, no stats).
  const [practice, setPractice] = useRunState<string | null>(`${mode}:practice`, null)
  const daily = practice == null
  const seed = practice ?? dateKey(day)
  const counts = daily && !oneOff
  const [list, setList] = useState<WordList | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => { loadWords().then(setList, () => setFailed(true)) }, [])
  // One game a day: the guesses so far are kept for the day (a refresh or a later visit carries on).
  const [guesses, setGuessesRun] = useRunState<string[]>(`${mode}:${seed}:${!daily ? 'practice' : oneOff ? 'once' : 'day'}`, () => (counts ? loadToday(mode, [] as string[]) : []))
  const [typed, setTyped] = useState('')
  const [msg, setMsg] = useState('')
  const [shake, setShake] = useState(0)
  const [fresh, setFresh] = useState(false)
  const [seen, setSeen] = useState(false)
  const [justAdded, setJustAdded] = useState(-1)
  const typedRef = useRef('')
  typedRef.current = typed

  const answers = useMemo(() => (list ? answersFor(mode, seed, list.answers) : []), [list, mode, seed])
  const at = answers.length ? solvedAt(guesses, answers) : []
  const allSolved = answers.length > 0 && at.every((x) => x != null)
  const over = allSolved || guesses.length >= max
  const keys = useMemo(() => (answers.length ? keyMarks(guesses, answers) : {}), [guesses, answers])
  const showSolution = useMemo(() => load<boolean>('test-solutions', false), [])
  const [fitRef, fit] = useFit(n, max, `${!!list}:${practice}:${seen}`)

  function setGuesses(g: string[]) {
    setGuessesRun(g)
    if (counts) saveToday(mode, g)
  }

  function submit() {
    const w = typedRef.current
    if (over || !list) return
    if (w.length < LEN) { setMsg(SAY.short); setShake((s) => s + 1); feel.bad(); return }
    if (!list.guesses.has(w)) { setMsg(SAY.unknown); setShake((s) => s + 1); feel.bad(); return }
    const g = [...guesses, w]
    setGuesses(g)
    setJustAdded(g.length - 1)
    setTyped('')
    setMsg('')
    const nowAt = solvedAt(g, answers)
    const done = nowAt.every((x) => x != null) || g.length >= max
    const newly = nowAt.filter((x, b) => x === g.length - 1 && at[b] == null).length
    if (newly) { feel.chime(Math.min(8, 2 + g.length)); feel.success() } else feel.light()
    if (done) {
      const score = scoreOf(mode, g, answers)
      if (counts) recordDaily(mode, score, new Date(), scoreText(mode, score), true)
      setFresh(true)
    }
  }
  function press(k: string) {
    if (over) return
    if (k === 'enter') return submit()
    setMsg('')
    if (k === 'back') { setTyped((t) => t.slice(0, -1)); return }
    if (/^[a-z]$/.test(k)) setTyped((t) => (t.length < LEN ? t + k : t))
  }
  // The keyboard: letters, Backspace and Enter.
  useEffect(() => {
    if (over) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement | null)?.closest('input, textarea')) return
      if (e.key === 'Enter') { e.preventDefault(); press('enter') }
      else if (e.key === 'Backspace') { e.preventDefault(); press('back') }
      else if (/^[a-z]$/i.test(e.key)) press(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (failed) return <Stage><p className="body center" style={{ margin: 0 }}>Couldn’t load the word list. Check your connection and reload.</p></Stage>
  if (!list) return <Stage><p className="body muted center" style={{ margin: 0 }}>Loading words…</p></Stage>

  const solvedCount = at.filter((x) => x != null).length
  const boardsView = (
    <div ref={fitRef} className={`hw-boards hw-boards--${n}${fit ? ' is-fit' : ''}`} style={fit ? ({ '--cols': fit.cols, '--cell': `${fit.cell}px` } as React.CSSProperties) : undefined} data-answers={showSolution ? answers.join(' ') : undefined} data-guesses={guesses.join(' ')}>
      {answers.map((a, b) => {
        const doneAt = at[b]
        const rows = doneAt == null ? guesses : guesses.slice(0, doneAt + 1)
        return (
          <div key={b} className={`hw-board${doneAt != null ? ' is-solved' : ''}${over && doneAt == null ? ' is-missed' : ''}`} aria-label={`Word ${b + 1}${doneAt != null ? `: found, ${a.toUpperCase()}` : over ? `: not found, it was ${a.toUpperCase()}` : ''}`}>
            {Array.from({ length: max }, (_, r) => {
              const g = rows[r]
              const isTyping = !over && doneAt == null && r === guesses.length
              const marks = g ? mark(g, a) : null
              const last = !!g && r === justAdded
              return (
                <div key={r} className={`hw-row${isTyping && shake ? ' is-shake' : ''}${last ? ' is-new' : ''}`} data-shake={isTyping ? shake : undefined} aria-label={g ? `${g.toUpperCase()}: ${marks!.join(', ')}` : undefined}>
                  {Array.from({ length: LEN }, (_, i) => {
                    const c = g ? g[i] : isTyping ? typed[i] : ''
                    return <span key={i} className={`hw-cell${marks ? ` is-${marks[i]}` : c ? ' is-typed' : ''}`} style={{ '--i': i } as React.CSSProperties}>{c?.toUpperCase()}</span>
                  })}
                </div>
              )
            })}
            {over && doneAt == null && <p className="hw-reveal">{a.toUpperCase()}</p>}
          </div>
        )
      })}
    </div>
  )

  function startPractice(on: boolean) {
    setPractice(on ? newSeed() : null)
    setTyped(''); setMsg(''); setSeen(false); setFresh(false); setJustAdded(-1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (over && (seen || !fresh)) {
    const score = scoreOf(mode, guesses, answers)
    const text = scoreText(mode, score)
    const stats = getStats(mode)
    const headline = allSolved
      ? n === 1 ? `Found it in ${text}` : `All ${n} words in ${text}`
      : n === 1 ? `The word was ${answers[0].toUpperCase()}` : `${solvedCount} of ${n} words found`
    const grid = n === 1
      ? guesses.map((g) => mark(g, answers[0]).map((m) => EMOJI[m]).join('')).join('\n')
      : at.map((x) => (x == null ? '❌' : `${x + 1}`.padStart(2, ' '))).reduce((rows, c, i) => { (rows[Math.floor(i / 4)] ??= []).push(c); return rows }, [] as string[][]).map((r) => r.join(' ')).join('\n')
    return (
      <>
        <Stage>{boardsView}</Stage>
        <ResultCard
          key={seed /* a practice round and today's game each get their own card (its count-up keeps state) */}
          game={game}
          headline={daily ? headline : `Practice: ${headline.charAt(0).toLowerCase()}${headline.slice(1)}`}
          detail={<>{allSolved ? `${count(guesses.length, 'guess', 'guesses')} of ${max}` : `Words: ${answers.map((w) => w.toUpperCase()).join(', ')}`}{counts && stats.streak > 1 ? ` · ${stats.streak} day streak` : ''}</>}
          shareText={`${game.emoji} ${game.title} ${daily ? puzzleLabel(day) : 'practice'} · ${text}\n${grid}`}
          finishData={{ score, solved: solvedCount, guesses: guesses.length, practice: daily ? 0 : 1 }}
          trackFinish={fresh}
          challenge={{ seed, score, text, lowerIsBetter: true }}
          plainLink={!daily}
          onReplay={() => startPractice(true)}
          replayLabel={daily ? 'Practice round (new words)' : 'Another practice round'}
          extra={!daily && <Button variant="secondary" block onClick={() => startPractice(false)}>Back to today’s result</Button>}
        />
      </>
    )
  }

  return (
    <>
      <div className="between" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="small muted">{!daily ? 'Practice round · not on the board' : n === 1 ? 'One hidden word' : `${n} hidden words · ${solvedCount} found`}</span>
        <span className="small muted">Guess {Math.min(guesses.length + 1, max)} of {max}</span>
      </div>
      <Stage flush className={`hw-stage hw-stage--${n}`} style={{ position: 'relative' }}>
        {boardsView}
        {over && allSolved && <Burst y="40%" color={game.color} />}
      </Stage>
      <div className="hw-bottom">
        <p className="small center hw-msg" role="status">{msg || ' '}</p>
        {over ? (
          <Button size="lg" block color={game.color} onClick={() => setSeen(true)} data-primary="click" hint="Space">See my result</Button>
        ) : (
          <div className="hw-keys" role="group" aria-label="Keyboard">
            {ROWS.map((row, r) => (
              <div key={r} className="hw-keyrow">
                {r === 2 && <button type="button" className="hw-key hw-key--wide" onClick={() => press('enter')}>Enter</button>}
                {[...row].map((c) => {
                  const ms = keys[c] ?? answers.map(() => null)
                  return (
                    <button key={c} type="button" className={`hw-key${n === 1 && ms[0] ? ` is-${ms[0]}` : ''}`} onClick={() => press(c)} aria-label={`${c.toUpperCase()}${n === 1 && ms[0] ? `, ${ms[0]}` : ''}`}>
                      {n > 1 && <span className={`hw-keymap hw-keymap--${n}`} aria-hidden="true">{ms.map((m, b) => <i key={b} className={m ? `is-${m}` : at[b] != null ? 'is-done' : ''} />)}</span>}
                      <span className="hw-keyletter">{c.toUpperCase()}</span>
                    </button>
                  )
                })}
                {r === 2 && <button type="button" className="hw-key hw-key--wide" onClick={() => press('back')} aria-label="Delete">⌫</button>}
              </div>
            ))}
          </div>
        )}
        <p className="small muted center" style={{ margin: 0 }}>
          {n === 1 ? 'Guess the five-letter word.' : `Each guess goes on all ${n} boards.`} Filled: right letter, right spot. Dashed: in the word, another spot. Grey: not in it.
        </p>
      </div>
    </>
  )
}
