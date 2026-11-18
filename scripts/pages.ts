// Generates one static HTML page per game (plus the home page) into site/.
// Each page carries its own title, description, link-preview tags and a
// static "How to play" section, so it can be found on Google and shared.
// Run with Node 22.18+ (TypeScript types are stripped natively).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { GAMES, type GameMeta } from '../src/games/registry.ts'
import { SITE } from '../src/site.ts'

const root = resolve(import.meta.dirname, '..')
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
  const url = SITE.url + opts.path
  const image = SITE.url + opts.image
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(opts.title)}</title>
    <meta name="description" content="${esc(opts.description)}" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta name="theme-color" content="#eceef5" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#121428" media="(prefers-color-scheme: dark)" />
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
  const howTo = g.howTo.map((p) => `        <p>${esc(p)}</p>`).join('\n')
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

rmSync(site, { recursive: true, force: true })
mkdirSync(site, { recursive: true })
writeFileSync(resolve(site, 'index.html'), homePage())
for (const g of GAMES) {
  mkdirSync(resolve(site, g.slug), { recursive: true })
  writeFileSync(resolve(site, g.slug, 'index.html'), gamePage(g))
}
// Sitemap and robots.txt for search engines.
const urls = ['/', ...GAMES.map((g) => `/${g.slug}/`)]
writeFileSync(
  resolve(root, 'public/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE.url}${u}</loc></url>`).join('\n')}\n</urlset>\n`,
)
writeFileSync(resolve(root, 'public/robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`)
console.log(`Generated ${GAMES.length + 1} pages in site/`)
