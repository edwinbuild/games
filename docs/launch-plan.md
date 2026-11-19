# Pocket Fair: launch plan (fix, deepen, organise, go live)

Goal: before launch, make every game worth playing (rework or retire the shallow ones), add deeper games, give the site a clearer structure on phone and desktop (categories, desktop sidebar, a proper footer), add daily leaderboards, decide on accounts, and finish a launch checklist. Work goes part by part; each part ships to `main` with Vercel and CI green before the next starts, and is logged in `docs/overnight-log.md` under "Launch".

Rules from `docs/next-10-games.md` (Ground rules, routine), `docs/satisfying-games.md` (the satisfying bar) and `docs/polish-plan.md` (every fix has a test that fails without it) still apply.

## Ratings that drive this plan

Formula v2 (out of 100): `10 × (0.30·Challenge + 0.25·Fun + 0.20·Replay + 0.15·Social + 0.10·Accessible)`. A solo game with Challenge ≤ 3 is capped at 55. The full table is in the chat of 2026-11-19; the bottom of it:

| Game | Score | Problem |
|---|---|---|
| Luckiest Person | 43.5 | Pure luck, nothing to decide |
| Paint Mix | 45.5 | Both colours always visible, free undo, unlimited tries: no challenge |
| This or That | 54.0 | One tap |
| Pitch Match | 55.5 | Needs sound and a good ear |
| Guess the Crowd | 57.0 | Result waits for 20 answers |
| Tug of Taps | 57.5 | Button mashing |
| Balance Beam | 58.0 | Par 2 is one sum |

Every part below is re-rated at the end with the same formula; the target is **no solo game under 55, average Challenge ≥ 5.5 (now 5.1)**.

## Decisions (defaults the plan follows unless Edwin says otherwise)

| # | Decision | Default in this plan | Why |
|---|---|---|---|
| D1 | Remove games? | **Retire Luckiest Person.** **Merge Tap Duel + Reaction Duel Online** into one *Reaction Duel* with "one phone" and "online" modes. Keep everything else, reworked where needed. | Luck-only game; two near-identical duels. Old links redirect to the new page; local stats carry over. |
| D2 | Accounts / sign-in | **No sign-in at launch.** Add a **"Move to another phone" code** (copies your stats and streaks with a short code or QR; no email, no personal data). Sign-in stays a later option (Part E). | The standing rule is *no personal data in the database*. Sign-in means storing emails, a privacy policy rewrite, account deletion and GDPR work. |
| D3 | Leaderboards | **Daily, anonymous**: your rank and percentile ("better than 82% today") on every daily ticket, plus a top-50 board with optional nicknames (the existing name field and word filter). Friends boards via challenge links stay. | Percentile motivates everyone; a top-50 alone only rewards the best few. No accounts needed. |
| D4 | Desktop sidebar | **Yes, on the home page only, at ≥ 1100px**: today's progress, categories, your streaks. Phones keep the filter chips. Game pages keep their existing side column. | 34 cards is a 3,700px scroll on desktop; a sticky rail makes it browsable. A sidebar on game pages would squeeze the game. |
| D5 | Categories | By what the game asks of you: **Logic**, **Timing**, **Memory**, **Eye**, **Words**, **Crowd**, **With friends**, plus the **Daily / Any time** switch. | "Daily / Any time" says when, not what. Skill categories help people find their kind of game (Playlin groups 1,400 games this way). |
| D6 | Footer | "Made with ♥ by **edwinsm.me**" (links to https://edwinsm.me), as a small ticket stub, across the full page width. | Asked for. |
| D7 | Domain | Stay on `games-sigma-gold.vercel.app` until Edwin picks a domain (e.g. a subdomain of edwinsm.me). Everything is ready to switch (canonical URLs and preview images come from one setting). | Needs Edwin's DNS. |

If a decision is overridden, the affected part changes and the rest carries on.

## Part A: site structure and desktop

1. **Footer** (all pages): a full-width ticket-stub footer: brand mark, "Made with ♥ by edwinsm.me", All games · About · Privacy, and the theme switch. Aligned on one baseline (today the links and the switch don't line up). The design system's `Footer` is updated and republished.
2. **Categories**: each game gets a `skill` in the registry (Logic, Timing, Memory, Eye, Words, Crowd, With friends). Phone: the chips become *All · Daily · Any time* plus a second row of skill chips. Each category also gets a static page (`/c/logic/` …) for search engines and sharing.
3. **Desktop home with sidebar** (≥ 1100px): a sticky left rail with today's progress ring, the categories (with counts), Daily/Any time, and "Your streaks" (the top three). The cards fill the rest as a 3-column grid. 820–1099px: no rail, chips as on phones.
4. **Desktop game page**: a wider game column (the board uses the space, up to a sensible maximum), the side column keeps How to play / your record / leaderboard, and the footer spans the page.
5. **Checks**: screenshot sheets at 360, 412, 820, 1024, 1440 and 1920 in light and dark; the e2e page checks gain 1920 and a rule that the footer is on one line at ≥ 820px.

## Part B: rework the weak games

1. **Paint Mix → a real planning puzzle**
   - Paint can't come out: **no Undo, no Empty**. Overshoot and you have to correct with other paints.
   - **Five colours a day**, easy to hard (a tint, two paints, three paints, a dark shade, a muted shade).
   - **A drop budget for the whole day** (e.g. 40 drops for all five), shown as a paint tube that runs down.
   - The match % is hidden until you lock each colour in; a ★ for hitting the exact recipe.
   - Score = average match, with ★ as a tiebreak. Unit tests: every day is solvable within the budget; hard colours need ≥ 3 paints. e2e: overshoot can't be undone, the budget runs out, five colours are scored.
2. **Balance Beam → harder**: weights 1–5, a **limited tray** (e.g. two of each), par 3–4, and from Thursday on **two beams hung from one** (the bottom beam's weight counts on the top beam). Solver tests for every day of a year.
3. **This or That**: becomes a quick bonus round inside **Guess the Crowd** ("today's question + a This-or-That"), and its card goes. Fewer, fuller daily games.
4. **Guess the Crowd**: shows a provisional score straight away from the answers so far ("so far you're 6% off; final after 20"), so nobody waits.
5. **Pitch Match**: a **visual mode** (a waveform that moves while the tone plays) so it works with sound off; the how-to says so.
6. **Tug of Taps**: alternate-thumb tapping (left half then right half) instead of mashing one spot: a rhythm, less tiring, harder to cheat.
7. **Retire Luckiest Person; merge the two reaction duels** (D1): redirects, stats carried over, e2e for the redirect.

Each change: unit tests for the rules, an updated e2e script, how-to text, card demo if the look changed, re-rate.

## Part C: daily leaderboards (no accounts)

1. **Database**: a `scores` table in the private `app` schema: game, day, score, a random device id, optional nickname, created_at. One row per device per game per day (best kept). RLS on, no direct access; functions granted to anon only, as now:
   - `submit_score(game, day, score, device, nick)`: plausibility checks per game (within the game's possible range, e.g. no 0 ms reaction), one update per minute per device, nickname through the existing word filter.
   - `daily_board(game, day)`: top 50 and the total count.
   - `my_rank(game, day, device)`: rank and percentile.
2. **On the ticket**: "You're **#132 of 1,840** today, better than 93%", with a "See today's top 50" sheet; the side column shows the board on desktop.
3. **Cheating**: scores are sent by the browser, so a determined person can fake one. Mitigations: range checks, rate limits, minimum play time per game, and the board shows percentile first (a faker at #1 matters less). Documented as a known limit.
4. **Tests**: SQL tests against a scratch day (cleaned up after, as before) for ranges, rate limits, one row per device and the filter; e2e with stand-in functions for the ticket's rank line.

## Part D: new games (deeper, still quick to start)

Each meets the satisfying bar and adds Challenge where we're thin. Original designs on public puzzle genres.

1. **Dots & Boxes** (any time + online rooms): the pen-and-paper classic. Against the computer (easy, medium, hard: hard plays the long-chain rule) or friends by room link (reuses the room code). Unit tests: box completion, the extra turn, AI never gives away a box it doesn't have to on hard.
2. **Rule Stack** (daily): a 4×4 tile grid and 12 levels; each level adds a rule ("no two reds touching", "the corners add to 10", "every row has a circle") that can break your last answer. The day's 12 rules are generated so a solution exists; a solver proves it. Score = levels cleared, then time.
3. **Word Ladder** (daily): change one word into another one letter at a time, every step a real word; par is the shortest ladder. A bundled common-word list (loaded with the game, not in the shared bundle), filtered for rude words. Global English, no place names.
4. **Garden Path** (daily): draw one path through every square of the garden; numbered stones say how many times the path turns next to them. Generated with exactly one solution (solver-checked), easy on Monday, hard by Sunday.
5. **Untangle Lights** (daily): drag the lights until no wires cross; fewest moves vs par. The generator starts from a planar layout and scrambles it, so it is always solvable.

## Part E: accounts (later, only if Edwin chooses it)

- **Now (in Part C)**: "Move to another phone": a short code (or QR) that copies your stats, streaks and nickname to another browser; it expires after 10 minutes. Stored only briefly, with no personal data.
- **Later**: optional sign-in (email magic link) to sync across devices and keep weekly leagues with friends. Needs: a privacy policy update, a delete-my-account button, and the "no personal data" rule changed by Edwin. Not built in this plan.

## Part F: before going live (launch checklist)

- [ ] Real-phone test by a person (Android and iPhone; the last round found 7 bugs the tests missed).
- [ ] Privacy page: what's stored on the device, what's sent (counts, crowd answers, scores, nicknames), no cookies, no accounts.
- [ ] About page with how the daily games work, and the footer credit.
- [ ] Error reporting: browser errors logged (message and page only) through the existing event function, with a daily check.
- [ ] Abuse limits on every public function (votes, crowd answers, scores): per-device rate limits, tested.
- [ ] SEO: `sitemap.xml`, `robots.txt`, category pages, per-game descriptions (preview images exist).
- [ ] Installable on phones (web app manifest and icon; works offline for any-time games).
- [ ] Automated accessibility check (axe) on every page in e2e; fix anything serious.
- [ ] Lighthouse on home and three games: performance ≥ 90 on a mid phone.
- [ ] Domain decision (D7) and redirect from the vercel.app address.
- [ ] Design system republished with every changed component.

## Order and stop conditions

Parts **A → B → C → D → F** (E only if chosen). Each part ships and is logged before the next. After each part, re-rate the affected games with formula v2 in the log.

Stop if three pushes in a row fail after two fixes each (note at the top of the log), or if a step needs Edwin (a decision overridden, domain, real-phone test). In that case log it and carry on with the rest.

## Goal to paste

```
/goal Build docs/launch-plan.md part by part (A, B, C, D, then F; skip E): footer with "Made by edwinsm.me", skill categories and a desktop sidebar, rework the weak games, daily leaderboards without accounts, five new deeper games, and the launch checklist. Follow the decisions table unless I override one, test every change, ship and log each part, and follow the stop conditions.
```
