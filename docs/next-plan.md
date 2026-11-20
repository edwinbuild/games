# Next plan: community, admin, more games (v1.1 → v1.3)

Written 2026-11-20 after Edwin asked for: new games, upvotes and downvotes, comments, auto play / auto replay, play counts, players online, an admin page locked with a PIN, and anything else worth adding. Each part ships and is logged on its own, like the launch plan. Site version goes up with each part (G = 1.1.0, H = 1.2.0, …).

## Where things stand

- 36 games with cards, daily boards, accounts and friends (v1.0.0).
- Traffic is still tiny: 87 finished games since counting began (2026-11-18), no accounts yet. So anything public that shows numbers ("12 playing now", "340 plays") stays hidden until the number looks healthy, or the site advertises that it's empty.
- A private stats page (`/stats/`, behind a key) already shows plays, finish and share rates, errors and reported usernames. The admin page replaces it.

## Decisions

| # | Topic | Decision | Why |
|---|---|---|---|
| N1 | Admin lock | **Edwin's signed-in account + the PIN.** The PIN is checked in the database (stored only as a salted hash, never in the code or this repo); it opens an admin session for 8 hours on that device. 5 wrong tries lock the PIN for 15 minutes. The admin's account id is the only one allowed (set once, by hand, in the database). | A 5-digit PIN on its own can be guessed (100,000 tries) and its lockout could be used to lock Edwin out. Needing his account too makes the PIN a second lock, not the only one. The PIN was shared in chat, so the admin page offers "Change PIN". |
| N2 | Votes | 👍 / 👎 on every result ticket and game page. One vote per player per game (account, or device for guests), changeable. **Public: only "92% liked", from 20 votes up; never the 👎 count.** Admin sees both. | Thumbs down in public reads as harsh and invites brigading; the percentage carries the signal. |
| N3 | Comments | **Signed-in players only**, 280 characters, no links, word filter, 1 a minute and 10 a day. Report button; 3 reports hide a comment until Edwin looks. **Admin switch: off / after review / on** (starts at "after review": nothing shows until approved). Newest and most-liked sorting; like a comment (no dislikes). | Free text is the one thing on the site that needs moderation. Starting with "after review" keeps it safe while traffic is small; Edwin can open it up from the admin page. |
| N4 | Auto play | **Yes, three ways, all optional:** (1) **Today's run**: a "Play all today's puzzles" button on home plays the daily games one after another, with a 5-second "Next: Word Ladder" card you can stop; (2) **Auto replay** for arcade games (Stack Tower, Orbit Drop, Chain Pop…): "Again in 3…" after a result, cancel with a tap; (3) a setting in your profile to turn either off. Off for nothing the player didn't ask for: the result ticket always shows first, so sharing is never skipped. | Auto-navigating after every game would skip the share moment and annoy people who wanted to look at their result. A run you start yourself is the good version of the idea. |
| N5 | Play counts | "1.2k plays" on cards and game pages from finishes (all time), shown once a game passes 100. Counted hourly, cached for an hour. | Social proof, but only once it helps. |
| N6 | Players online | A light heartbeat: each open page says "still here" once a minute (no account, a random tab id, kept 3 minutes). Home shows "38 playing now" from 5 up; game pages show "6 playing this game" from 3 up. Admin always sees the exact numbers. Not via realtime connections: the database plan allows ~200 at once, which online rooms need. | Cheap, private, and doesn't eat the realtime limit. |
| N7 | Game switches | The admin page can hide a game (its page says "Back soon"), mark one **New** or **Featured** (pinned top of home), and turn online rooms off site-wide. Pages read a small site settings file, cached on the device and refreshed in the background, so nothing waits for it. | What Edwin asked for ("switch of a game"), without slowing pages down. |

## Part G (v1.1): admin page

1. **Lock** (N1): `/admin/` (not linked, kept out of search). Sign in → PIN pad → admin session. Every admin function in the database checks the session and the account; wrong PINs counted and locked out. Audit log of every admin action (who, what, when).
2. **Dashboard:** players online now, plays today / 7 days / all time, finish and share rates by game, new accounts, daily boards' sizes, likes % per game, errors (last 7 days), reports waiting. Sparkline per game for 14 days.
3. **Games:** for each game: on/off, New, Featured, play count, likes %, finish rate; preview today's and tomorrow's daily puzzle; **re-roll today's puzzle** if one is broken (warns that early players saw the old one).
4. **Site:** announcement banner (text, link, start and end time), maintenance mode (every page shows a note, games still load), online rooms on/off, sign-ups on/off, comments mode (N3), auto play defaults (N4), counters on/off and thresholds (N5, N6).
5. **Moderation:** comments queue (approve, hide, delete), reported usernames (dismiss, force a rename, ban), banned players (can't comment, hidden from boards; can still play), remove a board score (cheating), edit the word filter and reserved names.
6. **Players:** find by exact username → joined date, games played, friends count, reports, sign-in email shown masked (`s***@gmail.com`) with a "reveal" that's logged; reset username changes, ban, delete account.
7. **Security settings:** change PIN, sign out all admin sessions, see the last 20 admin sign-ins.
8. Tests: database rules in rolled-back transactions (wrong PIN lockout, other accounts refused, every admin function refused without a session); e2e with stand-ins for each screen. The old `/stats/` page redirects to `/admin/`.

## Part H (v1.2): votes, comments, counts, online

1. **Votes** (N2): thumbs on the ticket ("Did you enjoy it?") and on the game page; likes % on cards once there are 20 votes; one per player per game.
2. **Comments** (N3): under each game's how-to: list (newest / most liked), write box for signed-in players, like, report, your own comment deletable; held-for-review note while in review mode.
3. **Play counts** (N5) and **players online** (N6) with thresholds; both switchable from the admin page.
4. Privacy page and About updated (what's stored for votes, comments, heartbeat).
5. Tests: limits (one vote, comment rate, length, links refused, filter), report threshold hides, banned players can't comment; e2e with stand-ins.

## Part I (v1.3): auto play and quality of life

1. **Today's run** and **auto replay** (N4), with the profile setting.
2. **Archive:** play past daily puzzles (any date since launch), not ranked and not on boards: good for new players and for streak-breakers.
3. **Hints** for the daily logic games (Garden Path, Rule Stack, Untangle, Word Ladder): one hint shows a correct next step; using it marks the result "with a hint" on the ticket and keeps it off the board.
4. **Streak freeze:** one missed day a week doesn't break a streak (shown as ❄️ on that day).
5. **Share as a picture:** the result ticket as an image (for apps that don't show link previews).
6. **Colour-blind check** of every game, plus shapes wherever colour matters (most already have them).

## Part J: new games (pick 3 to 5; ratings are formula v2 guesses)

| Game | Kind | What it is | Guess |
|---|---|---|---|
| **Tilt** | Logic, daily | A small board of marbles and holes. Tilt it (↑ ↓ ← →): every marble slides until it hits a wall. Get each marble into its matching hole in as few tilts as you can; par is the solver's best. Easy on Monday, harder by Sunday. | 72 |
| **Spot the Change** | Memory / eye, any time + daily | A busy little scene flashes, blanks for a moment, comes back with one thing changed. Tap what changed. Ten rounds, faster each time. | 66 |
| **Sum Path** | Logic, daily | A grid of numbers. Draw one path from the top-left that adds up to exactly the target, using each square at most once. Fewest squares beats par; a second target appears for the expert line. | 68 |
| **Echo** | Timing / memory, any time | Hear and see a rhythm of taps (2–3 pads), then tap it back. Each round adds one beat; timing within 80 ms counts as on beat. | 64 |
| **Letter Race** | Words, online 2–8 | Everyone gets the same 7 letters and 60 seconds to make as many words as they can; longer words score more; words only you found score double. Needs a bigger word list (3–7 letters, written by hand, filtered), loaded only with the game. | 70 |
| **Fold** | Eye, daily | A paper shape is folded twice along dotted lines and a hole is punched. Which picture shows it unfolded? Five rounds a day, harder each round. | 63 |

My order: **Tilt, Sum Path, Letter Race** first (the deepest, and Letter Race gives Words a second game plus a new online game), then Spot the Change and Echo. Fold if you want a sixth.

## Anything else worth adding (not in a part yet)

- **Weekly challenge:** one game a week with its own board and a small icon for the top 10.
- **Notifications** (later, opt-in): "Kai reacted to your result", "a new daily is ready". Needs web push; worth it once there are friends to notify.
- **Domain:** a real name before any promotion (still on vercel.app).
- **Proper email sender** and **Google sign-in** (both waiting on Edwin), and the QR code for invite links.

## Order and stop conditions

**G → H → I → J.** The admin page comes first because votes and comments need moderation from day one. Each part: build, test (database rules in rolled-back transactions, e2e with stand-ins, the full suite), ship, log, bump the version. Stop and log if a step needs Edwin (his account id for the admin lock, the PIN change, approving a migration) and carry on with the rest.

## Goal to paste

```
/goal Build docs/next-plan.md part by part (G, H, I, then J with Tilt, Sum Path and Letter Race): an admin page locked to my account and PIN, votes and comments with moderation, play counts and players online, auto play (today's run, auto replay), archive, hints, streak freeze, share as picture, and three new games. Follow the decisions table unless I override one, test every change, ship and log each part with a version bump, and follow the stop conditions.
```
