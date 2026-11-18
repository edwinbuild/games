import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GAMES } from '../games/registry'
import { SITE } from '../site'
import { getStats, todaysDaily } from '../shell/stats'
import '../shell/styles.css'

function Home() {
  const daily = GAMES.filter((g) => g.daily)
  const quick = GAMES.filter((g) => !g.daily)
  return (
    <div className="shell home">
      <header className="hero">
        <h1>{SITE.name}</h1>
        <p>{SITE.tagline}</p>
      </header>
      <h2 className="section-title">Today’s daily games</h2>
      <Grid games={daily} />
      <h2 className="section-title">Quick games</h2>
      <Grid games={quick} />
    </div>
  )
}

function Grid({ games }: { games: typeof GAMES }) {
  return (
    <ul className="cards">
      {games.map((g) => {
        const s = getStats(g.slug)
        const doneToday = g.daily && todaysDaily(g.slug) !== undefined
        return (
          <li key={g.slug}>
            <a className="card" href={`/${g.slug}/`} style={{ ['--accent' as string]: g.color }}>
              <span className="card-emoji" aria-hidden="true">{g.emoji}</span>
              <span className="card-title">{g.title}</span>
              <span className="card-tag">{g.tagline}</span>
              {doneToday ? (
                <span className="card-badge done">✓ Played today{s.streak > 1 ? ` · 🔥 ${s.streak}` : ''}</span>
              ) : g.daily ? (
                <span className="card-badge">New today</span>
              ) : s.plays > 0 ? (
                <span className="card-badge">Played {s.plays}×</span>
              ) : null}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
)
