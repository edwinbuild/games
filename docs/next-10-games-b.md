# Pocket Fair: the next 10 games, set B (build plan)

This file is the single source for a run that adds ten more games one by one, pushing each to `main` (which deploys to Vercel) before starting the next. It fills the gaps in the first 21 games: crowd games, rhythm, logic, drawing, and more to play with friends.

Read first: `README.md`, `design-system/README.md`, `supabase/README.md`, and in `docs/next-10-games.md` the sections **Network**, **Ground rules** and **The routine for each game**. Also read `docs/satisfying-games.md` → "What satisfying means here": every game in this set must meet that bar too (one clear payoff moment, smooth motion, sound, vibration, instant restart, reduced motion, card demo). All of those rules apply here unchanged; this file only adds to them.

## Rules specific to this set

- **Crowd numbers are real or not shown.** Crowd games show only numbers that come from Supabase. Before enough people have answered (fewer than 20), say so plainly ("Only 7 answers so far; check back later") instead of showing a split that looks meaningful.
- **No personal data in the crowd tables.** Store counts per day, question and choice or bucket, never who answered. One answer per browser per day is enforced in the browser (as This or That does); the database only refuses obviously bad input and days out of range.
- **Facts must be true and sourced.** Any game that states facts (Higher Lower) uses a dataset committed to the repo with its source and year at the top of the file, from a reputable public source (for example UN, World Bank or national statistics agencies). No invented or approximate-from-memory numbers. If a fact can't be sourced, drop it.
- **Free text between players stays in the room and is filtered.** Typed guesses in online games are shown only to that room, are limited to 24 characters, and pass a small word filter (`src/shell/filter.ts`, a list committed to the repo) before they are sent; anything filtered shows as "•••".
- **Same daily rules as before:** unlimited tries with the best counting, except where noted (one answer a day for crowd games, as with This or That).

## Step 0: shared groundwork (one commit each, before any game)

1. **Crowd backend** (Supabase project `pocketfair`, applied with the Supabase connector as a migration *and* committed under `supabase/migrations/`, following the This or That pattern: private `app` tables with row level security on and no policies, `security definer` functions with `search_path = ''`, `execute` granted to `anon` only and revoked from `public`, input range checks, the day allowed only within one day of the UTC date):
   - `app.crowd_numbers (game, day, question, bucket, count)` with `crowd_answer(p_game, p_day, p_question, p_value)` that adds one answer into a bucket and returns the mean, the median and a 20-bucket histogram, and `crowd_numbers(p_game, p_day, p_question)` to read them.
   - `app.crowd_picks (game, day, question, choice, count)` with `crowd_pick(p_game, p_day, p_question, p_choice)` and `crowd_picks(p_game, p_day, p_question)`; for Odd Pick the read function refuses today's day (results appear only once the day is over, so nobody can game today's split).
   - Register the ten new slugs in `app.games` for event counting.
   - Check the security advisors afterwards and that an `authenticated` role cannot call the functions. Run a scripted test from the browser against the real functions using a test day far in the past (for example 2000-01-01) and delete those test rows with SQL afterwards.
2. **Shared crowd UI** in `src/ui` and the design system: `Histogram` (a small bar chart of the crowd with the player's answer marked; accessible text summary under it) and `SplitBars` (horizontal share bars for multi-choice results, player's pick marked). README, preview, `index.d.ts`, bundle list; republish the design system.
3. **Word filter** `src/shell/filter.ts` with unit tests (case, spacing and simple letter-swap evasions like `a→@`), used by the online games' chat-like inputs.
4. **Drawing helper** `src/shell/ink.ts`: captures a finger or mouse stroke as points (pointer events, coalesced events where available, `touch-action: none`), smooths it, and draws it to a canvas at device pixel ratio. Unit-test the smoothing and the stroke simplification.
5. **New colour tokens**, same value in light and dark, each checked for 9:1 or better with `on-fill` (the build fails below 6.5:1; adjust any that land between 6.5 and 9): `blush #ffc2d1`, `citrus #d8f36a`, `iris #b9b4ff`, `denim #9cc4ff`, `glacier #bfeefa`, `sunbeam #ffe14d`, `sage #b9d8b0`, `mauve #d9b3e6`, `melon #ffb0a0`, `jade #8fdcb1`. Usage notes name their game.

## The ten games, in build order

### 1. Odd Pick
- **Slug** `odd-pick` · **colour** `citrus` · **players** 1 · **daily** yes, **one pick a day** · **backend** `crowd_pick`.
- **Play:** five options (numbers, colours, shapes or everyday choices; global, no country references). Pick the one you think the *fewest* people will pick.
- **Results:** tomorrow. Today the ticket shows "Pick locked in · results tomorrow" with a countdown. When the player comes back, the home card and the game show yesterday's split with `SplitBars` and whether their pick was the rarest ("Your pick: 6% · rarest of the five!").
- **Score:** the share of players who made the same pick (lower is better). Share: `🎯 Odd Pick #N\nI picked the 2nd rarest (9%)`.
- **Done when:** question bank of at least 120 five-option questions in `src/games/odd-pick/questions.ts` with a test that none repeat within a year; e2e uses `page.route` to stand in for the crowd functions (never writes real picks); yesterday's result shows on return.
- **Card demo:** five tiles, one tapped, bars grow with the tapped one the shortest.

### 2. Guess the Crowd
- **Slug** `guess-the-crowd` · **colour** `blush` · **players** 1 · **daily** yes, **one answer a day** · **backend** `crowd_answer`.
- **Play:** one number question a day ("Pick a number from 1 to 100", "How many hours did you sleep last night?", "How many tabs are open on your phone?"). Give your own answer with a slider, then guess the crowd's average.
- **Results:** right away, from everyone so far, as a `Histogram` with your answer and your guess marked. Under 20 answers: say so and show only your answers.
- **Score:** how far your guess was from the real average, as a percentage of the question's range ("3% off").
- **Done when:** question bank of at least 120 with sensible ranges and units, test for no repeats within a year; e2e with `page.route` stand-ins; under-20 message checked.
- **Card demo:** a histogram rising bar by bar, then a marker sliding to the average.

### 3. Beat Keeper
- **Slug** `beat-keeper` · **colour** `iris` · **players** 1 · **daily** yes (unlimited tries, best counts) · **backend** none.
- **Play:** a beat plays (sound and a pulsing circle) for four bars at the day's tempo; then it goes silent and still, and you keep tapping in time for eight more beats. The circle comes back at the end to show where the beats really were.
- **Score:** average timing error in milliseconds across the silent beats, and whether you drifted fast or slow ("±23 ms, drifting slow").
- **Feel:** each tap ripples; the reveal lines your taps up against the true beats like a strip of ticks.
- **Done when:** scoring unit-tested (perfect taps = 0 ms; constant drift detected; a missed beat counts as the worst error); timing uses `performance.now()` and pointer timestamps, not frame time; works with sound off thanks to the pulsing circle; e2e taps on a scripted schedule with a paused clock and checks the score.
- **Card demo:** a pulsing dot, then taps landing on a timeline.

### 4. Pipe Turn
- **Slug** `pipe-turn` · **colour** `glacier` · **players** 1 · **daily** yes (unlimited tries, fewest turns counts) · **backend** none.
- **Play:** a 6×6 grid of pipe pieces. Tap a piece to turn it a quarter turn. Connect the tap to the plant; water flows through the connected pipes as you go, and the plant blooms when it's reached.
- **Daily:** a seeded solvable layout (generate a path, fill the rest with decoys, scramble rotations); par = the fewest turns to solve, computed by the generator.
- **Score:** turns used, against par.
- **Done when:** generator and connectivity checker unit-tested; every daily board for a year is solvable within par; keyboard play (arrows and Space); water flow animates along the connected path only.
- **Card demo:** one tile turns, water runs through to the plant.

### 5. Light Path
- **Slug** `light-path` · **colour** `sunbeam` · **players** 1 · **daily** yes (unlimited tries, fewest mirrors counts) · **backend** none.
- **Play:** a grid with a laser, two or three targets and some walls. Place up to three mirrors (tap a cell to place, tap again to flip its angle, tap a third time to remove). The beam is traced live; hit every target to win.
- **Score:** mirrors used, then moves, against par.
- **Done when:** beam tracing unit-tested (reflections, walls, loops detected and stopped); every daily board for a year is solvable within three mirrors (a solver test); keyboard play.
- **Card demo:** a mirror drops in and the beam bends onto a target, which lights up.

### 6. Pendulum Stop
- **Slug** `pendulum-stop` · **colour** `denim` · **players** 1 · **daily** no (any time; challenge links replay the same run) · **backend** none.
- **Play:** a pendulum swings across a target zone. Tap to stop it; land inside the zone to continue. Each round the swing gets faster and the zone smaller. One miss ends the run.
- **Score:** rounds cleared.
- **Done when:** swing maths unit-tested (the stop position from tap time is exact, the zone check is inclusive); canvas at device pixel ratio; tap, click and Space all stop it.
- **Card demo:** the pendulum stops in the zone, the zone flashes and shrinks.

### 7. Steady Line
- **Slug** `steady-line` · **colour** `sage` · **players** 1 · **daily** yes (unlimited tries, best counts) · **backend** none · uses `ink.ts`.
- **Play:** a winding channel. Put your finger on the start and trace to the end without touching the edges; the channel narrows as you go and a timer runs.
- **Score:** the share of the path completed before touching an edge, then time for full runs.
- **Done when:** hit testing against the channel unit-tested; lifting the finger ends the run; works with a mouse; reduced motion keeps the same rules.
- **Card demo:** a line tracing along a curving channel.

### 8. Shape Recall
- **Slug** `shape-recall` · **colour** `mauve` · **players** 1 · **daily** yes (three shapes, best try counts) · **backend** none · uses `ink.ts`.
- **Play:** a shape (a squiggle, a zigzag, a loop) shows for two seconds, then hides. Redraw it from memory with one stroke. Your drawing is laid over the original.
- **Score:** how closely the two match, 0–100 per shape (average distance between the resampled, size-normalised strokes, turned into a percentage), averaged over three.
- **Done when:** the matching score unit-tested (identical = 100; same shape shifted or scaled = still high; a different shape = low; direction of drawing doesn't matter); the overlay reveal animates.
- **Card demo:** a squiggle shows, hides, and is redrawn over the top.

### 9. Higher Lower Online
- **Slug** `higher-lower` · **colour** `jade` · **players** `online-2-8` · **daily** no · **backend** Supabase Realtime (rooms, as in Spot Race).
- **Play:** everyone in the room sees the same pair of facts, one with its number shown and one hidden ("Mount Kilimanjaro: 5,895 m. Is Mount Fuji higher or lower?"). Answer fast; the fastest correct answers score most. Ten rounds; a `ScoreStrip` shows everyone's score.
- **Data:** a sourced dataset in `src/games/higher-lower/facts.ts` (for example mountain heights, river lengths, country populations, city founding years), with source and year in the file header and a unit test that every fact has a source key and a positive number.
- **Done when:** the host deals the same seeded rounds to everyone; scoring is decided by each phone's own reaction time (as in Reaction Duel), so a slow connection doesn't decide a round; late joiners are turned away; a player who leaves keeps their score; e2e with three real browsers on Supabase Realtime.
- **Card demo:** two cards, one flips to reveal "higher", a point pops on a player chip.

### 10. Quick Draw Guess
- **Slug** `quick-draw` · **colour** `melon` · **players** `online-2-8` · **daily** no · **backend** Supabase Realtime · uses `ink.ts` and `filter.ts`.
- **Play:** players take turns drawing. The drawer gets a word from a list of simple, global, kind words (objects, animals, actions: at least 300 in `src/games/quick-draw/words.ts`) and has 45 seconds; everyone else sees the drawing appear live and types guesses. The first correct guess scores for the guesser and the drawer; close guesses show "close!" privately to the guesser.
- **Done when:** strokes are sent as simplified point batches at most 10 times a second and redrawn smoothly on other phones; guesses are matched case- and space-insensitively with simple plurals; filtered words never reach other players; rounds rotate through everyone; a drawer who leaves skips to the next; e2e with three real browsers (one draws a scripted stroke, another guesses right).
- **Card demo:** a line drawing appears stroke by stroke and a guess bubble pops "Cat ✓".

## The routine for each game

Follow `docs/next-10-games.md` → "The routine for each game" exactly (branch, build to spec, unit tests and e2e, screenshots at 360, 412, 820 and 1440px in light and dark, `npm run og`, design system if changed, commit, `--ff-only` merge to `main`, push, wait for the Vercel and CI checks, live check without playing, log). In addition, before merging:

- Record a 10-second phone-size video and check the payoff moment still works with sound off (the satisfying bar).
- Crowd games: e2e never writes to the real crowd tables; the live check only loads the page.
- Online games: e2e uses real Supabase Realtime with at least three browsers.
- Log every game in `docs/overnight-log.md` under a new heading "Set B".

## Stop conditions

- Step 0 and all ten games are live, or
- Three games in a row were reverted (stop and leave a note at the top of `docs/overnight-log.md`), or
- A step needs a decision only Edwin can make (spending money, a new account, deleting anything outside this repo): skip that part, log it, continue with the rest.
- If a sourced dataset can't be built for Higher Lower, skip that game, log why, and continue.
