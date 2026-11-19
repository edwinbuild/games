# Pocket Fair: polish, fixes, tests and new games (plan)

Goal: fix every reported issue and every bug of the same kind across all 31 games, back each fix with a test that would have caught it, make the UI and animation better everywhere, and add a few new games that meet the satisfying bar. Work goes part by part; each part ships to `main` with Vercel and CI green before the next starts, and is logged in `docs/overnight-log.md` under "Polish".

Rules from `docs/next-10-games.md` (Ground rules, routine) and `docs/satisfying-games.md` (the satisfying bar) still apply.

## Reported issues (from testing on a phone)

| # | Priority | Issue | Cause found in the code | Fix |
|---|---|---|---|---|
| 1 | High | Finished runs disappear on refresh (Angle Eye after the 10th answer, Count Flash after the 5th) | The result is recorded only when the player presses "See your total/result" (Count Flash `next()`, Angle Eye's effect waits for `judged` to clear) | Record at the final answer, in the same handler. Keep run progress in session storage so a refresh mid-run resumes it. |
| 2 | High | Five false starts earn a 500 ms personal best; a penalty is called the "fastest round" | Reaction Chain averages penalties and takes the minimum over all rounds | A run needs at least one clean tap to count; "fastest" only looks at clean taps; an all-penalty run says so and records nothing. |
| 3 | High | A timed reveal can start mostly off-screen on a 360×740 phone (Count Flash "Try again") | Try again calls `flash()` straight away; the stage may be below the fold | New shared `useReadyStage`: scroll the stage fully into view, wait for scrolling to settle, then a short 3-2-1 "Get ready" before any timed reveal. The dot field is also sized to fit the screen height. |
| 4 | High | Count Flash shows the counts, then a scored retry uses the same fields | All tries of a day share one set of counts | Each try of the day gets its own fields (try 1 is the same for everyone, try 2 is the same for everyone, and so on), so a revealed answer never helps the next try. Same for Color Recall's colours and Shape Recall's shapes. Challenge links still replay try 1. |
| 5 | Medium | "66% off" shown for a real average error of 88.32% | Each error is capped at 100% before averaging | Show the true average error (uncapped). Scores and tiles may still cap per round, but the words describe the real number. |
| 6 | Medium | Refreshing an online room resets Ready to Not ready | `ready` starts false on every load | Keep Ready per room in session storage and restore it when you rejoin; it still resets when the match starts or you leave. |
| 7 | Medium | Tap Duel and Tug of Taps never record anything | No `recordPlay` call | Local and online multiplayer games record matches played (and wins where it makes sense); the record panel shows them. |

## Part 1: fix the reported issues (one commit per issue)

Each fix comes with the test that would have caught it (see Part 3 for the shared test helpers):

1. Record-at-final-answer: Angle Eye, Count Flash. e2e: finish, refresh before pressing the last button, check the stats and that the daily result shows.
2. Reaction Chain degenerate runs. Unit test of the scoring (all early, some early, none early); e2e five false starts shows "No clean taps" and no record.
3. `useReadyStage` hook plus 3-2-1 countdown in `src/ui` (`GetReady`, with design-system docs). e2e at 360×740: when the flash starts, the whole field is on screen.
4. Per-try puzzles for Count Flash, Color Recall, Shape Recall. Unit: try n and try n+1 differ; try n is the same for everyone. e2e: answers revealed after try 1 differ from try 2's.
5. True average error in Count Flash. Unit test with the tester's numbers.
6. Ready kept after refresh. e2e on real Realtime: ready, refresh, still ready (both online room games and the two newer ones).
7. Match records for local and online multiplayer. e2e: finish a match, reopen, the record panel shows "1 match played".

## Part 2: the same bugs everywhere (audit fixes)

An independent review of all 31 games lists every place the seven bug classes occur, plus other bugs found. Fix each one, with a test. The review's findings are added to the log as they are fixed. Classes:

- A. Result recorded late (only after an extra press or an effect).
- B. Degenerate runs producing records or misleading words.
- C. Timed reveals without making sure the stage is visible.
- D. Exact answers revealed before a scored retry on the same puzzle.
- E. Wrong maths or wording in displayed numbers.
- F. Online room state lost on refresh.
- G. Games that don't record at all.
- H. Anything else found: timers and listeners, replay resets, shortcuts firing in text fields, challenge links, labels.

### Part 2 checklist (from the independent review)

- [ ] Online: a player who refreshes mid-game is still in presence but back in the lobby, so others wait forever (Higher Lower, Reaction Duel, Quick Draw).
- [ ] Online: at start only the host sets ready to false, so Rematch can start at once and pull players off their results.
- [ ] Reaction Duel: Rematch never clears `started`, so a new friend is told the match already started.
- [ ] Beat Keeper: drumming fast scores well (extra taps cost nothing).
- [ ] Blind Timer, Pitch Match: no `trackFinish={fresh}`, so every reload sends another finish event and replays the done sound.
- [ ] Color Recall: Try again started the reveal off-screen (done in Part 1); compare screen showed the colour then retried the same colours (done in Part 1).
- [ ] Pour Line: if every try spills, the day is never recorded (streak breaks, card says New).
- [ ] Guess the Crowd: the day is recorded only once 20 have answered, so an early player loses the streak.
- [ ] This or That: your own vote counts towards the split you guess; text shows the old split next to a live bar; "off" is percentage points.
- [ ] Challenge-link replays reuse the same seed in Memory Path, Odd One Out, Reaction Chain, Pendulum Stop and Tidy Up, so memorised runs become personal bests.
- [ ] Reaction Chain: "a new best" shown when equal to an older best (removed in Part 1).
- [ ] Tap Duel: ties inside 10 ms can never happen (the second tap is ignored).
- [ ] Fair Slice: the fifth cut is saved after a delay (refresh loses it) and the timer isn't cleared; Chain Pop and Domino Drop save after the animation.
- [ ] Domino Drop: Enter before using the arrows presses Push.
- [ ] Angle Eye: about 16% of angle rounds draw the answer or handle outside the board.
- [ ] Session runs restored across different challenge links (keyed by challenge seed in Part 1).
- [ ] Steady Line: lifting your finger says "Touched the edge".
- [ ] Tidy Up: a wrong-slot drop can send an item back to a spot outside the board.
- [ ] Plurals: "1 rounds", "1 mirrors", "1 blocks" in stored text.

## Part 3: tests that catch these for every game

- **Shared e2e checks run after every game script** (in `tests/e2e/run.cjs`): the game recorded something in local stats; no console errors; no horizontal overflow; for daily games, a refresh after finishing shows the result again.
- **Timed-reveal visibility check** at 360×740 for every game that shows something for a limited time (Count Flash, Color Recall, Shape Recall, Memory Path, Blind Timer, Beat Keeper): the stage is fully on screen when the reveal starts.
- **Refresh-mid-run check** for multi-step games (Angle Eye, Count Flash, Color Recall, Fair Slice, Shape Recall, Pitch Match): refresh halfway, the run resumes where it was.
- **Unit tests for stats** (records, bests in both directions, streaks across midnight and month ends, new-best detection, match counts) and for every scoring function touched.
- **Online:** ready-after-refresh, host leaving, rematch after a refresh.
- CI keeps running unit tests, types, build and budget; the e2e suite runs locally before every push, as now.

## Part 4: UI and animation polish

1. **Home:** filter chips (All, Daily, Any time, With friends) that remember the choice; today's progress as a small ring ("4 of 16 daily games played"); cards rise in with a short stagger on load; card press feels physical.
2. **Game pages:** the stage slides in on load; a skeleton stage instead of "Loading…"; the shared 3-2-1 `GetReady` for timed starts; scores bump when they change (`Score` animates value changes).
3. **Result ticket:** prints with a paper slide, the stamp lands with a small bounce, and the headline counts up (already) with a final tick sound.
4. **Consistency pass on all 31 games:** spacing, button sizes on small phones, dark mode contrast of game-specific drawings, focus outlines, reduced-motion behaviour.
5. **Performance:** budget stays green; no layout work in animation loops.
6. Design system updated and republished for every changed or new component.

## Part 5: new games (each meets the satisfying bar)

1. **Paint Mix** (daily): mix three paints with sliders or taps to match a target colour; the paint swirls together as you add it; scored by perceived colour difference.
2. **Orbit Drop** (any time): a ball circles a planet; tap to let go and fly to the next target planet; one-tap timing with satisfying arcs; run ends on a miss.
3. **Balance Beam** (daily): place weights on a seesaw so it settles level; the beam tips with real torque maths and wobbles to rest; fewest weights counts.

Each gets: unit tests for its rules, an e2e script, a card demo, preview images, design system updates if any.

## Order and stop conditions

Parts 1 → 2 → 3 → 4 → 5, each part shipped and logged before the next. Stop if three pushes in a row fail after two fixes each (leave a note at the top of the log), or if a step needs Edwin's decision (log it and carry on with the rest).
