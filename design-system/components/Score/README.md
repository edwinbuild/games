A scoreboard number in `mono` with tabular figures, and an optional `eyebrow` label above it.

`size="xl"` (`score-xl`) is the one live number of a game: the running timer, the roll, the reaction time. `size="md"` (`score`) is for targets, levels and counters. `tone="hidden"` dims a number the player must not read (Blind Timer after the first second).

**Consumer provides** the value already formatted in the game's units.

- `tone="accent"` with `accentColor` is only for a number on a `Stage` filled with a darker colour where it reaches 3:1. Game colours on `surface` or `canvas` don't, so keep numbers in `ink` there.
