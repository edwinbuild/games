import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GAMES } from '../games/registry'
import { SITE } from '../site'
import { getStats, todaysDaily } from '../shell/stats'
import { GameCard, TopBar } from '../ui'
import '../shell/styles'

function status(slug: string, daily: boolean): { text?: string; done?: boolean } {
  const s = getStats(slug)
  if (daily && todaysDaily(slug) !== undefined) {
    return { text: s.streak > 1 ? `Played today · ${s.streak} day streak` : 'Played today', done: true }
  }
  if (daily) return { text: 'New today' }
  if (s.plays > 0) return { text: `Played ${s.plays} time${s.plays === 1 ? '' : 's'}` }
  return {}
}

function Grid({ games }: { games: typeof GAMES }) {
  return (
    <ul className="cards">
      {games.map((g) => {
        const st = status(g.slug, g.daily)
        return (
          <li key={g.slug}>
            <GameCard
              title={g.title}
              tagline={g.tagline}
              href={`/${g.slug}/`}
              color={g.color}
              sample={g.sample}
              daily={g.daily}
              status={st.text}
              done={st.done}
            />
          </li>
        )
      })}
    </ul>
  )
}

function Home() {
  return (
    <div className="page home">
      <TopBar siteName={SITE.name} />
      <header className="hero">
        <h1 className="site-title">{SITE.name}</h1>
        <p>{SITE.tagline}</p>
      </header>
      <h2 className="section-title eyebrow">Today’s daily games</h2>
      <Grid games={GAMES.filter((g) => g.daily)} />
      <h2 className="section-title eyebrow">Quick games</h2>
      <Grid games={GAMES.filter((g) => !g.daily)} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
)
