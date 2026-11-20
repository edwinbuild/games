import { useEffect, useState } from 'react'
import { getGame } from './registry'
import { questionFor, rarity } from './odd-pick/questions'
import { rpc } from '../shell/api'
import { dateKey, msUntilTomorrow, puzzleLabel } from '../shell/daily'
import { feel } from '../shell/feel'
import { ResultCard } from '../shell/ResultCard'
import { getStats, recordDaily } from '../shell/stats'
import { load, save } from '../shell/storage'
import { SplitBars } from '../ui/charts'
import { Burst, Button, Stage } from '../ui/components'
import { boardKey } from '../shell/board'
import './odd-pick.css'

const game = getGame('odd-pick')
/** Below this many picks, a split isn't shown: it wouldn't mean much. */
const ENOUGH = 20
type Saved = { id: number; choice: number }
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`

export default function OddPick() {
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const { id, q } = questionFor(today)
  const [mine, setMine] = useState<Saved | null>(() => load<Saved | null>(`odd-pick:${dateKey(today)}`, null))
  const [choice, setChoice] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fresh, setFresh] = useState(false)

  async function lockIn() {
    if (choice == null || busy) return
    setBusy(true)
    setError('')
    try {
      await rpc('crowd_pick', { p_game: game.slug, p_day: dateKey(today), p_question: id, p_choice: choice, p_key: boardKey() })
      const s = { id, choice }
      save(`odd-pick:${dateKey(today)}`, s)
      recordDaily(game.slug, 0, new Date(), 'Picked')
      feel.click()
      feel.medium()
      setMine(s)
      setFresh(true)
    } catch {
      setError('Couldn’t lock in your pick. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const hours = Math.ceil(msUntilTomorrow() / 3_600_000)
  return (
    <>
      <Yesterday day={yesterday} />
      {!mine ? (
        <Stage>
          <div className="stack">
            <p className="eyebrow muted" style={{ margin: 0 }}>Today · {puzzleLabel(today)}</p>
            <h2 className="op-prompt">{q.prompt}</h2>
            <p className="small muted" style={{ margin: 0 }}>Choose the one you think the fewest people will pick. One pick a day; results tomorrow.</p>
            <div className="op-options" role="radiogroup" aria-label={q.prompt}>
              {q.options.map((o, i) => (
                <button key={i} type="button" role="radio" aria-checked={choice === i} className="op-option" onClick={() => { setChoice(i); feel.tap() }}>
                  {o}
                </button>
              ))}
            </div>
            <Button size="lg" block color={game.color} onClick={lockIn} disabled={choice == null || busy} data-primary="click" hint="Enter">
              {busy ? 'Locking in…' : choice == null ? 'Pick one' : `Lock in “${q.options[choice]}”`}
            </Button>
            {error && <p className="small" style={{ color: 'var(--danger)', margin: 0 }} role="alert">{error}</p>}
          </div>
        </Stage>
      ) : (
        <ResultCard
          game={game}
          headline={`Locked in: ${q.options[mine.choice]}`}
          detail={<>{q.prompt} · results in about {hours} hour{hours === 1 ? '' : 's'}{getStats(game.slug).streak > 1 ? ` · ${getStats(game.slug).streak} day streak` : ''}</>}
          shareText={`🎯 Odd Pick ${puzzleLabel(today)}\n${q.prompt}: can you find the rarest pick?`}
          finishData={{ choice: mine.choice }}
          trackFinish={fresh}
          challenge={{ seed: dateKey(today), score: 0, text: 'Picked', lowerIsBetter: true }}
          plainLink
        />
      )}
    </>
  )
}

/** Yesterday's results: how everyone picked, and how rare your pick was. */
function Yesterday({ day }: { day: Date }) {
  const { id, q } = questionFor(day)
  const mine = load<Saved | null>(`odd-pick:${dateKey(day)}`, null)
  const [counts, setCounts] = useState<number[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    rpc<number[]>('crowd_picks', { p_game: game.slug, p_day: dateKey(day), p_question: id }).then(setCounts, () => setFailed(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (failed || !counts) return null
  const total = counts.reduce((a, b) => a + b, 0)
  if (total === 0 && !mine) return null
  const r = mine ? rarity(counts, mine.choice) : null
  return (
    <Stage className="op-yesterday" style={{ position: 'relative' }}>
      {r && r.rank === 1 && total >= ENOUGH && <Burst y="18%" color={game.color} />}
      <div className="stack">
        <p className="eyebrow muted" style={{ margin: 0 }}>Yesterday · {q.prompt}</p>
        {total < ENOUGH ? (
          <p className="body" style={{ margin: 0 }}>Only {total} pick{total === 1 ? '' : 's'} yesterday, too few to show a split{mine ? `. You picked ${q.options[mine.choice]}.` : '.'}</p>
        ) : (
          <>
            {r && <p className="body-strong" style={{ margin: 0 }}>{r.rank === 1 ? `Your pick was the rarest! Only ${Math.round(r.share)}% chose ${q.options[mine!.choice]}.` : `Your pick was the ${ordinal(r.rank)} rarest: ${Math.round(r.share)}% chose ${q.options[mine!.choice]}.`}</p>}
            <SplitBars color={game.color} items={q.options.map((label, i) => ({ label, count: counts[i], mine: mine?.choice === i }))} />
            <p className="small muted" style={{ margin: 0 }}>{total} picks</p>
          </>
        )}
      </div>
    </Stage>
  )
}
