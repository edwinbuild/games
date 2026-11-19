import { StrictMode, useEffect, useState, type CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'
import { GAMES, playersLabel, type GameMeta } from '../games/registry'
import { SITE } from '../site'
import { formatCount, SHOW_FROM, useRecentPlays } from '../shell/live'
import { DEMOS } from '../shell/demos'
import { SiteFooter } from '../shell/SiteFooter'
import { getStats, todaysDaily, todaysDailyText } from '../shell/stats'
import { load, save } from '../shell/storage'
import { Countdown, FilterChips, GameCard, ProgressRing, TopBar } from '../ui'
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

function Card({ g, i }: { g: GameMeta; i: number }) {
  const st = status(g)
  const sc = score(g)
  const Demo = DEMOS[g.slug]
  return (
    // --i staggers the cards rising in.
    <li style={{ '--i': i } as CSSProperties}>
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
        tag={playersLabel(g) ?? undefined}
        demo={Demo ? <Demo /> : undefined}
      />
    </li>
  )
}

/** Card demos play only while their card is on screen. */
function usePlayOnScreen() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) (e.target as HTMLElement).toggleAttribute('data-playing', e.isIntersecting)
    }, { threshold: 0.4 })
    document.querySelectorAll('.qg-card:has(.demo)').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

type Filter = 'all' | 'daily' | 'any' | 'friends'
const FILTERS: Filter[] = ['all', 'daily', 'any', 'friends']

function Home() {
  usePlayOnScreen()
  // The chosen filter is remembered in this browser.
  const [filter, setFilterState] = useState<Filter>(() => {
    const f = load<string>('home-filter', 'all')
    return (FILTERS as string[]).includes(f) ? (f as Filter) : 'all'
  })
  const setFilter = (f: Filter) => { setFilterState(f); save('home-filter', f) }
  const solo = (g: GameMeta) => !g.players || g.players === 1
  const daily = GAMES.filter((g) => g.daily && solo(g))
  const anyTime = GAMES.filter((g) => !g.daily && solo(g))
  const friends = GAMES.filter((g) => !solo(g))
  const shows = (f: Filter) => filter === 'all' || filter === f
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
          <ProgressRing color="ticket" value={played.length} max={daily.length} label={`${played.length} of ${daily.length} daily games played today`} />
          <div className="today-text">
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
        </div>
      </header>

      <FilterChips
        label="Show games"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All', count: GAMES.length },
          { value: 'daily', label: 'Daily', count: daily.length },
          { value: 'any', label: 'Any time', count: anyTime.length },
          { value: 'friends', label: 'With friends', count: friends.length },
        ]}
      />

      {shows('daily') && (
        <section aria-labelledby="daily-title">
          <h2 id="daily-title" className="section-title card-title">Today’s puzzles</h2>
          <ul className="cards cards--daily">{ordered.map((g, i) => <Card key={g.slug} g={g} i={i} />)}</ul>
        </section>
      )}

      {shows('any') && (
        <section aria-labelledby="any-title">
          <h2 id="any-title" className="section-title card-title">Play any time</h2>
          <ul className="cards">{anyTime.map((g, i) => <Card key={g.slug} g={g} i={i} />)}</ul>
        </section>
      )}

      {shows('friends') && friends.length > 0 && (
        <section aria-labelledby="friends-title">
          <h2 id="friends-title" className="section-title card-title">Play with friends</h2>
          <ul className="cards">{friends.map((g, i) => <Card key={g.slug} g={g} i={i} />)}</ul>
        </section>
      )}
      <SiteFooter />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
)
