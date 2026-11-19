A game on the home page, like a cartridge: a band in the game colour showing a score in the game's own units, then the name, tagline and the player's status.

**Consumer provides** `title`, `tagline`, `href`, `color`, a `sample` score (0.04s, 243ms, Lv 12) with a `sampleLabel` saying whose it is: "Today" or "Your best" for the player's own result, "Example" before they have played. Never show a made-up number without the Example label, `daily`, and a `status` line built from the player's stats ("New today", "Played today · 3 day streak"); `done` marks a daily game already played today.

- Don't put an emoji or still picture on the band. Instead, pass a `demo`: a 140×72 looping scene of the game's key moment (one action and its result, 3–4 seconds), drawn with CSS in the game's own shapes, with `--line` for ink and `--paper` for white. The demo sits to the right of the score; the Daily or players pill moves above the score.
- Demos play only while the card is on screen (the page sets `data-playing` on the card), and with reduced motion each holds its key frame (`--still` on the scene). Every new game ships with its demo.
- Lay cards out in a grid with `space-3` gaps; they keep equal heights.

**Page transition.** Pass the game's slug as `transitionName`; the band and title morph into the game page's colour band and title in browsers that support cross-document view transitions.
