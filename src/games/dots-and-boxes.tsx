import { lazy, Suspense, useEffect, useState } from 'react'
import { getGame } from './registry'
import { aiMove, isOver, newGame, play, scores, type Level, type Player, type State } from './dots-and-boxes/board'
import { DotsBoard } from './dots-and-boxes/Board'
import { feel } from '../shell/feel'
import { roomFromUrl } from '../shell/online'
import { ResultCard } from '../shell/ResultCard'
import { useRunState } from '../shell/session'
import { load, save } from '../shell/storage'
import { countPlay, recordPlay } from '../shell/stats'
import { Button, Segmented, Stage } from '../ui/components'
import { PLAYERS, ScoreStrip } from '../ui/multiplayer'

const game = getGame('dots-and-boxes')
// The online room (and the realtime client) loads only when it's picked.
const Online = lazy(() => import('./dots-and-boxes/Online'))

type Mode = 'cpu' | 'phone' | 'online'
const LEVELS: { value: Level; label: string }[] = [{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]
const sizeFor = (mode: Mode, level: Level) => (mode === 'cpu' && level === 'easy' ? 3 : 4)
type Run = { s: State; first: Player }

export default function DotsAndBoxes() {
  const [mode, setModeState] = useState<Mode>(() => (roomFromUrl() ? 'online' : load<Mode>('dots-mode', 'cpu')))
  const [level, setLevelState] = useState<Level>(() => load<Level>('dots-level', 'medium'))
  const setMode = (m: Mode) => { setModeState(m); if (m !== 'online') save('dots-mode', m); feel.tap() }
  const setLevel = (l: Level) => { setLevelState(l); save('dots-level', l); feel.tap() }
  const picker = (started: boolean) => !started && (
    <div className="db-modes">
      <Segmented label="Play against" value={mode} onChange={setMode}
        options={[{ value: 'cpu', label: 'Computer' }, { value: 'phone', label: 'One phone' }, { value: 'online', label: 'Online' }]} />
      {mode === 'cpu' && <Segmented label="Level" value={level} onChange={setLevel} options={LEVELS} />}
    </div>
  )
  if (mode === 'online') {
    return (
      <Suspense fallback={<Stage><p className="body muted" style={{ margin: 0 }}>Loading…</p></Stage>}>
        <Online picker={picker(false)} />
      </Suspense>
    )
  }
  return <Local key={`${mode}:${level}`} mode={mode} level={level} picker={picker} />
}

function Local({ mode, level, picker }: { mode: 'cpu' | 'phone'; level: Level; picker: (started: boolean) => React.ReactNode }) {
  const size = sizeFor(mode, level)
  const [run, setRun] = useRunState<Run>(`${game.slug}:${mode}:${level}`, () => ({ s: newGame(size, size, 0), first: 0 }))
  const { s } = run
  const [fresh, setFresh] = useState(false)
  const over = isOver(s)
  const [a, b] = scores(s)
  const cpu = mode === 'cpu'
  const names: [string, string] = cpu ? ['You', 'Computer'] : [PLAYERS[0].name, PLAYERS[1].name]
  const started = s.lines.some((x) => x != null)

  function draw(e: number) {
    const { state, claimed } = play(s, e)
    if (state === s) return
    setRun({ ...run, s: state })
    if (claimed) feel.pop(Math.min(scores(state)[state.turn], 12))
    else feel.light()
    if (isOver(state)) finish(state)
  }
  function finish(end: State) {
    const [x, y] = scores(end)
    if (cpu) {
      if (x > y) {
        const rank = LEVELS.findIndex((l) => l.value === level) * 100 + 50 + (x - y)
        recordPlay(game.slug, rank, undefined, `Beat ${level} ${x}–${y}`)
        feel.success()
      } else { countPlay(game.slug); if (x < y) feel.thud() }
    } else { countPlay(game.slug); feel.success() }
    setFresh(true)
  }

  // The computer's turn: a short pause, a little quicker when it's taking boxes.
  useEffect(() => {
    if (!cpu || over || s.turn !== 1) return
    const again = s.last != null && s.lines[s.last] === 1
    const t = setTimeout(() => draw(aiMove(s, level)), again ? 380 : 620)
    return () => clearTimeout(t)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  function rematch() {
    const first: Player = run.first === 0 ? 1 : 0
    setRun({ s: newGame(size, size, first), first })
    setFresh(false)
  }

  const turnText = over ? '' : cpu ? (s.turn === 0 ? 'Your turn' : 'Computer is thinking…') : `${names[s.turn]}’s turn`
  const headline = cpu
    ? (a > b ? `You beat the computer ${a}–${b}` : a < b ? `The computer won ${b}–${a}` : `A draw, ${a}–${b}`)
    : (a === b ? `A draw, ${a}–${b}` : `${names[a > b ? 0 : 1]} wins ${Math.max(a, b)}–${Math.min(a, b)}`)
  return (
    <>
      {picker(started && !over)}
      <div className="db-strip" data-turn={over ? undefined : s.turn}>
        <ScoreStrip players={[{ name: names[0], score: a, player: 0 }, { name: names[1], score: b, player: 1 }]} />
      </div>
      <p className="small muted center db-turn" aria-live="polite">{turnText}</p>
      <Stage className="db-stage">
        <DotsBoard s={s} canPlay={!over && (!cpu || s.turn === 0)} onPlay={draw} names={names} />
      </Stage>
      {!over && (
        <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
          {started && <Button variant="ghost" onClick={() => { setRun({ ...run, s: newGame(size, size, run.first) }); feel.tap() }}>Start over</Button>}
          <p className="small muted center" style={{ margin: 0 }}>Tip: near the end every line gives boxes away. Try to make your opponent open the first long chain.</p>
        </div>
      )}
      {over && (
        <ResultCard
          game={game}
          headline={headline}
          detail={cpu ? `${LEVELS.find((l) => l.value === level)!.label} computer · ${size}×${size} boxes` : `${size}×${size} boxes, two players on one phone`}
          shareText={cpu ? `✏️ Dots & Boxes\n${headline} (${level})` : `✏️ Dots & Boxes\n${headline}`}
          finishData={{ mode, level: cpu ? level : 'none', mine: a, theirs: b }}
          trackFinish={fresh}
          challenge={{ seed: 'dots', score: a - b, text: `${a}–${b}`, lowerIsBetter: false }}
          plainLink
          onReplay={rematch}
          replayLabel={cpu ? (run.first === 0 ? 'Play again (computer starts)' : 'Play again (you start)') : 'Rematch'}
        />
      )}
    </>
  )
}
