// Design system build.
//   node design-system/build.ts          -> src/ui/tokens.css (used by the site)
//   node design-system/build.ts --bundle -> also design-system/out/project/* (the published design system)
// tokens.json is the single source of truth for every colour, size and font.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

type Tok = { name: string; value: string | Record<string, string>; usage?: string }
const here = import.meta.dirname
const root = resolve(here, '..')
const t = JSON.parse(readFileSync(resolve(here, 'tokens.json'), 'utf8'))
const themes: string[] = t.color.themes.map((x: { id: string }) => x.id)
const first = themes[0]

// Every game colour must keep `on-fill` text readable: at least 6.5:1 (new colours aim for 9:1).
{
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  const onFill = t.color.tokens.find((x: Tok) => x.name === 'on-fill')
  const ink = lum(typeof onFill.value === 'string' ? onFill.value : onFill.value.light)
  for (const tok of t.color.tokens as Tok[]) {
    if (!tok.usage?.startsWith('Game colour')) continue
    for (const theme of themes) {
      const v = typeof tok.value === 'string' ? tok.value : tok.value[theme]
      const ratio = (lum(v) + 0.05) / (ink + 0.05)
      if (ratio < 6.5) throw new Error(`${tok.name} (${theme}) gives on-fill only ${ratio.toFixed(1)}:1`)
    }
  }
}

const val = (v: string) => (/^\{.+\}$/.test(v) ? `var(--${v.slice(1, -1)})` : v)
const per = (tok: Tok, theme: string) => (typeof tok.value === 'string' ? tok.value : tok.value[theme] ?? tok.value[first])
const themed: Tok[] = [...t.color.tokens, ...(t.shadow?.tokens ?? [])]
const plainFamilies = Object.keys(t).filter((k) => !['name', 'version', 'color', 'type', 'shadow', 'meta'].includes(k))
const plain: Tok[] = plainFamilies.flatMap((k) => t[k].tokens)

const decl = (theme: string, onlyChanged: boolean) =>
  themed
    .filter((x) => !onlyChanged || per(x, theme) !== per(x, first) || /^\{/.test(per(x, theme)))
    .map((x) => `  --${x.name}: ${val(per(x, theme))};`)
    .join('\n')
const fams = Object.entries(t.type.families as Record<string, string>).map(([k, v]) => `  --font-${k}: ${v};`).join('\n')
const statics = `:root {\n${plain.map((x) => `  --${x.name}: ${x.value};`).join('\n')}\n${fams}\n}`
const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
const classes = t.type.groups
  .flatMap((g: { family: string; styles: Record<string, unknown>[] }) =>
    g.styles.map((s) => {
      const props = Object.entries(s)
        .filter(([k]) => !['name', 'sample', 'usage', 'family'].includes(k))
        .map(([k, v]) => `  ${kebab(k)}: ${typeof v === 'number' && k !== 'fontWeight' && k !== 'lineHeight' ? v + 'px' : v};`)
      return `.${s.name} {\n  font-family: var(--font-${(s.family as string) ?? g.family});\n${props.join('\n')}\n}`
    }),
  )
  .join('\n')

// 1. The site's stylesheet: light by default, dark from the OS setting or data-theme.
const dark = themes[1]
const site = `/* ${t.name}: generated from design-system/tokens.json by design-system/build.ts. Do not edit. */
:root {
${decl(first, false)}
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="${first}"]) {
${decl(dark, true).replace(/^/gm, '  ')}
    color-scheme: dark;
  }
}
:root[data-theme="${dark}"] {
${decl(dark, true)}
  color-scheme: dark;
}
${statics}
${classes}
`
writeFileSync(resolve(root, 'src/ui/tokens.css'), site)
console.log('wrote src/ui/tokens.css')

if (!process.argv.includes('--bundle')) process.exit(0)

// 2. The published design system (design-system/out/project/...).
const out = resolve(here, 'out')
const proj = resolve(out, 'project')
rmSync(out, { recursive: true, force: true })
mkdirSync(resolve(proj, 'components'), { recursive: true })

const dsCss = `/* ${t.name} — generated from tokens.json */
:root, [data-theme="${first}"] {
${decl(first, false)}
}
${themes.slice(1).map((th) => `[data-theme="${th}"] {\n${decl(th, true)}\n}`).join('\n')}
${statics}
${classes}
`
writeFileSync(resolve(proj, 'tokens.css'), dsCss)
cpSync(resolve(here, 'tokens.json'), resolve(proj, 'tokens.json'))
cpSync(resolve(here, 'README.md'), resolve(proj, 'README.md'))
for (const f of readdirSync(here)) if (f.endsWith('.md') && f !== 'README.md') cpSync(resolve(here, f), resolve(proj, f))
cpSync(resolve(here, 'components'), resolve(proj, 'components'), { recursive: true })
cpSync(resolve(here, 'index.d.ts'), resolve(proj, 'components/index.d.ts'))

// Bundle the React components as one classic script reading window.React.
execSync('npx vite build --config design-system/vite.bundle.config.ts --logLevel warn', { cwd: root, stdio: 'inherit' })
const built = readFileSync(resolve(out, 'bundle/bundle.js'), 'utf8')
const names = ['Button', 'Pill', 'BrandMark', 'TopBar', 'Stage', 'Score', 'AttemptTiles', 'Countdown', 'ShareButtons', 'ResultTicket', 'PlayNext', 'GameCard', 'ToggleChip', 'Footer', 'ChallengeBanner', 'ChallengeBoard', 'TextField', 'Segmented', 'PlayerChip', 'SplitStage', 'RoomCode', 'Lobby', 'ScoreStrip', 'Burst', 'Histogram', 'SplitBars']
const header = `/* @ds-bundle: ${JSON.stringify({ format: 4, namespace: 'QuickGames', components: names.map((name) => ({ name })) })} */\n`
if (/<\/script|<!--/i.test(built)) throw new Error('bundle contains </script or <!--')
writeFileSync(resolve(proj, 'components/bundle.js'), header + built)
const fonts = `@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Figtree:wght@400;500;700;800&family=JetBrains+Mono:wght@500;700&display=swap");\n`
writeFileSync(resolve(proj, 'components/bundle.css'), fonts + readFileSync(resolve(root, 'src/ui/ui.css'), 'utf8'))
rmSync(resolve(out, 'bundle'), { recursive: true, force: true })
if (!existsSync(resolve(proj, 'components/Cover/preview.html'))) console.warn('no cover yet')
console.log('wrote design-system/out/project')
