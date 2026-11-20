# Speed report (2026-11-20, v1.4.0)

Measured on the live site (https://games-sigma-gold.vercel.app) with Lighthouse 12.6 (mobile: a mid-range phone, 4× slower CPU, slow 4G; desktop preset for the desktop rows) and timed flows in Chromium (4× slower CPU, 1.6 Mbps / 150 ms network). Database timings were taken from this test server (in a different part of the world from the database), so treat them as "roughly", not exact.

## 1. Scores by page (mobile Lighthouse)

| Page | Score | First paint | Largest paint | Main thread blocked | Layout shift | Ready to use | Downloaded |
|---|---|---|---|---|---|---|---|
| Home `/` | **78** | 2.3 s | 2.4 s | **662 ms** | 0.017 | 3.5 s | 259 KB |
| Home (desktop) | 99 | 0.7 s | 0.7 s | 1 ms | 0 | 1.0 s | 259 KB |
| Category `/c/logic/` | 94 | 2.2 s | 2.3 s | 150 ms | 0.015 | 2.9 s | 257 KB |
| Word Ladder | **88** | 2.3 s | **3.5 s** | 77 ms | 0.023 | 3.5 s | 267 KB |
| Word Ladder (desktop) | 99 | 0.7 s | 0.8 s | 0 ms | 0.019 | 0.8 s | 267 KB |
| Letter Race (online) | **86** | 2.3 s | **3.8 s** | 85 ms | 0.030 | 3.8 s | 288 KB |
| Higher Lower (online) | **85** | 2.3 s | **3.8 s** | 87 ms | 0.034 | 3.8 s | 290 KB |
| Blind Timer | 94 | 2.3 s | 2.4 s | 109 ms | 0.051 | 2.8 s | 260 KB |
| Chain Pop (canvas) | 94 | 2.3 s | 2.5 s | 98 ms | 0.015 | 2.9 s | 263 KB |
| Orbit Drop (canvas) | 94 | 2.4 s | 2.5 s | 100 ms | 0 | 3.0 s | 262 KB |
| Tilt | 95 | 2.2 s | 2.5 s | 81 ms | 0 | 2.9 s | 265 KB |
| Sum Path | 94 | 2.3 s | 2.5 s | 68 ms | 0 | 2.7 s | 264 KB |
| Archive | 96 | 2.2 s | 2.3 s | 54 ms | 0 | 2.7 s | 242 KB |
| Profile `/me/` | 97 | 2.1 s | 2.1 s | 44 ms | 0 | 2.7 s | 252 KB |
| Admin | 95 | 2.3 s | 2.3 s | 49 ms | 0 | 2.6 s | 248 KB |
| About | 91 | 2.8 s | 2.8 s | 0 ms | 0 | 2.8 s | 243 KB |
| Privacy | 97 | 2.2 s | 2.2 s | 9 ms | 0 | 2.4 s | 243 KB |

Google's "good" lines: largest paint under 2.5 s, blocked main thread under 200 ms, layout shift under 0.1. Desktop is excellent everywhere; phones are good on most pages, with three weak spots: **home's blocked main thread**, and the **largest paint on Word Ladder and the online games**.

## 2. Flows (phone: 4× slower CPU, 1.6 Mbps, 150 ms latency)

| Flow | Time |
|---|---|
| Home, first visit → first game card on screen | 2.2 s |
| Home → tap Blind Timer → Start button ready | 1.6 s |
| Blind Timer: Stop → result ticket | 0.8 s (includes the ticket animation) |
| Ticket → today's board rank shown | 0.8 s (one database call) |
| Ticket → "Play next" → next game ready | 0.5 s |
| Shared link, first visit → Word Ladder ready to type | 1.8 s |
| Same link, second visit (cached) | 0.75 s |
| Archive / Admin (signed out) / Sum Path / Orbit Drop ready | 0.5–0.6 s each (cached core) |
| Profile (guest) ready | 1.2 s |
| Tilt ready (first time) | 1.2 s |
| Letter Race: open page → Create a room → room code shown | **4.4 s** |
| Letter Race word list ready (after the room) | already loaded |

| Database / realtime (from this server) | Time |
|---|---|
| `site_config`, `game_stats`, `daily_board` | ~0.7 s median (0.33 s at best) each |
| `heartbeat` | ~0.32 s |
| Realtime socket connect | 0.22 s |
| Time the database itself spends on these | ~0 ms (tables are tiny: 181 count rows, 9 scores) |

The database lives in **Tokyo (ap-northeast-1)**; almost all of that time is distance and opening a new secure connection, not the queries.

## 3. What's slowing it down, and what to do

Ordered by how much a player would notice. "Where" is the file to change.

| # | Problem (measured) | Fix | Where | Impact | Effort |
|---|---|---|---|---|---|
| 1 | **Pages draw nothing until the JavaScript has run.** The HTML hides everything (`html:not(.ready)`) and React builds the page, so every page waits for fonts CSS + site CSS + the 80 KB core script before anything shows (first paint ≈ 2.2 s on a phone, desktop 0.7 s). On game pages the title and how-to text appear only after the game's own script loads (largest paint 3.5–3.8 s on Word Ladder, Letter Race, Higher Lower). | Pre-render each page's visible shell at build time (top bar, title, instructions, home cards) into the HTML, then let React take over. A smaller step: put the game's title and instructions in the HTML as plain text so they show at once. | `scripts/pages.ts` (generate HTML with React `renderToString`), `src/shell/mount.ts` (hydrate instead of render), the `html:not(.ready)` style in the page head | **Biggest win**: first paint and largest paint about **1–1.5 s sooner on phones**; game pages from ~3.5 s to ~2 s | Large (1–2 days) |
| 2 | **Google Fonts block the first paint** (Lighthouse: ~0.85–1.0 s held up on every page). Three font files, 129 KB, the biggest is Bricolage Grotesque at 77 KB because it's the variable font with the size axis. Fonts come from a second company's servers. | Self-host the fonts: download woff2 files cut to Latin letters and only the weights used (Bricolage 800, Figtree 500/800, JetBrains Mono 700), `@font-face` with `font-display: swap`, and `<link rel="preload">` for the two used above the fold. Drop the `opsz` axis (or use a static 800 file, ~25 KB). | `scripts/pages.ts` (page head), new `public/fonts/`, `src/ui/tokens.css` / `design-system/build.ts` (`@font-face`) | First paint **0.5–0.9 s sooner on phones**, ~80–100 KB less to download, no extra font server | Small–medium (half a day) |
| 3 | **Home blocks the main thread for 662 ms** (score 78). All 39 cards render at once with their animated demos: 1,436 page elements, each demo adds its own `<style>` keyframes, 2.9 s of style and layout work on a slow phone; taps feel late for the first 3 seconds. | Mount a card's demo only while it's on screen (the observer already exists; mount/unmount instead of play/pause), put all demo keyframes in one stylesheet instead of one `<style>` per piece, and add `content-visibility: auto` to cards below the first screen. | `src/entries/home.tsx` (`LazyDemo`, `usePlayOnScreen`), `src/shell/demos.tsx` (the `A` helper), `src/shell/site.css` (`.qg-card`) | Blocked time **660 → under 200 ms**, home score **78 → ~92**, smoother scrolling on cheap phones | Medium (half a day) |
| 4 | **One 107 KB stylesheet (20 KB compressed) for the whole site blocks the first paint**; 74% of it is unused on home (it holds every game's styles). | Move each game's CSS into its own file imported by the game (Vite splits it automatically), keep only shared styles in `site.css`; or inline the small critical part in the head. | `src/shell/site.css` → `src/games/<game>.css` imported from each `src/games/<game>.tsx` | First paint **0.2–0.4 s sooner**, ~15 KB less on each page | Medium (mechanical, half a day) |
| 5 | **Game scripts load one after another** (a waterfall): the page script runs, then asks for the game (+ result card, board, hint, comments), 300–350 ms later on a phone. | Add `<link rel="modulepreload">` for each game's own chunks into that game's HTML after the build (read Vite's manifest, like `scripts/sw.cjs` already does). | `vite.config.ts` (`build.manifest: true`), a new `scripts/preload.cjs` run after `vite build` in `package.json` | Game pages ready **~0.3 s sooner** on phones | Small (2–3 hours) |
| 6 | **Database calls take 0.3–0.8 s**, almost all distance (Tokyo) and new secure connections; the first board rank after a result waits ~0.8 s. Home makes two calls (`site_config` and `game_stats`). | (a) Add `<link rel="preconnect" href="https://ebfhnhynifyyzurzezkl.supabase.co" crossorigin>` to every page head, so the connection is open before the first call. (b) Merge `site_config` and `game_stats` into one call on home. (c) If most players are far from Japan (e.g. Europe or the US), a database closer to them would cut every call by 100–200 ms (needs a new Supabase project and moving the data). | (a) `scripts/pages.ts`; (b) a new database function + `src/shell/config.ts`, `src/shell/gameStats.ts`; (c) Supabase dashboard | (a) first call **0.15–0.3 s sooner**; (b) one round trip less on home; (c) every call 0.1–0.2 s faster | (a) tiny; (b) small; (c) large |
| 7 | **Creating an online room takes ~4.4 s on a phone**: the page loads, then the realtime library (18 KB compressed) loads only after the tap, then the socket connects and waits for the room to settle before the code shows. | Start loading the online code while the "Create a room" screen is showing, open the socket then too, and show the room code straight away (it's made on the phone) with "Joining…" until the room is ready. | `src/shell/online.tsx` (`RoomLanding`), `src/shell/room.ts`, each online game's lobby | Room code on screen **~2 s sooner** | Small–medium |
| 8 | **The site's core script is 80 KB compressed and 35–45 KB of it isn't used on a given page** (sign-in, account sync, admin-only helpers sit in it). About and Privacy load all of it just for the footer. | Move the sign-in sheet, account sync and other rarely used code out of the core list (loaded when needed); give the plain text pages a lighter script. | `vite.config.ts` (the `CORE` list), `src/shell/AccountKey.tsx`, `src/shell/auth.ts`, `src/entries/static.tsx` | 20–30 KB less on every page, ~100 ms less main-thread work on phones | Medium |
| 9 | The comments section and icons are fetched as soon as a game page opens (2 extra requests, ~5 KB), though they sit at the bottom. | Load them only when the reader scrolls near them. | `src/shell/GameShell.tsx` | Small: fewer early requests competing with the game | Tiny |
| 10 | The online games import the whole UI index, which drags in home-page code. | Import from `ui/components` and `ui/multiplayer` directly. | `src/games/letter-race.tsx`, `higher-lower.tsx`, `quick-draw.tsx`, `spot-race.tsx` | 2–3 KB less | Tiny |
| 11 | Letter Race's word list (43 KB compressed) is re-checked with the server on every visit (`max-age=0`). | Serve `/words/*` with a one-day cache (or put a version in its name and cache it for a year). | `vercel.json` (headers) | Repeat Letter Race visits skip a round trip | Tiny |
| 12 | Blind Timer's layout shift is 0.051 (fine, but the highest). | Reserve the height of whatever pops in under the game (likely the numbers line or the comments heading). | `src/shell/GameShell.tsx` / `site.css` | Steadier page | Tiny |

Already good, no change needed: page HTML comes from Vercel's edge cache (30 ms server time), scripts and styles are cached for a year, the offline service worker makes second visits fast (0.75 s), there are no images on pages, the canvas games and new games are light, desktop scores 99.

## Suggested order

1. **Quick wins (an afternoon):** #6a preconnect, #5 modulepreload, #9, #10, #11. About 0.3–0.5 s off game pages on phones.
2. **Fonts (#2) and home demos (#3):** the two things phone users notice most. Home goes from 78 to ~92.
3. **CSS split (#4) and core trim (#8).**
4. **Pre-rendering (#1):** the biggest single gain, and the most work.
