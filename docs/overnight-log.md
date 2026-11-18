# Overnight build log

One line per game: date, game, commit, what was tested, what is left.

- 2026-11-18 · Step 0 · 7061ba1 · e2e suite and per-page budget in the repo, players field, Play with friends section, 8 colour tokens, multiplayer kit (PlayerChip, SplitStage, RoomCode, Lobby, ScoreStrip), room helper. Realtime checked in a browser against the project: presence and broadcast work with the publishable key. Design system published.
- 2026-11-18 · 1 Tap Duel · 0b3e179 · rules unit-tested (early, grace, tie, first to three); e2e match with an early tap in light and dark; phone, desktop and landscape screenshots checked; live page 200, card on home. Also fixed: landscape phones use one column until a result exists.
- 2026-11-18 · 2 This or That · (this commit) · migration this_or_that_votes (votes table, vote and split functions, all ten new slugs registered for counting), tested as anon and rolled back; 139 questions, no repeat for 139 days (unit test); e2e with a stand-in vote endpoint so tests never add votes; phone and desktop screenshots checked.
- 2026-11-18 · 2 This or That · 59eef70 · shipped (see above). Follow-up migration votes_anon_only removes signed-in access to vote and split.
- 2026-11-18 · 3 Color Recall · (this commit) · CIEDE2000 checked against the published Sharma test data (7 pairs); e2e plays two tries of three colours and checks the target is hidden while matching; phone and desktop screenshots checked.
- 2026-11-18 · 3 Color Recall · baa0af2 · shipped (see above).
- 2026-11-18 · 4 Count Flash · (this commit) · dot placement unit-tested (exact count, inside the field, no overlaps at 12, 75 and 300 dots); e2e checks the dots hide after the flash and that nothing overflows while guessing. Fixed a phone overflow from the guess field's default width found in screenshots.
- 2026-11-18 · 4 Count Flash · d0eb9d9 · shipped (see above).
- 2026-11-18 · 5 Tug of Taps · (this commit) · rope rules unit-tested; e2e taps both halves at once with different pointer ids (all counted) and checks a tap before Go is ignored; phone and desktop screenshots checked.
- 2026-11-18 · 5 Tug of Taps · cafd4ba · shipped (see above).
- 2026-11-18 · 6 Angle Eye · (this commit) · four round types with unit-tested scorers (a test caught a too-harsh centre score, now 1 point per 10% of the radius); e2e drags and uses arrow keys; screenshots at 360px caught ten result tiles overflowing a phone: AttemptTiles now shrinks and wraps beyond six (design system note added). The e2e overflow check now measures against the real screen width, because phone emulation zooms out and hid the problem; the full suite passes with the stricter check.
