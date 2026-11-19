# Pocket Fair: satisfying games (build plan)

This file is the single source for a run that adds a "satisfying" kind of game to the site: games people play for the feeling of it (a clean pour, a long chain of pops, a perfect cut) as much as for the score. It builds one shared toolkit, then five games one by one, pushing each to `main` (which deploys to Vercel) before starting the next.

Read first: `README.md`, `design-system/README.md`, and in `docs/next-10-games.md` the sections **Network**, **Ground rules** and **The routine for each game**. All of those apply here unchanged; this file only adds to them.

## What "satisfying" means here (the bar every game must meet)

A game in this set is done only when all of these are true on a phone:

1. **One clear payoff moment** that you can see, hear and feel: the liquid settling at the line, the last bubble popping, the two halves sliding apart.
2. **Smooth motion.** Canvas at device pixel ratio, 60 fps on a mid-range phone, no layout work per frame (the Stack Tower pattern: sizes from a `ResizeObserver`, colours read from CSS once and on theme change, all per-frame state in refs).
3. **Sound that rewards.** Every action has a short sound through `src/shell/feel.ts`; streaks and chains climb in pitch. Sound stays off until the player turns it on, as everywhere on the site, so the game must still feel good silent (motion carries it).
4. **Touch feel.** A light vibration on each action and a stronger one on the payoff, where the phone supports it.
5. **Instant restart.** From the ticket, "Try again" puts you back in play in under a second, with no loading.
6. **Calm under reduced motion.** With reduced motion: no shaking, no particles; the payoff is shown as a simple settled state with the same sound.
7. **A card demo** in `src/shell/demos.tsx` that shows the payoff moment (see the GameCard notes in the design system).

## Step 0: the satisfying toolkit (one commit, before any game)

1. **Sounds in `feel.ts`:** `pop(n)` (a short pop whose pitch climbs with `n`, for chains), `chime(n)` (Stack Tower's rising chime, moved here so every game shares it), `pour(on)` (a soft filtered-noise loop that starts and stops), `click()` (a snap for pieces locking into place), `thud()` (a low knock for things landing). All synthesised with Web Audio (no audio files), all respect the sound setting, all under 200 ms except `pour`. Unit-test the pitch ladders (pure functions returning frequencies).
2. **Haptics:** `feel.light()`, `feel.medium()`, `feel.success()` as named vibration patterns, so games don't invent their own numbers.
3. **`Burst`** in `src/ui` and the design system: a small canvas-free particle burst (12–20 CSS-animated dots in the game colour and `on-fill`) placed at a point, for payoffs on non-canvas screens such as the ticket on a new best. Off under reduced motion. Add README, preview and `index.d.ts` entry; republish the design system.
4. **Ticket print sound:** the result ticket plays `click()` as it prints (only when sound is on).
5. **Polish pass on existing games (small, no rule changes):**
   - Stack Tower uses the shared `chime`.
   - Flip Grid plays `click()` per flip and `chime` on the solved grid.
   - Odd One Out and Spot Race play `pop` with a climbing pitch for consecutive correct taps.
   - New personal bests on any ticket show a `Burst`.
6. **New colour tokens** for the five games, same value in light and dark, each checked for 9:1 or better contrast with `on-fill` (write the check into `design-system/build.ts` if it isn't there already; drop or adjust any colour that fails): `honey #ffd166`, `lilac #c9b6ff`, `apricot #ffbf8f`, `seafoam #9fe8cf`, `butter #f5e48b`. Add usage notes naming their game, run `npm run tokens`.

## The five games, in build order

### 1. Pour Line
- **Slug** `pour-line` · **colour** `honey` · **players** 1 · **daily** yes (unlimited tries, best counts) · **backend** none.
- **Play:** a glass with a line drawn on it. Press and hold anywhere to pour from a tap above; let go to stop. The liquid keeps settling for a moment after you let go (a short stream still falling, then a gentle slosh), so stopping early is part of the skill. Overfilling spills over the rim and ends the try.
- **Daily:** the date picks the glass shape (straight, tapered, rounded, or a wide bowl), the line height and the pour speed, so a tapered glass fills faster near the bottom than the top. Everyone gets the same glass.
- **Feel:** surface drawn as a wave that calms after the pour; small bubbles rising; a foam layer on the last part; `pour` sound while pouring and a soft settle sound; the line glows when you finish within 1%.
- **Score:** how far the settled level is from the line, as a percentage of the glass height ("0.6% off"). Spilled = no score for that try.
- **Ticket share:** `🥛 Pour Line #N\n0.6% off the line\nBest of 3 tries`.
- **Done when:** fill-level maths unit-tested for each glass shape (volume to height, including the after-pour settle); the e2e holds and releases at scripted times and checks the scored level matches the model; hold works by touch, mouse and Space.
- **Card demo:** liquid pours into a small glass, stops right at the line, the surface settles.

### 2. Chain Pop
- **Slug** `chain-pop` · **colour** `lilac` · **players** 1 · **daily** yes (unlimited tries, best counts) · **backend** none.
- **Play:** a board of about 60 bubbles of three sizes, drifting slightly. You get one tap. The bubble you tap pops and sends out a ring; any bubble the ring reaches pops too and sends out its own ring (bigger bubbles, bigger rings). Then you watch the chain run.
- **Daily:** the date places every bubble, so everyone tries the same board and can compare.
- **Feel:** each pop plays `pop(n)` with pitch climbing as the chain grows; rings in the game colour fading out; a counter that ticks up on the canvas; a `success` vibration and chime when the chain clears more than three quarters of the board.
- **Score:** bubbles popped from one tap ("41 of 60").
- **Ticket share:** `🫧 Chain Pop #N\nPopped 41 of 60 with one tap\nBest of 5 tries`.
- **Done when:** the chain simulation is deterministic and unit-tested (same tap, same result, at any frame rate: simulate on fixed time steps, not frame time); a test finds the day's best possible tap and checks every daily board for a year has a best chain of at least 30 of 60 and that no single tap clears the whole board; the e2e taps a scripted point and checks the count.
- **Card demo:** one tap, rings spreading, bubbles popping one after another.

### 3. Fair Slice
- **Slug** `fair-slice` · **colour** `apricot` · **players** 1 · **daily** yes (unlimited tries, best counts) · **backend** none.
- **Play:** five shapes, one at a time. Swipe one straight line across each shape to cut it in two. The halves slide apart and each shows its share of the area ("51% / 49%"). Shapes get harder: square, triangle, circle with a bite, star, an irregular blob.
- **Daily:** the date picks the five shapes and their rotations.
- **Feel:** a crisp slice sound, the cut line flashes, the halves separate with a small spring; a perfect 50/50 (within 0.5%) gets a chime and a `Burst`.
- **Score:** average distance from 50/50 over the five cuts ("1.4% off on average").
- **Ticket share:** `🔪 Fair Slice #N\n🟩🟩🟨🟩🟥 1.4% off\nBest of 2 tries` (green within 1%, yellow within 3%, red beyond).
- **Done when:** polygon area split unit-tested against known shapes (a square cut through the centre is exactly 50/50, any shape cut outside it is 100/0, concave shapes cut into three or more pieces count the smaller side as everything on one side of the line); a swipe that misses the shape is ignored, not scored; keyboard play: arrows move and rotate a guide line, Space cuts.
- **Card demo:** a swipe through a star, the halves slide apart, "50%".

### 4. Tidy Up
- **Slug** `tidy-up` · **colour** `seafoam` · **players** 1 · **daily** no (any time; challenge links replay the same board) · **backend** none.
- **Play:** a cluttered tray of 12–20 small items (pencils, coins, shells, buttons) drawn as simple shapes. Each has a matching outline in a fitted organiser. Drag each item into its slot; it snaps in with a click when close and the right way round (tap an item to rotate it 90°). Timer runs from the first touch.
- **Feel:** the snap is the whole game: a short ease into place, `click()`, a light vibration, a tiny settle bounce. The last item clicks in, the organiser closes with a lid animation and a chime.
- **Score:** time to tidy, plus 2 seconds per item dropped in a wrong slot (it slides back out).
- **Ticket share:** `🧺 Tidy Up\nTidied 16 things in 38.2s`.
- **Done when:** snap and rotation rules unit-tested; dragging works with touch, mouse and pen with no page scroll while dragging; keyboard play: Tab to an item, arrows to move it, R to rotate, Enter to drop; works at 360px with items large enough to grab (at least 40px).
- **Card demo:** three items glide into their outlines, the last one clicks, the lid closes.

### 5. Domino Drop
- **Slug** `domino-drop` · **colour** `butter` · **players** 1 · **daily** yes (unlimited tries, best counts) · **backend** none.
- **Play:** a board with a fixed set of standing dominoes in a winding path with gaps and a few obstacles. You have five extra dominoes; tap to place each one (drag to adjust, tap again to turn it). Then push the first domino and watch the run fall.
- **Daily:** the date sets the path, the gaps and the obstacles.
- **Feel:** each domino falls with a click whose pitch climbs along the run; the camera follows the falling front; a finish bell if the last domino falls.
- **Score:** how many dominoes fell, out of the total ("38 of 40").
- **Ticket share:** `🁢 Domino Drop #N\n38 of 40 fell\nBest of 4 tries`.
- **Done when:** the fall simulation is deterministic and unit-tested (a domino tips its neighbour only within its reach and angle; placement rules forbid overlap); every daily board for a year is completable with the five spares (the test finds a placement); the e2e places dominoes at a known solution and checks all fall.
- **Card demo:** a short winding run falling in sequence.

## The routine for each game

Follow `docs/next-10-games.md` → "The routine for each game" exactly (branch, build to spec, unit tests and e2e, screenshots at 360, 412, 820 and 1440px in light and dark, `npm run og`, design system if changed, commit, `--ff-only` merge to `main`, push, wait for the Vercel and CI checks, live check without playing, log). In addition, before merging:

- Record a 10-second phone-size video of the game (Playwright `recordVideo`) and look at it: does the payoff moment feel good with sound off? If not, fix the motion before shipping.
- Check the satisfying bar above, item by item, and note in the log which items were checked and how.
- Log every game in `docs/overnight-log.md` under a new heading "Satisfying games".

## Stop conditions

- Step 0 and all five games are live, or
- Three games in a row were reverted (stop and leave a note at the top of `docs/overnight-log.md`), or
- A step needs a decision only Edwin can make (spending money, a new account, deleting anything outside this repo): skip that part, log it, continue with the rest.
- If a game's physics can't reach 60 fps on the e2e phone profile after two attempts, simplify the visuals (fewer particles, simpler surface) rather than dropping the game, and note it.
