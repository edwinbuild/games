import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { GAMES } from '../games/registry'
import { SITE } from '../site'
import { rpc } from '../shell/api'
import { load, save } from '../shell/storage'
import { Button, TextField, TopBar } from '../ui'
import '../shell/styles'

type Row = { day: string; game: string; starts: number; finishes: number; shares: number; play_next: number }
const DAYS = 14
const title = (slug: string) => GAMES.find((g) => g.slug === slug)?.title ?? slug
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '–')

function keyFromHash(): string {
  const m = /key=([a-z0-9]+)/i.exec(location.hash)
  return m ? m[1] : ''
}

function Stats() {
  const [key, setKey] = useState(() => keyFromHash() || load<string>('statsKey', ''))
  const [input, setInput] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!key) return
    rpc<Row[]>('stats', { p_key: key, p_days: DAYS })
      .then((r) => {
        setRows(r.map((x) => ({ ...x, starts: +x.starts, finishes: +x.finishes, shares: +x.shares, play_next: +x.play_next })))
        setError('')
        save('statsKey', key)
        if (location.hash) history.replaceState(null, '', location.pathname) // keep the key out of the address bar
      })
      .catch(() => {
        setError('That key didn’t work. Check it and try again.')
        setRows(null)
      })
  }, [key])

  const byGame = new Map<string, Row>()
  const byDay = new Map<string, Row>()
  for (const r of rows ?? []) {
    for (const [map, k] of [[byGame, r.game], [byDay, r.day]] as const) {
      const t = map.get(k) ?? { day: r.day, game: r.game, starts: 0, finishes: 0, shares: 0, play_next: 0 }
      t.starts += r.starts
      t.finishes += r.finishes
      t.shares += r.shares
      t.play_next += r.play_next
      map.set(k, t)
    }
  }
  const games = [...byGame.values()].sort((a, b) => b.starts - a.starts)

  return (
    <div className="page page--home">
      <TopBar siteName={SITE.name} />
      <main className="stats">
        <h1 className="game-title">Stats</h1>
        <p className="body muted">Last {DAYS} days, UTC. Counts only: no players are tracked. Healthy: finish rate above 60%, share rate above 5%.</p>

        {!rows && (
          <form className="stack stats-key" onSubmit={(e) => { e.preventDefault(); setKey(input.trim()) }}>
            <TextField id="stats-key" label="Stats key" value={input} onChange={setInput} />
            <Button type="submit">Open stats</Button>
            {error && <p className="small" style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>}
          </form>
        )}

        {rows && rows.length === 0 && <p className="body-strong">No plays counted yet. Counts start with the first game played on the live site.</p>}

        {rows && rows.length > 0 && (
          <>
            <h2 className="card-title">By game</h2>
            <div className="table-wrap">
              <table className="stats-table">
                <thead>
                  <tr><th>Game</th><th>Started</th><th>Finished</th><th>Finish rate</th><th>Shared</th><th>Share rate</th><th>Played next</th></tr>
                </thead>
                <tbody>
                  {games.map((g) => {
                    const fr = g.starts ? g.finishes / g.starts : 0
                    const sr = g.finishes ? g.shares / g.finishes : 0
                    return (
                      <tr key={g.game}>
                        <td>{title(g.game)}</td>
                        <td>{g.starts}</td>
                        <td>{g.finishes}</td>
                        <td data-ok={fr >= 0.6 || undefined}>{pct(g.finishes, g.starts)}{fr >= 0.6 ? ' ✓' : ''}</td>
                        <td>{g.shares}</td>
                        <td data-ok={sr >= 0.05 || undefined}>{pct(g.shares, g.finishes)}{sr >= 0.05 ? ' ✓' : ''}</td>
                        <td>{g.play_next}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <h2 className="card-title">By day, all games</h2>
            <div className="table-wrap">
              <table className="stats-table">
                <thead>
                  <tr><th>Day</th><th>Started</th><th>Finished</th><th>Finish rate</th><th>Shared</th></tr>
                </thead>
                <tbody>
                  {[...byDay.values()].map((d) => (
                    <tr key={d.day}>
                      <td>{d.day}</td><td>{d.starts}</td><td>{d.finishes}</td><td>{pct(d.finishes, d.starts)}</td><td>{d.shares}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="ghost" onClick={() => { save('statsKey', ''); setKey(''); setRows(null) }}>Forget the key in this browser</Button>
          </>
        )}
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Stats />
  </StrictMode>,
)
