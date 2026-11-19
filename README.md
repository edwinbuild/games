# Pocket Fair

Small, original browser games: under 2 minutes, phone first, no sign-up, each ending on a shareable result card.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (daily seed, streaks, storage)
npm run build      # static site in dist/
npm run og         # regenerate link-preview images in public/og/ (needs Playwright)
```

Needs Node 22.18+ (scripts are TypeScript run directly by Node).

## Deploy

The site is live at https://games-sigma-gold.vercel.app (Vercel project `edwinlegends-projects/games`), deployed from this repository: every push to `main` goes to production, every other branch gets a preview URL. Settings live in `vercel.json` (build `npm run build`, output `dist`, Node 22).

Before the public launch, edit `src/site.ts`: the site name (a placeholder for now), the real domain in `url`, and the optional `supportUrl` (Buy me a coffee). Then run `npm run og` again.

## Design system

Every colour, font, size, radius and shadow is set in `design-system/tokens.json`. `npm run tokens` regenerates `src/ui/tokens.css` (CI fails if it is out of date); `npm run ds` also packages the published design system into `design-system/out/`. Components live in `src/ui/`; guidelines and previews in `design-system/components/`. Game code uses components and tokens only: no hex colours or pixel sizes.

## How it's built

- `src/games/registry.ts`: the list of games (title, instructions, how-to-play text, colour, daily or not).
- `scripts/pages.ts` generates one static HTML page per game into `site/` (its own title, description, link preview and a "How to play" section for Google). Vite builds those pages; each game's code loads only on its own page.
- `src/shell/`: the shared game shell every game uses:
  - `GameShell`: top bar, title and the one line of instructions
  - `ResultCard`: the design system's result ticket wired to sharing and tracking: replay, countdown to the next daily puzzle, "Play next", supporter link
  - `daily.ts`: same puzzle for everyone on the same date (seeded random)
  - `stats.ts`: plays, best scores and daily streaks in browser storage (no accounts)
  - `track.ts`: `start` / `finish` / `share` / `play_next` events. They are sent to `VITE_EVENTS_ENDPOINT` when set (e.g. a small Worker + D1 later) and are otherwise only logged in dev.

## Games

| Game | Type |
|---|---|
| Blind Timer | Daily: 3 tries at one target time a day, plus practice |
| Pitch Match | Daily: 3 tones a day, plus practice |
| Luckiest Person | Daily: pick one of five face-down cards, the same five for everyone |
| Reaction Chain | Score: average reaction over 5 rounds (taps under 100 ms count as guesses) |
| Odd One Out | Score: levels cleared in 60 s |
| Memory Path | Score: longest path repeated |

## Adding a game

1. Add an entry to `GAMES` in `src/games/registry.ts`.
2. Create `src/games/<slug>.tsx` with a default-exported component. Use `ResultCard` at the end, `dailyRandom` for daily puzzles, and `recordPlay` / `recordDaily` for stats.
3. Run `npm run og`, then `npm run dev`.

## Browser tests

`npm run build && npm run e2e` serves the build and checks every page at 360, 412, 820 and 1440px (no errors, no sideways scroll), then plays each game to its ticket in light and dark using `tests/e2e/games/<slug>.cjs`. Playwright comes from the machine (`NODE_PATH=$(npm root -g)` if it isn't found). `npm run budget` checks each page's JavaScript. Three game scripts run at once (`E2E_WORKERS=3` by default, `E2E_VERBOSE=1` prints each one's time), so the whole suite takes about 4 minutes; name games to run only those (`npm run e2e -- paint-mix orbit-drop`).
