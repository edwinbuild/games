// Generates one static HTML page per game (plus the home page) into site/.
// Each page carries its own title, description, link-preview tags and a
// static "How to play" section, so it can be found on Google and shared.
// Run with Node 22.18+ (TypeScript types are stripped natively).
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { GAMES, LISTED, SKILLS, type GameMeta } from '../src/games/registry.ts'
import { TAGLINES } from '../src/games/taglines.ts'
import { HOW_TO } from '../src/games/howto.ts'
import { SITE } from '../src/site.ts'

const root = resolve(import.meta.dirname, '..')
// The site's public address: SITE_URL if set, else Vercel's production domain (set during
// Vercel builds), else the placeholder in src/site.ts.
const BASE_URL =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : SITE.url)
const site = resolve(root, 'site')

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function page(opts: {
  title: string
  description: string
  path: string
  image: string
  entry: string
  bodyAttrs?: string
  body: string
}) {
  const url = BASE_URL + opts.path
  // A content hash on the image link, so chat apps that cache previews by URL pick up a new image.
  const file = resolve(root, 'public' + opts.image)
  const image = BASE_URL + opts.image + (existsSync(file) ? `?v=${createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8)}` : '')
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(opts.title)}</title>
    <meta name="description" content="${esc(opts.description)}" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <!-- Page-to-page transitions must be opted into before the page renders, so this can't wait for the stylesheet. -->
    <style>@view-transition{navigation:auto}@media (prefers-reduced-motion:reduce){@view-transition{navigation:none}}</style>
    <!-- The HTML's own text waits for the app (src/shell/mount.ts), so the app can't push it down. -->
    <style>html:not(.ready) body > :not(#root):not(script){display:none}</style>
    <noscript><style>body > *{display:block!important}</style></noscript>
    <script>try{var t=JSON.parse(localStorage.getItem('qg:theme'));if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>
    <meta name="theme-color" content="#f4f4f2" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0b0b0b" media="(prefers-color-scheme: dark)" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Figtree:wght@400;500;700;800&family=JetBrains+Mono:wght@500;700&display=swap" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${esc(SITE.name)}" />
    <meta property="og:title" content="${esc(opts.title)}" />
    <meta property="og:description" content="${esc(opts.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body${opts.bodyAttrs ? ' ' + opts.bodyAttrs : ''}>
${opts.body}
    <script type="module" src="${opts.entry}"></script>
  </body>
</html>
`
}

function gamePage(g: GameMeta) {
  const howTo = (HOW_TO[g.slug] ?? []).map((p) => `        <p>${esc(p)}</p>`).join('\n')
  return page({
    title: `${g.title}: ${TAGLINES[g.slug].split('.')[0]} | ${SITE.name}`,
    description: TAGLINES[g.slug],
    path: `/${g.slug}/`,
    image: `/og/${g.slug}.png`,
    entry: '../../src/entries/game.tsx',
    bodyAttrs: `data-game="${g.slug}" style="--game: var(--${g.color})"`,
    body: `    <div id="root"></div>
    <section class="howto">
      <h2>How to play ${esc(g.title)}</h2>
${howTo}
      <p><a href="/">More quick games</a></p>
    </section>`,
  })
}

function homePage() {
  const list = LISTED.map(
    (g) => `        <li><a href="/${g.slug}/">${esc(g.title)}</a>: ${esc(TAGLINES[g.slug])}</li>`,
  ).join('\n')
  return page({
    title: `${SITE.name}: ${LISTED.length} quick games, free, no sign-up`,
    description: SITE.tagline,
    path: '/',
    image: '/og/home.png',
    entry: '../src/entries/home.tsx',
    body: `    <div id="root"></div>
    <section class="howto">
      <h2>All games</h2>
      <ul>
${list}
      </ul>
    </section>`,
  })
}

// The footer is rendered by React (src/entries/static.tsx) into #footer, like on every other page;
// the plain links are there for the first paint and for no-JavaScript readers.
/** A category page: the home page filtered to one kind of game, with its own title and list. */
function categoryPage(k: (typeof SKILLS)[number]) {
  const games = LISTED.filter((g) => g.skill === k.id)
  const list = games.map((g) => `        <li><a href="/${g.slug}/">${esc(g.title)}</a>: ${esc(TAGLINES[g.slug])}</li>`).join('\n')
  return page({
    title: `${k.label} games | ${SITE.name}`,
    description: `${k.blurb} ${games.length} quick browser games.`,
    path: `/c/${k.id}/`,
    image: '/og/home.png',
    entry: '../../../src/entries/home.tsx',
    bodyAttrs: `data-kind="${k.id}"`,
    body: `    <div id="root"></div>
    <section class="howto">
      <h2>${esc(k.label)} games</h2>
      <ul>
${list}
      </ul>
    </section>`,
  })
}
const CATEGORIES = SKILLS.filter((k) => LISTED.some((g) => g.skill === k.id))

const footer = `    <div id="footer"><footer class="qg-footer"><a href="/">All games</a> · <a href="/about/">About</a> · <a href="/privacy/">Privacy</a> · Made with ♥ by <a href="https://edwinsm.me">edwinsm.me</a></footer></div>`

function staticPage(opts: { title: string; description: string; path: string; entry: string; body: string }) {
  return page({
    title: `${opts.title} | ${SITE.name}`,
    description: opts.description,
    path: opts.path,
    image: '/og/home.png',
    entry: opts.entry,
    body: `    <div id="root"></div>
    <main class="howto prose">
${opts.body}
    </main>
${footer}`,
  })
}

const aboutPage = () =>
  staticPage({
    title: 'About',
    description: `What ${SITE.name} is and what it keeps about you.`,
    path: '/about/',
    entry: '../../src/entries/static.tsx',
    body: `      <h1 class="game-title">About ${esc(SITE.name)}</h1>
      <p>${esc(SITE.name)} is a small collection of original browser games. Each one takes a minute or two, works on a phone, and ends with a result you can share.</p>
      <h2>Daily games</h2>
      <p>Daily games give everyone the same puzzle on the same date. A new one starts at midnight in your own time zone.</p>
      <h2>What we keep</h2>
      <p>There are no accounts and no cookies. Your scores, best results and streaks are saved in this browser on this device; clearing your browser data removes them.</p>
      <h2>Today's boards</h2>
      <p>When you finish a daily game, your best result for the day goes to that day's board, so you can see your rank. It's stored with a random key made by your browser (only a scrambled form of it is kept, so it can't be traced back to you) and the name you chose for challenges, if any; names with rude words are left off. Nothing else about you is sent. Boards are per day; results come from players' browsers, so treat the very top with a pinch of salt.</p>
      <p>The site also counts how many games are started and finished, and keeps the answers to the crowd games (never who gave them). Everything kept, and how to download or delete it, is on the <a href="/privacy/">privacy page</a>.</p>
      <h2>Sound</h2>
      <p>Sound is off until you turn it on with the switch at the top of each game, and the setting is remembered. Pitch Match always plays its tones, because listening is the game.</p>`,
  })

const privacyPage = () =>
  staticPage({
    title: 'Privacy',
    description: `What ${SITE.name} keeps on your device and in its database, and how to download or delete it.`,
    path: '/privacy/',
    entry: '../../src/entries/static.tsx',
    body: `      <h1 class="game-title">Privacy</h1>
      <p>${esc(SITE.name)} has no accounts, no ads, no cookies and no trackers. Here is everything it keeps.</p>
      <h2>On this device</h2>
      <p>Your scores, best results, streaks, today's tries, settings (sound, theme, filters, computer level) and the name you typed for challenges are saved in this browser's storage. A game in progress is kept until you close the tab, so a refresh doesn't lose it. Two random codes are made by your browser: one marks your challenge results, one your board results and crowd answers. None of this leaves your device except as described below.</p>
      <h2>In our database</h2>
      <ul>
        <li><strong>Daily boards:</strong> your best result for each daily game and day, the name you chose (if any), and a scrambled form of your board code. Others see the name and the result on that day's board.</li>
        <li><strong>Crowd games:</strong> how many people gave each answer, never who gave it. To count one answer per device, a scrambled form of your board code is kept with the question for two days.</li>
        <li><strong>Counts:</strong> how many games are started, finished and shared each hour, per game.</li>
        <li><strong>Errors:</strong> when a page breaks, the page's name and the first line of the error message, counted per hour.</li>
      </ul>
      <p>Online rooms pass your name and moves to the other players while you play; nothing from a room is stored. The site's hosts (Vercel for the pages, Supabase for the database) keep standard server logs, as every host does.</p>
      <h2>Download or delete</h2>
      <p>Download everything this browser keeps for ${esc(SITE.name)}, or delete it all: that also removes your board results from the database. Results already deleted can't be brought back.</p>
      <div id="privacy-tools"></div>
      <p>Clearing this site's data in your browser settings removes what's on the device too, but leaves your board results in the database, where nothing links them to you any more. Use the button above to remove them too.</p>`,
  })

const statsPage = () =>
  page({
    title: `Stats | ${SITE.name}`,
    description: 'Private stats.',
    path: '/stats/',
    image: '/og/home.png',
    entry: '../../src/entries/stats.tsx',
    body: `    <div id="root"></div>`,
  }).replace('<meta name="description"', '<meta name="robots" content="noindex, nofollow" />\n    <meta name="description"')

// The profile page: personal, so search engines are kept out.
const mePage = () =>
  page({
    title: `Your profile | ${SITE.name}`,
    description: 'Your username, icon, streaks and friends.',
    path: '/me/',
    image: '/og/home.png',
    entry: '../../src/entries/me.tsx',
    body: `    <div id="root"></div>\n    <div id="footer"></div>`,
  }).replace('<meta name="description"', '<meta name="robots" content="noindex, nofollow" />\n    <meta name="description"')

const notFoundPage = () =>
  staticPage({
    title: 'Page not found',
    description: 'This page does not exist.',
    path: '/404',
    entry: '../src/entries/static.tsx',
    body: `      <h1 class="game-title">That page doesn't exist</h1>
      <p>The link may be old or mistyped. <a href="/">See all the games</a>.</p>`,
  })

rmSync(site, { recursive: true, force: true })
mkdirSync(site, { recursive: true })
writeFileSync(resolve(site, 'index.html'), homePage())
writeFileSync(resolve(site, '404.html'), notFoundPage())
mkdirSync(resolve(site, 'about'), { recursive: true })
writeFileSync(resolve(site, 'about', 'index.html'), aboutPage())
mkdirSync(resolve(site, 'privacy'), { recursive: true })
writeFileSync(resolve(site, 'privacy', 'index.html'), privacyPage())
mkdirSync(resolve(site, 'me'), { recursive: true })
writeFileSync(resolve(site, 'me', 'index.html'), mePage())
mkdirSync(resolve(site, 'stats'), { recursive: true })
writeFileSync(resolve(site, 'stats', 'index.html'), statsPage())
for (const k of CATEGORIES) {
  mkdirSync(resolve(site, 'c', k.id), { recursive: true })
  writeFileSync(resolve(site, 'c', k.id, 'index.html'), categoryPage(k))
}
for (const g of GAMES) {
  mkdirSync(resolve(site, g.slug), { recursive: true })
  writeFileSync(resolve(site, g.slug, 'index.html'), gamePage(g))
}
// Sitemap and robots.txt for search engines.
const urls = ['/', ...CATEGORIES.map((k) => `/c/${k.id}/`), ...LISTED.map((g) => `/${g.slug}/`), '/about/', '/privacy/']
writeFileSync(
  resolve(root, 'public/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${BASE_URL}${u}</loc></url>`).join('\n')}\n</urlset>\n`,
)
writeFileSync(resolve(root, 'public/robots.txt'), `User-agent: *\nAllow: /\nDisallow: /stats/\nDisallow: /me/\nSitemap: ${BASE_URL}/sitemap.xml\n`)
console.log(`Generated ${GAMES.length + CATEGORIES.length + 5} pages in site/`)
