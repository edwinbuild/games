import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GAMES, type GameMeta } from '../games/registry'
import { SITE } from '../site'
import { formatCount, SHOW_FROM, useRecentPlays } from '../shell/live'
import { SiteFooter } from '../shell/SiteFooter'
import { getStats, todaysDaily, todaysDailyText } from '../shell/stats'
import { Countdown, GameCard, TopBar } from '../ui'
import '../shell/styles'

/** What the card's colour band shows: the player's own result if they have one, else an example. */
function score(g: GameMeta): { sample: string; label: string } {
  const today = g.daily ? todaysDailyText(g.slug) : undefined
  if (today) return { sample: today, label: 'Today' }
  const best = getStats(g.slug).bestText
  if (!g.daily && best) return { sample: best, label: 'Your best' }
  return { sample: g.sample, label: 'Example' }
}

function status(g: GameMeta): { text?: string; done?: boolean } {
  const s = getStats(g.slug)
  if (g.daily && todaysDaily(g.slug) !== undefined) {
    return { text: s.streak > 1 ? `Played today · ${s.streak} day streak` : 'Played today', done: true }
  }
  if (g.daily) return { text: s.streak > 0 ? `Keep your ${s.streak} day streak` : 'New today' }
  if (s.plays > 0) return { text: `Played ${s.plays} time${s.plays === 1 ? '' : 's'}` }
  return {}
}

function Card({ g }: { g: GameMeta }) {
  const st = status(g)
  const sc = score(g)
  return (
    <li>
      <GameCard
        title={g.title}
        tagline={g.tagline}
        href={`/${g.slug}/`}
        color={g.color}
        sample={sc.sample}
        sampleLabel={sc.label}
        daily={g.daily}
        status={st.text}
        done={st.done}
        transitionName={g.slug}
      />
    </li>
  )
}

function Home() {
  const daily = GAMES.filter((g) => g.daily)
  const played = daily.filter((g) => todaysDaily(g.slug) !== undefined)
  // Unplayed daily games first, in their usual order; played ones after.
  const ordered = [...daily.filter((g) => !played.includes(g)), ...played]
  const left = daily.length - played.length
  const recent = useRecentPlays()
  const total = recent ? Object.values(recent).reduce((a, b) => a + b, 0) : 0
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="page page--home home">
      <TopBar siteName={SITE.name} />
      <header className="today">
        <h1 className="site-title">{SITE.name}</h1>
        <div className="today-line">
          <p className="body-strong">{today}</p>
          <p className="body muted">
            {left === 0
              ? `You've played all ${daily.length} daily games today.`
              : played.length === 0
                ? `${daily.length} daily games are waiting.`
                : `${left} of ${daily.length} daily games left today.`}
          </p>
          <Countdown label="New daily games in" />
          {total >= SHOW_FROM && <p className="small muted live-count">{formatCount(total)} games finished here in the last 24 hours</p>}
        </div>
      </header>

      <section aria-labelledby="daily-title">
        <h2 id="daily-title" className="section-title card-title">Today’s puzzles</h2>
        <ul className="cards cards--daily">{ordered.map((g) => <Card key={g.slug} g={g} />)}</ul>
      </section>

      <section aria-labelledby="any-title">
        <h2 id="any-title" className="section-title card-title">Play any time</h2>
        <ul className="cards">{GAMES.filter((g) => !g.daily).map((g) => <Card key={g.slug} g={g} />)}</ul>
      </section>
      <SiteFooter />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
)
