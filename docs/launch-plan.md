# Pocket Fair: launch plan (fix, deepen, organise, go live)

Goal: before launch, make every game worth playing (rework or retire the shallow ones), add deeper games, give the site a clearer structure on phone and desktop (categories, desktop sidebar, a proper footer), add accounts (one username each, profile icons, friends), daily and friends leaderboards, and finish a launch checklist. Work goes part by part; each part ships to `main` with Vercel and CI green before the next starts, and is logged in `docs/overnight-log.md` under "Launch".

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
| D2 | Accounts / sign-in | **Yes (Edwin, 2026-11-19).** Sign in with **Google** or an **email link** (no passwords). Not signed in = **guest**: every game still works, progress stays on the device. Signing in keeps your guest progress. | Asked for: friends, one username each, profile icons. This replaces the old rule *no personal data in the database*: the only personal data is the sign-in email, kept by Supabase Auth, never shown to anyone, deleted with the account. |
| D2a | Usernames | **One per account, unique, changeable 5 times in total** (the first pick doesn't count). 3–16 letters, numbers or `_`, not case-sensitive (`Sam` = `sam`), through the word filter, reserved names blocked (admin, pocketfair, edwin, support…). A released name can't be taken by someone else for 30 days. | Asked for; the 30-day hold stops someone grabbing a friend's old name to impersonate them. |
| D2b | Profile icons | A set of **24 icons** drawn in the house style (animals, food, objects), each on any game colour. Signed-in players pick any; **6 more unlock** with streaks and milestones. Guests get a plain ticket icon. | Asked for; unlockable ones give a reason to come back. |
| D2c | Friends | Requests by **username**, **invite link** or **QR**. Accept, decline, remove, **block**. No free-text chat (nothing to moderate): only fixed reactions (👏 🔥 😮 😂) on a friend's result. | Asked for; chat would need moderation we can't do. |
| D3 | Leaderboards | Three tabs on every daily result: **Friends** (signed-in friends, today and this week), **Everyone** (top 50 by username; guests show as "Guest" with their icon) and **You** (rank and percentile: "better than 82% today"). Challenge links keep working for people without accounts. | Friends boards are what bring people back; percentile motivates everyone else. |
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

## Part B: rework the weak games (done)

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

## Part C: daily leaderboards (done, without accounts)

1. **Database**: a `scores` table in the private `app` schema: game, day, score, the user id (signed in) or a random device id (guest), created_at. One row per player per game per day (best kept). RLS on, no direct access; functions granted to anon only, as now:
   - `submit_score(game, day, score, device)`: plausibility checks per game (within the game's possible range, e.g. no 0 ms reaction), one update per minute per player.
   - `friends_board(game, day | week)`: you and your friends, ranked (signed in only).
   - `daily_board(game, day)`: top 50 and the total count.
   - `my_rank(game, day, device)`: rank and percentile.
2. **On the ticket**: "You're **#132 of 1,840** today, better than 93%", then the **Friends · Everyone · You** tabs (D3); the side column shows the board on desktop. Guests see Everyone and You, with a nudge to sign in for Friends.
3. **Cheating**: scores are sent by the browser, so a determined person can fake one. Mitigations: range checks, rate limits, minimum play time per game, and the board shows percentile first (a faker at #1 matters less). Documented as a known limit.
4. **Tests**: SQL tests against a scratch day (cleaned up after, as before) for ranges, rate limits, one row per device and the filter; e2e with stand-in functions for the ticket's rank line.

## Part D: new games (done: deeper, still quick to start)

Each meets the satisfying bar and adds Challenge where we're thin. Original designs on public puzzle genres.

1. **Dots & Boxes** (any time + online rooms): the pen-and-paper classic. Against the computer (easy, medium, hard: hard plays the long-chain rule) or friends by room link (reuses the room code). Unit tests: box completion, the extra turn, AI never gives away a box it doesn't have to on hard.
2. **Rule Stack** (daily): a 4×4 tile grid and 12 levels; each level adds a rule ("no two reds touching", "the corners add to 10", "every row has a circle") that can break your last answer. The day's 12 rules are generated so a solution exists; a solver proves it. Score = levels cleared, then time.
3. **Word Ladder** (daily): change one word into another one letter at a time, every step a real word; par is the shortest ladder. A bundled common-word list (loaded with the game, not in the shared bundle), filtered for rude words. Global English, no place names.
4. **Garden Path** (daily): draw one path through every square of the garden; numbered stones say how many times the path turns next to them. Generated with exactly one solution (solver-checked), easy on Monday, hard by Sunday.
5. **Untangle Lights** (daily): drag the lights until no wires cross; fewest moves vs par. The generator starts from a planar layout and scrambles it, so it is always solvable.

## Part E: accounts, usernames, profile icons, friends

Built on Supabase Auth (already the database). Everything still works as a guest.

1. **Sign in**: Google or an email link, from a "Sign in" key in the top bar and on every result ticket ("Sign in to keep your streak on every device and play with friends"). Signing out returns you to guest on that device.
2. **Guest → account**: on first sign-in, the guest's local stats, streaks and today's results are **merged into the account** (best of both, never lost). Tested with a guest who has a 5-day streak.
3. **Username** (D2a): chosen right after the first sign-in, with a live "available ✓" check. Profile shows "Changes left: 5". A change asks to confirm and is final. Server-side checks: unique (case-insensitive), the format, the word filter, reserved names, the 30-day hold, and the change count (enforced in the database, not just the page).
4. **Profile icon** (D2b): a picker sheet with the 24 icons × game colours; locked ones show how to unlock them ("Play 7 days in a row"). The icon shows in the top bar, on boards, in online rooms (instead of "Coral"/"Aqua") and on friends' lists.
5. **Profile page** (`/me/`): icon, username (+ change), streaks and bests for every game, unlocked icons, friends, sign out, **download my data** and **delete my account** (removes everything, frees the username after the 30-day hold).
6. **Friends** (D2c):
   - Add by username search (exact match, so people can't be browsed), an invite link, or a QR on the profile page.
   - Requests: send, accept, decline, cancel; at most 30 pending sent; 20 new requests a day.
   - Remove and **block** (a blocked person can't find you, send requests or see you on boards).
   - Friends list with icon, username, today's games played and current streak.
   - On a daily result: your friends' results for that game today, and fixed reactions.
   - "Play with a friend" opens an online room and sends them a link (no push notifications yet: the link is shared the usual way, and the friend sees an in-app badge next time).
7. **Sync**: signed-in stats live in the database and are cached on the device; the page works offline and syncs when back online. Two phones playing the same day keep the best result.
8. **Database** (private `app` schema, RLS on, access only through functions as now, now checking `auth.uid()`): `profiles` (user id, username, name changes used, icon, colour, created), `username_holds`, `friendships` (pair, status, requested by), `blocks`, `stats` and `daily_results` per user, `reactions`. Unit and SQL tests for every rule: 6th rename refused, duplicate name refused in any letter case, a held name refused for 30 days, blocked users invisible, 31st pending request refused.
9. **Safety and privacy**: a 13+ notice at sign-in; a "report username" link (sends to an admin list, reviewed by Edwin); the privacy page explains exactly what's stored; nothing about a player is visible to non-friends except username, icon and leaderboard scores.
10. **Design system**: `Avatar` (icon + colour, sizes), `ProfileChip`, `FriendRow`, `Sheet` (bottom sheet on phones, dialog on desktop), `SignInButton`, published with previews.

## Part F: before going live (launch checklist; done and shipped, goal closed by Edwin on 2026-11-19 with three follow-ups)

- [ ] (follow-up for Edwin) Real-phone test by a person (Android and iPhone; the last round found 7 bugs the tests missed).
- [x] Privacy page (done, without the account items; download and delete buttons): what's stored on the device and in the database (sign-in email, username, icon, friends, results, crowd answers), who can see what, no ads, no tracking cookies (only the sign-in session), how to download or delete everything.
- [ ] (not needed: Part E skipped) Sign-in providers set up by Edwin: Google OAuth client and Supabase redirect URLs for the live domain (needs his Google account).
- [ ] (not needed: Part E skipped) Email sign-in links come from a proper sender (custom SMTP, e.g. Resend) so they don't land in spam.
- [x] (boards only; no friends without accounts) Load test the friends and board functions with a few thousand fake rows (then remove them).
- [x] About page with how the daily games work, and the footer credit.
- [x] Error reporting (own function `log_error`, listed on the stats page): browser errors logged (message and page only) through the existing event function, with a daily check.
- [x] Abuse limits on every public function (votes, crowd answers, scores): per-device rate limits, tested.
- [x] SEO: `sitemap.xml`, `robots.txt`, category pages, per-game descriptions (preview images exist).
- [x] Installable on phones (web app manifest and icon; works offline for any-time games).
- [x] Automated accessibility check (own axe-style check; axe itself needs an install approval) on every page in e2e; fix anything serious.
- [x] Lighthouse-style metrics (scripts/perf.cjs) on home and three games: performance ≥ 90 on a mid phone.
- [ ] (follow-up for Edwin) Domain decision (D7) and redirect from the vercel.app address.
- [x] Design system republished with every changed component.

## Order and stop conditions

Parts **A → B → E → C → D → F**: accounts (E) come before leaderboards (C) so boards use usernames and friends from the start. Each part ships and is logged before the next. After each part, re-rate the affected games with formula v2 in the log.

Stop if three pushes in a row fail after two fixes each (note at the top of the log), or if a step needs Edwin (a decision overridden, the Google sign-in setup in Google Cloud and Supabase, domain, real-phone test). In that case log it and carry on with the rest.

## Goal to paste

```
/goal Build docs/launch-plan.md part by part (A, B, E, C, D, then F): footer with "Made by edwinsm.me", skill categories and a desktop sidebar, rework the weak games, sign-in with one username each (5 changes), profile icons and friends with guests still able to play, daily and friends leaderboards, five new deeper games, and the launch checklist. Follow the decisions table unless I override one, test every change, ship and log each part, and follow the stop conditions.
```
