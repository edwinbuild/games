# Overnight build log

One line per game: date, game, commit, what was tested, what is left.

- 2026-11-18 · Step 0 · 7061ba1 · e2e suite and per-page budget in the repo, players field, Play with friends section, 8 colour tokens, multiplayer kit (PlayerChip, SplitStage, RoomCode, Lobby, ScoreStrip), room helper. Realtime checked in a browser against the project: presence and broadcast work with the publishable key. Design system published.
- 2026-11-18 · 1 Tap Duel · 0b3e179 · rules unit-tested (early, grace, tie, first to three); e2e match with an early tap in light and dark; phone, desktop and landscape screenshots checked; live page 200, card on home. Also fixed: landscape phones use one column until a result exists.
- 2026-11-18 · 2 This or That · (this commit) · migration this_or_that_votes (votes table, vote and split functions, all ten new slugs registered for counting), tested as anon and rolled back; 139 questions, no repeat for 139 days (unit test); e2e with a stand-in vote endpoint so tests never add votes; phone and desktop screenshots checked.
