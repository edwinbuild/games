A game on the home page, like a cartridge: a band in the game colour showing a score in the game's own units, then the name, tagline and the player's status.

**Consumer provides** `title`, `tagline`, `href`, `color`, a `sample` score (0.04s, 243ms, Lv 12) with a `sampleLabel` saying whose it is: "Today" or "Your best" for the player's own result, "Example" before they have played. Never show a made-up number without the Example label, `daily`, and a `status` line built from the player's stats ("New today", "Played today · 3 day streak"); `done` marks a daily game already played today.

- Don't put an emoji or picture on the band; the sample score is the picture.
- Lay cards out in a grid with `space-3` gaps; they keep equal heights.
