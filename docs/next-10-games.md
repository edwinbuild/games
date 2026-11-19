# Pocket Fair: the next 10 games (overnight build plan)

This file is the single source for an unattended run that builds ten games one by one, pushing each to `main` (which deploys to Vercel) before starting the next. Everything needed is here or in the repo; read `README.md`, `design-system/README.md` and `supabase/README.md` first.

## Network

The sandbox can reach the live site (`games-sigma-gold.vercel.app`) and Supabase (`*.supabase.co`). Local runs (`localhost`) never count plays, so tests don't touch the real stats.

## Ground rules (read before every game)

- **Original games only.** Genres that do well on daily-game sites (estimation, crowd votes, colour, logic, quick duels) are fine. Never copy a specific existing game's rules, name, look or puzzles. If a design below turns out to match a well-known game closely, change the twist and note it in the log.
- **Worldwide audience.** No country-specific trivia, slang or references. Plain international English.
- **Design system only.** Use `src/ui` components and tokens; no hex colours, pixel font sizes or new one-off styles in game files. A new reusable part goes into `src/ui` *and* `design-system/` (component, README, preview, `index.d.ts`, bundle header list in `design-system/build.ts`) in the same commit. Each game may style the inside of its stage (see "Game stages" in the brand book).
- **No made-up data.** No fake player counts, percentages or "people like you" claims. Crowd numbers come only from Supabase.
- **Every game** has: an entry in `src/games/registry.ts` (slug, title, instructions, tagline, howTo, daily, color, sample, and the new `players` field), `src/games/<slug>.tsx` with a default export, a `ResultCard` with a `challenge` prop (seed + score) for solo and same-phone games, keyboard play where it makes sense (`data-primary`, `hint`), sound and vibration through `src/shell/feel.ts`, reduced-motion support, and phone, tablet and desktop layouts that pass the e2e checks.
- **Privacy.** No accounts, no personal data. Nicknames are optional and stay in the browser except where an online room needs to show them to other players in that room.

## Step 0: shared groundwork (do this first, one commit each)

1. **E2E tests in the repo.** Move the Playwright smoke checks into `tests/e2e/` (run with `npm run e2e` against `vite preview`): every game page loads with no console errors, no horizontal overflow at 360, 412, 820 and 1440px, and each game can be played to its ticket by a scripted player. Add a per-game script in `tests/e2e/games/<slug>.ts` as each game is built. Do not add it to GitHub Actions if browser install is slow; run it locally before each push.
2. **Per-page JavaScript budget.** CI currently sums all JS (about 79 KB gzipped) against 90 KB; ten more games will exceed that even though each page loads only its own game. Change the check to: shared chunks plus the largest single game chunk must stay under 90 KB gzipped; any one game chunk under 25 KB (online games may use 45 KB because of the realtime client).
3. **Registry `players` field:** `1`, `'same-phone-2'`, `'same-phone-3'`, `'online-2'`, `'online-2-8'`. Home page gets a third section, "Play with friends", for every game whose `players` is not `1`; cards show a small `Pill` ("2 players", "Online").
4. **New colour tokens** (all checked: text in `on-fill` reaches 9:1 or better): `lime #a8e05f`, `coral #ff9a76`, `aqua #6ee7f9`, `sand #e8c79a`, `periwinkle #9fb1ff`, `peach #ffb36b`, `orchid #e39bf0`, `pistachio #c4e3a0`. Same value in light and dark. Add to `design-system/tokens.json` with usage notes naming their game, run `npm run tokens`.
5. **Multiplayer kit in `src/ui` and the design system:**
   - `PlayerChip` (P1–P4: colour plus a shape marker circle, square, triangle, diamond, so colour is never the only signal), using four of the game colours.
   - `SplitStage` for same-phone games: two halves, the top one rotated 180° so each player faces their own half; each half is a pressable area with its own `PlayerChip`.
   - `RoomCode` (large mono code plus Copy and Share keys), `Lobby` (list of `PlayerChip` + name + ready state, a Start key for the host), `ScoreStrip` (players' scores in a row during play).
6. **Realtime helper** `src/shell/room.ts` (only imported by online games, so other pages stay small): uses `@supabase/supabase-js` Realtime **broadcast + presence** on a channel named `room:<code>`. No database tables. Room codes: 5 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`. Presence carries `{ id, name, ready }`; the host is the earliest joined player. Handle: join, leave, host leaving (next player becomes host), reconnect within 30 s keeps your seat, a room that already started rejects late joiners with a clear message. Supabase Realtime public channels work with the publishable key; confirm in the Supabase dashboard (Realtime settings) that public channels are allowed, and if not, enable them with the connector or note it as a blocker.

## The ten games, in build order

Each entry: what the player does, exact rules, scoring, what is shared, and done-when checks.

### 1. Tap Duel
- **Slug** `tap-duel` · **colour** `coral` · **players** `same-phone-2` · **daily** no · **backend** none.
- **Play:** the phone lies flat between two players; `SplitStage` gives each a half. Both halves show "Wait…" in `chili`. After a random 1.5–4 s (seeded), both turn `mint` at the same moment. The first player to tap their half wins the round. Tapping during "Wait…" loses the round for that player. Best of five; first to three.
- **Fairness details:** ignore taps in the first 80 ms after go (both players' accidental double-taps); if both tap within the same 10 ms, call it a tie and replay the round.
- **Ticket:** "Blue wins 3–1" (player colour names), round-by-round tiles, fastest reaction of the match. Share: `🤝 Tap Duel\nBlue 3–1 Orange\nFastest tap 212 ms`. Replay key: "Rematch".
- **Done when:** two simulated players can play a full match in e2e (dispatch pointerdown on each half); early-tap and tie rules unit-tested; works in landscape and on desktop (keys A and L for the two players, hinted only on keyboard devices).

### 2. This or That
- **Slug** `this-or-that` · **colour** `aqua` · **players** 1 · **daily** yes · **backend** Supabase.
- **Play:** one two-way question a day, the same for everyone ("Window seat or aisle?"). First pick your answer. Then, before seeing results, guess what share of today's players picked A (slider 0–100%). Then the reveal: the live split, your guess, and how far off you were.
- **Score:** 100 minus the distance between your guess and the actual split at the moment of reveal (rounded). The split is computed from votes up to that moment.
- **Content:** a list of at least 120 questions in `src/games/this-or-that/questions.ts`, all worldwide and harmless (food, habits, travel, everyday dilemmas; no politics, religion or brands), picked by date from a seeded shuffle so a question never repeats within 120 days.
- **Backend (new migration):** table `app.votes (day date, question int, choice smallint check in (0,1), count int, primary key(day, question, choice))`; functions `vote(p_day date, p_question int, p_choice int)` (only today's or yesterday's UTC day; adds one) and `split(p_day date, p_question int)` returning both counts. One vote per browser per day is enforced client-side (stored in `today:this-or-that`); accept that this can be bypassed and never show it as exact science: label results "of today's players" with the count ("2,104 votes").
- **Ticket:** "62% picked aisle. You guessed 55%." Share: `🔀 This or That #N\nI picked window\nGuessed the crowd within 7%`. No reveal of the split in the share text.
- **Done when:** migration applied and saved under `supabase/migrations/`; advisors show no new errors; a test (SQL as `anon`, rolled back) votes and reads the split; e2e votes against the real Supabase from `localhost` and then removes its test votes with SQL.

### 3. Color Recall
- **Slug** `color-recall` · **colour** `orchid` · **players** 1 · **daily** yes (unlimited tries, best counts) · **backend** none.
- **Play:** a colour fills the stage for 2 seconds, then disappears. Rebuild it with three sliders (hue, saturation, lightness) and press Lock in. Three colours per day, seeded.
- **Score:** per colour, 100 minus CIEDE2000 difference ×2 (clamped 0–100); the day's score is the average. Show both colours side by side after each lock-in.
- **Ticket:** "86% match". Share: `🎨 Color Recall #N\n🟩🟨🟩 86% match\nBest of 2 tries`.
- **Done when:** colour-difference function unit-tested against known pairs; sliders usable by keyboard and touch; the target colour is never visible in the DOM after it hides (no peeking with dev tools is not required, but it must not stay on screen).

### 4. Count Flash
- **Slug** `count-flash` · **colour** `sand` · **players** 1 · **daily** yes (unlimited tries, best counts) · **backend** none.
- **Play:** a field of dots flashes for 0.8 seconds. Type or slide your estimate of how many there were. Five rounds a day with counts between 12 and 300, seeded, dots placed without overlap.
- **Score:** per round, 100 minus percentage error (clamped); the result is the average. Show the real count after each guess.
- **Ticket:** "Within 9% on average". Share: `🔢 Count Flash #N\n🟩🟩🟨🟩🟥\nWithin 9% on average`.
- **Done when:** dot placement is seeded and non-overlapping (unit test); works at 360px (dots scale with the stage).

### 5. Tug of Taps
- **Slug** `tug-of-taps` · **colour** `lime` · **players** `same-phone-2` · **daily** no · **backend** none.
- **Play:** a rope marker sits in the middle of a `SplitStage`. Each tap pulls it one step toward your side; first to pull it 20 steps wins. 3-2-1 countdown first; taps before "Go" don't count. Multi-touch must work (both players tapping at once).
- **Ticket:** "Green wins in 9.4 s", taps per second for each player. Share: `🪢 Tug of Taps\nGreen won in 9.4 s\n7.8 taps a second`.
- **Done when:** simulated taps from both halves at the same time are both counted (pointer events with different `pointerId`s); keyboard players use A and L.

### 6. Angle Eye
- **Slug** `angle-eye` · **colour** `periwinkle` · **players** 1 · **daily** no (seeded per game, challenge links work) · **backend** none.
- **Play:** ten quick rounds of judging by eye: set an angle to a target (e.g. 37°), mark the exact middle of a line, extend a line to double its length, place a point at the centre of a circle. Drag or tap; Lock in.
- **Score:** each round 0–10 by error; total out of 100. Show the true answer as an overlay after each round.
- **Ticket:** "82 / 100". Share: `📐 Angle Eye\n82/100\nBest round: middle of a line, 1 px off`.
- **Done when:** each round type has a unit-tested scorer; drag works with mouse, touch and keyboard (arrow keys nudge).

### 7. Reaction Duel Online
- **Slug** `reaction-online` · **colour** `peach` · **players** `online-2` · **daily** no · **backend** Supabase Realtime (no tables).
- **Play:** one player taps "Create a room", gets a `RoomCode` and a link; the friend opens the link (or types the code) and joins the `Lobby`. Both press Ready; the host starts. Five rounds: each round both phones show "Wait…", then turn green after a delay the host sent in advance.
- **Fairness:** network latency must not decide the winner. Each phone measures its own reaction time locally (from the moment it turned green to the tap) and broadcasts it; the lower time wins the round. Early taps count as a lost round. Clock differences don't matter because each time is measured on its own phone.
- **Ticket:** both players' times per round, the winner, the average. Share: `⚡ Reaction Duel\nSam beat me 3–2\nMy average 241 ms`. "Rematch" keeps the room.
- **Done when:** two browser contexts in e2e can create, join and finish a match against the real Supabase Realtime (the sandbox can reach `*.supabase.co`); leaving mid-match ends it cleanly for the other player; the room code join rejects a full or started room with a clear message.

### 8. Flip Grid
- **Slug** `flip-grid` · **colour** `pistachio` · **players** 1 · **daily** yes (unlimited tries, fewest moves counts) · **backend** none.
- **Play:** a 5×5 grid of tiles, some dark. Tapping a tile flips it and its four neighbours. Turn every tile off. Each day's grid is generated by applying N seeded random taps to a solved grid (N from 6 to 10), so it is always solvable and the "par" is known.
- **Score:** moves used; the ticket compares with par ("Solved in 9, par 7").
- **Ticket share:** `🔲 Flip Grid #N\nSolved in 9 moves (par 7)\nBest of 3 tries`.
- **Done when:** generator and solver unit-tested (every generated puzzle solvable within par); undo key; works by keyboard (arrows + Space).

### 9. Spot Race Online
- **Slug** `spot-race` · **colour** `grape` · **players** `online-2-8` · **daily** no · **backend** Supabase Realtime.
- **Play:** up to eight players join a room. The host starts; everyone gets the same seeded sequence of Odd One Out grids (reuse the Odd One Out engine and emoji pairs from `src/games/odd-one-out.tsx`, moving shared parts into `src/games/shared/`). 60 seconds; a wrong tap costs 3 seconds. A `ScoreStrip` shows everyone's current level live.
- **Ticket:** final ranking with `PlayerChip`s. Share: `👀 Spot Race\n2nd of 5 · reached level 9`.
- **Done when:** two and three browser contexts can race in e2e against the real Supabase Realtime; late joiners are refused after start; a player who disconnects is shown as "left" and kept in the final ranking at their last level.

### 10. Stack Tower
- **Slug** `stack-tower` · **colour** `chili` · **players** 1 · **daily** yes (unlimited tries, best counts) · **backend** none.
- **Play:** a block slides back and forth above the tower; tap to drop it. Whatever overhangs the block below is cut off, so blocks get narrower. A perfect drop (within 3 px) keeps the full width and plays a chime. Speed rises every five blocks. The day's seed sets the starting width and the speed curve, so everyone faces the same tower.
- **Score:** height in blocks.
- **Ticket:** "23 blocks high, 6 perfect drops". Share: `🧱 Stack Tower #N\n23 blocks · 6 perfect\nBest of 4 tries`.
- **Done when:** canvas rendering at device pixel ratio, 60 fps on a mid-range phone (no layout work per frame); drop logic unit-tested; tap, click and Space all drop.

## The routine for each game (unattended)

1. `git checkout main && git pull`, then `git checkout -b game/<slug>`.
2. Build the game to its spec. Add unit tests for every scoring and generation rule, and an e2e script.
3. Run: `npm run tokens`, `npx tsc -b`, `npm test`, `npm run build`, `npm run e2e`. Look at screenshots at 360px, 412px, 820px and 1440px, in light and dark; fix anything clipped, overlapping or unreadable.
4. Add the game's card demo to `src/shell/demos.tsx` (a 3–4 second loop of its key moment; see the GameCard notes in the design system). Regenerate preview images: `npm run og` (needs Playwright; `NODE_PATH=$(npm root -g)` if it can't find it).
5. If the design system changed: `npm run ds`, render all previews, and publish the changed files to the design system artifact (see that artifact's instructions; read its index first).
6. Commit with a clear message, merge into `main` with `--ff-only`, push.
7. Wait for both checks on the pushed commit: the Vercel status ("Deployment has completed") and the GitHub Actions `check` job. Use `gh api repos/edwinbuild/games/commits/<sha>/statuses` and `/check-runs`.
8. If either fails: read the logs (`gh run view --log-failed`), fix, and push again. After two failed fixes, revert that game's merge on `main`, push, record why in `docs/overnight-log.md`, and move to the next game.
9. Check the live site in a real browser (the sandbox can reach `games-sigma-gold.vercel.app`): the new game page loads with status 200, no console errors, and its card is on the home page. Don't play it on the live site, because plays there count in the real stats; if a live play is unavoidable, remove it afterwards with SQL (subtract from `app.event_counts` for that game and hour).
10. Append a line to `docs/overnight-log.md`: game, commit, what was tested, anything left undone. Update the master plan doc's tracker if the docs connector is available.
11. Move to the next game. Never start a game while `main` is red.

## Stop conditions

- All ten games are live, or
- Three games in a row were reverted (stop and leave a note at the top of `docs/overnight-log.md`), or
- A step needs a decision only Edwin can make (spending money, a new account, deleting anything outside this repo): skip that part, log it, continue with the rest.
