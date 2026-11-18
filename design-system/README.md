Quick Games is a site of small original browser games that finish in under two minutes, play on any phone with no sign-up, and end on a result worth posting. The look is an **arcade ticket counter**: every result prints as a perforated ticket, every button is a chunky key that drops when pressed, and every game owns one bright colour. Scores are set in a scoreboard monospace.

The site name is a placeholder until a real name is picked. The mark (an admit-one ticket) and the name in the top bar change together.

## Voice and copy

- Write like a friend explaining a game in one breath. Short, plain, second person: "Tap the moment the panel turns green."
- One line of instructions per game, shown above the stage. If it needs two lines, the game is too complicated.
- Keys say exactly what happens: **Start**, **Stop**, **Lock in**, **Play again**, **Roll my luck**. Never "Submit" or "OK".
- Results are concrete and in the game's own units: "Late by 0.04s", "243 ms average", "Level 12", "Luckier than 93% of rolls".
- Verdicts can be a little cheeky ("Maybe stay in bed."), never mean, never about the player's intelligence.
- Sentence case everywhere except `eyebrow` labels, which are uppercase.
- Numbers: decimals with a full stop (7.30s), milliseconds as "243 ms", Indian grouping for big counts once they appear (1,00,000 players).
- Emoji appear **only inside share text** (⏱️ 🟩🟨🟥 🔥), because that is how results travel on WhatsApp and X. Never use emoji as icons, bullets or decoration in the UI.
- Kerala and India games may use Malayalam words; the `body` stack falls back to Noto Sans Malayalam.

## Colour

- The page sits on `canvas`. Objects people look at or touch (the stage, tickets, cards, keys) sit on `surface` with a `border-edge` outline in `edge`.
- Body text is `ink`; instructions, labels and taglines are `ink-muted`. Both pass 5:1 on every surface in both themes.
- `ticket` (warm yellow) is the brand colour: primary keys, the Daily pill, the stub of a ticket when the game has no colour of its own.
- Each game owns one game colour and uses it for its card band, its ticket stub and its stage fills:

  | Game | Colour token |
  |---|---|
  | Blind Timer | `tangerine` |
  | Reaction Chain | `mint` |
  | Odd One Out | `grape` |
  | Memory Path | `sky` |
  | Pitch Match | `bubblegum` |
  | Luckiest Person | `lagoon` |
  | Next new game | `chili` |

- Text on any game colour or on `ticket` is always `on-fill`, which stays dark in both themes. Never put white text on a game colour.
- Game colours are fills, never text colours: on `surface` they fall below 3:1. Always outline a fill with `edge`.
- `success` and `danger` mark outcomes in text (a perfect stop, a wrong tap). They differ by hue only, so always pair them with a word or a glyph (✓, ✕, "Too early!").
- Keyboard focus is a 3px solid `focus` ring with a 2px offset on every interactive element.
- Light is the default theme; dark follows the phone's setting. Both are designed: game colours and `on-fill` are identical in both, the neutrals flip.

## Type

- `display` (Bricolage Grotesque) is for names: `site-title`, `game-title`, `card-title` and the `result` headline on a ticket. Nothing else.
- `mono` (JetBrains Mono) is the scoreboard: `score-xl` for the live number in a game, `score` for targets and counters, `share` for the share-text preview. Always with tabular figures so timers don't jitter.
- `body` (Figtree) is everything else: `body` for instructions and how-to-play text, `small` for labels and countdowns, `key` for button text, `eyebrow` for uppercase labels.
- One `game-title` per page. Keep running text under 65 characters a line.

## Shape, space and depth

- One column, at most 560px wide, with a side gutter of at least `space-4`. Phone first: everything must work one-handed at 360px.
- Tap targets are at least 48px tall (`Button` md); the main action in a game is a `size="lg"` key (64px) spanning the column.
- Radii: `radius-lg` for the stage, tickets and cards; `radius-md` for keys and grid cells; `radius-sm` for attempt tiles; `radius-pill` for pills.
- Depth is a **hard offset shadow, never a blur**. Keys sit on `shadow-key` and drop 4px onto `shadow-key-pressed` when pressed; tickets and cards sit on `shadow-card`. This is the one bold move in the system: don't add gradients, glows or blurred shadows anywhere.
- Spacing steps: `space-2` between keys, `space-3` between cards and inside ticket sections, `space-5` inside the stage and ticket, `space-6` between page sections.

## Motion

- Keys press down in `duration-press` (60ms). A result ticket prints in once, dropping 8px over `duration-reveal` (240ms).
- Game feedback (a cell flashing, the panel turning green) is instant: never ease a state that the player is reacting to.
- With reduced motion, the ticket appears without moving; game timing is unchanged.

## The result ticket

Every game ends on a `ResultTicket`. In order:

1. Stub, in the game colour: the game name and the stamp (`#12` for a daily puzzle after launch, the date before it).
2. Perforation.
3. `result` headline in the game's units, then one `ink-muted` detail line (target, best, streak).
4. The share text, shown exactly as it will be pasted, in `share` mono on `surface-sunken`. It never gives away the answer.
5. Share keys: Share (phone share sheet, when available), WhatsApp, X, Copy.
6. Then, depending on the game: **Play again** (score games), the `Countdown` (daily games), a `ghost` link for practice, and `PlayNext`.

Share text format: first line `<emoji> <Game> <stamp>`, then one or two lines of result, then the link (added automatically).

## Iconography

- There is no icon set. Controls are labelled with words; the only glyphs are ✓ ✕ ~ in attempt tiles and → on Play next.
- The brand mark is the `BrandMark` ticket, drawn in `ticket` with an `edge` outline. It is a placeholder that will be redrawn with the real name.
- Game cards show a **sample score** in the game's units on their colour band (07.30, 243ms, Lv 12) instead of a picture or emoji.
