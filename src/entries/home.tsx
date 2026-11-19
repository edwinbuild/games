import { StrictMode, useEffect, useState, type CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'
import { TAGLINES } from '../games/taglines'
import { LISTED as GAMES, playersLabel, SKILLS, type GameMeta, type Skill } from '../games/registry'
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
        tagline={TAGLINES[g.slug]}
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

type When = 'all' | 'daily' | 'any'
type Kind = 'all' | Skill
type Filter = { when: When; kind: Kind }
const WHENS: When[] = ['all', 'daily', 'any']

/** The filter remembered in this browser (older versions stored one word). A category page forces its kind. */
function initialFilter(): Filter {
  const forced = document.body.dataset.kind as Skill | undefined
  const raw = load<unknown>('home-filter', null)
  let f: Filter = { when: 'all', kind: 'all' }
  if (raw && typeof raw === 'object') {
    const r = raw as Partial<Filter>
    f = { when: WHENS.includes(r.when as When) ? (r.when as When) : 'all', kind: SKILLS.some((k) => k.id === r.kind) ? (r.kind as Kind) : 'all' }
  } else if (raw === 'daily' || raw === 'any') f = { when: raw, kind: 'all' }
  else if (raw === 'friends') f = { when: 'all', kind: 'friends' }
  return forced ? { when: 'all', kind: forced } : f
}

const solo = (g: GameMeta) => !g.players || g.players === 1
const fitsWhen = (g: GameMeta, w: When) => w === 'all' || (w === 'daily' ? g.daily : !g.daily)
const fitsKind = (g: GameMeta, k: Kind) => k === 'all' || g.skill === k

function Home() {
  usePlayOnScreen()
  const forcedKind = document.body.dataset.kind as Skill | undefined
  const [filter, setFilterState] = useState<Filter>(initialFilter)
  const setFilter = (f: Filter) => { setFilterState(f); save('home-filter', f) }
  const daily = GAMES.filter((g) => g.daily && solo(g))
  const played = daily.filter((g) => todaysDaily(g.slug) !== undefined)
  const left = daily.length - played.length
  const recent = useRecentPlays()
  const total = recent ? Object.values(recent).reduce((a, b) => a + b, 0) : 0
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const isPlayed = (g: GameMeta) => g.daily && todaysDaily(g.slug) !== undefined
  // Unplayed games first (daily before any time), played ones after, otherwise in the usual order.
  const order = (gs: GameMeta[]) => [...gs.filter((g) => !isPlayed(g)), ...gs.filter(isPlayed)]

  const kinds = SKILLS.filter((k) => GAMES.some((g) => g.skill === k.id))
  const whenOptions = [
    { value: 'all' as When, label: 'All', count: GAMES.filter((g) => fitsKind(g, filter.kind)).length },
    { value: 'daily' as When, label: 'Daily', count: GAMES.filter((g) => g.daily && fitsKind(g, filter.kind)).length },
    { value: 'any' as When, label: 'Any time', count: GAMES.filter((g) => !g.daily && fitsKind(g, filter.kind)).length },
  ]
  const kindOptions = [
    { value: 'all' as Kind, label: 'Every kind', count: GAMES.filter((g) => fitsWhen(g, filter.when)).length },
    ...kinds.map((k) => ({ value: k.id as Kind, label: k.label, count: GAMES.filter((g) => g.skill === k.id && fitsWhen(g, filter.when)).length })),
  ]
  const shown = (gs: GameMeta[]) => gs.filter((g) => fitsWhen(g, filter.when) && fitsKind(g, filter.kind))
  const sections: { id: string; title: string; games: GameMeta[]; daily?: boolean }[] =
    filter.kind === 'all'
      ? [
          { id: 'daily', title: 'Today’s puzzles', games: order(shown(daily)), daily: true },
          { id: 'any', title: 'Play any time', games: shown(GAMES.filter((g) => !g.daily && solo(g))) },
          { id: 'friends', title: 'Play with friends', games: shown(GAMES.filter((g) => !solo(g))) },
        ]
      : [{ id: filter.kind, title: SKILLS.find((k) => k.id === filter.kind)!.label, games: order(shown(GAMES)), daily: filter.when === 'daily' }]
  const streaks = GAMES.map((g) => ({ g, s: getStats(g.slug).streak })).filter((x) => x.g.daily && x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3)
  const ring = <ProgressRing color="ticket" value={played.length} max={daily.length} label={`${played.length} of ${daily.length} daily games played today`} />
  const leftText = left === 0
    ? `You've played all ${daily.length} daily games today.`
    : played.length === 0
      ? `${daily.length} daily games are waiting.`
      : `${left} of ${daily.length} daily games left today.`
  const forced = forcedKind && SKILLS.find((k) => k.id === forcedKind)

  return (
    <div className="page page--home home">
      <TopBar siteName={SITE.name} />
      <div className="home-layout">
        {/* Wide screens: a sticky rail with today's progress, the filters as lists, and your streaks. */}
        <aside className="home-rail" aria-label="Browse games">
          <div className="rail-today">
            {ring}
            <div>
              <p className="body-strong" style={{ margin: 0 }}>{today}</p>
              <p className="small muted" style={{ margin: 0 }}>{leftText}</p>
            </div>
          </div>
          <Countdown label="New daily games in" />
          <p className="eyebrow muted rail-title">When</p>
          <FilterChips layout="column" label="When you can play" value={filter.when} onChange={(when) => setFilter({ ...filter, when })} options={whenOptions} />
          <p className="eyebrow muted rail-title">Kind of game</p>
          <FilterChips layout="column" label="Kind of game" value={filter.kind} onChange={(kind) => setFilter({ ...filter, kind })} options={kindOptions} />
          {streaks.length > 0 && (
            <>
              <p className="eyebrow muted rail-title">Your streaks</p>
              <ul className="rail-streaks">
                {streaks.map(({ g, s }) => <li key={g.slug}><a href={`/${g.slug}/`}>{g.title}</a><span>{s} {s === 1 ? 'day' : 'days'}</span></li>)}
              </ul>
            </>
          )}
        </aside>

        <div className="home-main">
          <header className="today">
            {forced ? (
              <div className="stack" style={{ gap: 'var(--space-2)' }}>
                <h1 className="site-title">{forced.label} games</h1>
                <p className="body muted" style={{ margin: 0 }}>{forced.blurb} <a href="/">See every game</a>.</p>
              </div>
            ) : (
              <h1 className="site-title">{SITE.name}</h1>
            )}
            <div className="today-line">
              {ring}
              <div className="today-text">
                <p className="body-strong">{today}</p>
                <p className="body muted">{leftText}</p>
                <Countdown label="New daily games in" />
                {total >= SHOW_FROM && <p className="small muted live-count">{formatCount(total)} games finished here in the last 24 hours</p>}
              </div>
            </div>
          </header>

          <div className="home-chips">
            <FilterChips label="When you can play" value={filter.when} onChange={(when) => setFilter({ ...filter, when })} options={whenOptions} />
            <FilterChips label="Kind of game" value={filter.kind} onChange={(kind) => setFilter({ ...filter, kind })} options={kindOptions} />
          </div>

          {sections.filter((sec) => sec.games.length).map((sec) => (
            <section key={sec.id} aria-labelledby={`${sec.id}-title`}>
              <h2 id={`${sec.id}-title`} className="section-title card-title">{sec.title}</h2>
              <ul className={sec.daily ? 'cards cards--daily' : 'cards'}>{sec.games.map((g, i) => <Card key={g.slug} g={g} i={i} />)}</ul>
            </section>
          ))}
          {sections.every((sec) => !sec.games.length) && <p className="body muted home-empty">No games match both filters yet. <button type="button" className="linkish" onClick={() => setFilter({ when: 'all', kind: 'all' })}>Show every game</button></p>}
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
)
