import { useEffect, useRef, useState } from 'react'
import { getGame } from './registry'
import { dateKey } from '../shell/daily'
import { ResultCard } from '../shell/ResultCard'
import { getStats, loadToday, recordDaily, saveToday } from '../shell/stats'

const game = getGame('luckiest-person')

function verdict(r: number) {
  if (r === 100) return 'The luckiest roll there is. Buy a lottery ticket.'
  if (r >= 90) return 'Ridiculously lucky today.'
  if (r >= 70) return 'Luck is on your side.'
  if (r >= 40) return 'A perfectly ordinary day.'
  if (r >= 15) return 'Maybe stay in bed.'
  return 'Ouch. Tomorrow can only be better.'
}

const bar = (r: number) => '🟩'.repeat(Math.round(r / 10)) + '⬜'.repeat(10 - Math.round(r / 10))

export default function LuckiestPerson() {
  const [roll, setRoll] = useState<number | null>(() => loadToday<number | null>(game.slug, null))
  const [rolling, setRolling] = useState(false)
  const [shown, setShown] = useState(roll ?? 0)
  const alreadyRolled = useRef(roll != null)
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => () => clearInterval(timer.current), [])

  function doRoll() {
    if (roll != null || rolling) return
    const result = 1 + Math.floor(Math.random() * 100)
    saveToday(game.slug, result) // saved first so a reload can't re-roll
    recordDaily(game.slug, result)
    setRolling(true)
    const started = performance.now()
    timer.current = setInterval(() => {
      if (performance.now() - started > 1400) {
        clearInterval(timer.current)
        setShown(result)
        setRoll(result)
        setRolling(false)
      } else setShown(1 + Math.floor(Math.random() * 100))
    }, 60)
  }

  const stats = getStats(game.slug)

  return (
    <>
      <div className="stage" style={{ padding: '32px 20px' }}>
        <p className="label" style={{ margin: 0 }}>Today’s luck · {dateKey()}</p>
        <p className="big-number" style={{ fontSize: 96, margin: '8px 0', color: roll != null ? 'var(--accent)' : undefined }}>
          {roll == null && !rolling ? '?' : shown}
        </p>
        {roll == null && (
          <button className="btn btn-big" onClick={doRoll} disabled={rolling}>
            {rolling ? 'Rolling…' : '🍀 Roll my luck'}
          </button>
        )}
        {roll != null && <p style={{ margin: 0, fontWeight: 700 }}>{verdict(roll)}</p>}
      </div>

      {roll != null && (
        <ResultCard
          game={game}
          headline={`Luckier than ${roll - 1}% of rolls`}
          detail={<>Your luck: {roll}/100{stats.streak > 1 && <> · 🔥 {stats.streak} days in a row</>}</>}
          shareText={`🍀 Luckiest Person ${dateKey()}\n${bar(roll)} ${roll}/100\nLuckier than ${roll - 1}% of rolls today`}
          trackFinish={!alreadyRolled.current}
          finishData={{ roll }}
        />
      )}
    </>
  )
}
