// Generates one static HTML page per game (plus the home page) into site/.
// Each page carries its own title, description, link-preview tags and a
// static "How to play" section, so it can be found on Google and shared.
// Run with Node 22.18+ (TypeScript types are stripped natively).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { GAMES, SKILLS, type GameMeta } from '../src/games/registry.ts'
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
  const image = BASE_URL + opts.image
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(opts.title)}</title>
    <meta name="description" content="${esc(opts.description)}" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
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
    title: `${g.title}: ${g.tagline.split('.')[0]} | ${SITE.name}`,
    description: g.tagline,
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
  const list = GAMES.map(
    (g) => `        <li><a href="/${g.slug}/">${esc(g.title)}</a>: ${esc(g.tagline)}</li>`,
  ).join('\n')
  return page({
    title: `${SITE.name}: ${SITE.tagline}`,
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
  const games = GAMES.filter((g) => g.skill === k.id)
  const list = games.map((g) => `        <li><a href="/${g.slug}/">${esc(g.title)}</a>: ${esc(g.tagline)}</li>`).join('\n')
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
const CATEGORIES = SKILLS.filter((k) => GAMES.some((g) => g.skill === k.id))

const footer = `    <div id="footer"><footer class="qg-footer"><a href="/">All games</a> · <a href="/about/">About</a> · Made with ♥ by <a href="https://edwinsm.me">edwinsm.me</a></footer></div>`

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
      <p>There are no accounts and no cookies. Your scores, best results and streaks are saved only in this browser on this device; clearing your browser data removes them. The site's host keeps standard server logs, as every website host does.</p>
      <h2>Sound</h2>
      <p>Sound is off until you turn it on with the switch at the top of each game, and the setting is remembered. Pitch Match always plays its tones, because listening is the game.</p>`,
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
const urls = ['/', ...CATEGORIES.map((k) => `/c/${k.id}/`), ...GAMES.map((g) => `/${g.slug}/`), '/about/']
writeFileSync(
  resolve(root, 'public/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${BASE_URL}${u}</loc></url>`).join('\n')}\n</urlset>\n`,
)
writeFileSync(resolve(root, 'public/robots.txt'), `User-agent: *\nAllow: /\nDisallow: /stats/\nSitemap: ${BASE_URL}/sitemap.xml\n`)
console.log(`Generated ${GAMES.length + CATEGORIES.length + 3} pages in site/`)
