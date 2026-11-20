// The archive (/archive/): any past daily puzzle since launch, played as a one-off (not ranked,
// not counted for streaks), through the same links challenges use.
import { StrictMode, useState } from 'react'
import { LISTED } from '../games/registry'
import { SITE } from '../site'
import { AccountKey } from '../shell/AccountKey'
import { challengeUrl } from '../shell/challenge'
import { siteConfig } from '../shell/config'
import { dateKey, parseDateKey } from '../shell/daily'
import { mount, ready } from '../shell/mount'
import { SiteFooter } from '../shell/SiteFooter'
import { SiteNotice } from '../shell/SiteNotice'
import { TopBar } from '../ui/components'
import '../shell/styles'
import '../shell/errors'

/** The first day puzzles were counted (the site went live). */
export const FIRST_DAY = '2026-11-18'

function Archive() {
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return dateKey(d) })()
  const [day, setDay] = useState(yesterday)
  const games = LISTED.filter((g) => g.daily && !siteConfig().disabled.includes(g.slug))
  const ok = day >= FIRST_DAY && day <= yesterday && !!parseDateKey(day)
  const label = ok ? parseDateKey(day)!.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) : ''
  return (
    <div className="page">
      <TopBar siteName={SITE.name} right={<AccountKey />} />
      <SiteNotice />
      <main className="stack archive">
        <h1 className="game-title" style={{ margin: 0 }}>Archive</h1>
        <p className="body" style={{ margin: 0 }}>Missed a day? Play any daily puzzle since {parseDateKey(FIRST_DAY)!.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}. Archive puzzles are just for fun: they don’t go on boards or count for streaks.</p>
        <div className="qg-field" style={{ maxWidth: 260 }}>
          <label htmlFor="archive-day">Day</label>
          <input id="archive-day" type="date" min={FIRST_DAY} max={yesterday} value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
        {ok ? (
          <>
            <h2 className="card-title" style={{ margin: 0 }}>{label}</h2>
            <ul className="me-games">
              {games.map((g) => (
                <li key={g.slug}>
                  <a className="me-game" href={challengeUrl(location.origin, { g: g.slug, s: day, r: [] })}>
                    <span className="me-game-dot" style={{ background: `var(--${g.color})` }} aria-hidden="true">{g.emoji}</span>
                    <span className="me-game-name">{g.title}</span>
                    <span className="small muted">Play {label.split(',')[0]}’s puzzle</span>
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : <p className="body muted" style={{ margin: 0 }}>Pick a day between launch and yesterday.</p>}
      </main>
    </div>
  )
}

mount(document.getElementById('root'), <StrictMode><Archive /></StrictMode>)
mount(document.getElementById('footer'), <StrictMode><div className="page"><SiteFooter /></div></StrictMode>)
ready()
