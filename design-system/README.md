Pocket Fair is a site of small original browser games that finish in under two minutes, play on any phone with no sign-up, and end on a result worth posting. The look is an **arcade ticket counter**: every result prints as a perforated ticket, every button is a chunky key that drops when pressed, and every game owns one bright colour. Around the games the site is black and white: near-white in light mode, near-black in dark, with black or white `primary` keys. Scores are set in a scoreboard monospace.

Pocket Fair is the working name: a fairground of small stalls you can play alone or with friends. The mark (an admit-one ticket) and the name in the top bar change together if the name changes.

## Voice and copy

- Write like a friend explaining a game in one breath. Short, plain, second person: "Tap the moment the panel turns green."
- One line of instructions per game, shown above the stage. If it needs two lines, the game is too complicated.
- Keys say exactly what happens: **Start**, **Stop**, **Lock in**, **Play again**, **Roll my luck**. Never "Submit" or "OK".
- Results are concrete and in the game's own units: "Late by 0.04s", "243 ms average", "Level 12", "Luckier than 93% of rolls".
- Verdicts can be a little cheeky ("Maybe stay in bed."), never mean, never about the player's intelligence.
- Sentence case everywhere except `eyebrow` labels, which are uppercase.
- Numbers: decimals with a full stop (7.30s), milliseconds as "243 ms", big counts with commas (100,000 players).
- Emoji appear **only inside share text** (⏱️ 🟩🟨🟥 🔥), because that is how results travel on WhatsApp and X. Never use emoji as icons, bullets or decoration in the UI.
- The audience is worldwide: write in plain international English, with no country-specific slang, trivia or references a player abroad wouldn't get.

## Colour

- The page sits on `canvas`. Objects people look at or touch (the stage, tickets, cards, keys) sit on `surface` with a `border-edge` outline in `edge`.
- Body text is `ink`; instructions, labels and taglines are `ink-muted`. Both pass 5:1 on every surface in both themes.
- `primary` is the brand colour: black in light mode, white in dark (`ink`). It fills primary keys, the Daily pill, a switched-on chip, the brand mark, and the ticket stub when a game has no colour of its own; text on it is `on-primary`. Colour on the site comes only from the games.
- Each game owns one game colour and uses it for its card band, its ticket stub and its stage fills:

  | Game | Colour token |
  |---|---|
  | Blind Timer | `tangerine` |
  | Reaction Chain | `mint` |
  | Odd One Out | `grape` |
  | Memory Path | `sky` |
  | Pitch Match | `bubblegum` |
  | Luckiest Person | `lagoon` |
  | Stack Tower | `chili` |
  | Tap Duel | `coral` |
  | This or That | `aqua` |
  | Color Recall | `orchid` |
  | Count Flash | `sand` |
  | Tug of Taps | `lime` |
  | Angle Eye | `periwinkle` |
  | Reaction Duel Online | `peach` |
  | Flip Grid | `pistachio` |
  | Spot Race Online | `grape` (shares Odd One Out's colour) |

- Text on any game colour or on `ticket` is always `on-fill`, which stays dark in both themes. Never put white text on a game colour.
- Game colours are fills, never text colours: on `surface` they fall below 3:1. Always outline a fill with `edge`.
- `success` and `danger` mark outcomes in text (a perfect stop, a wrong tap). They differ by hue only, so always pair them with a word or a glyph (✓, ✕, "Too early!").
- Keyboard focus is a 3px solid `focus` ring (`ink`) with a 2px offset on every interactive element.
- Light is the default theme; dark follows the phone's setting. Both are designed: game colours and `on-fill` are identical in both, the neutrals flip.

## Type

- `display` (Bricolage Grotesque) is for names: `site-title`, `game-title`, `card-title` and the `result` headline on a ticket. Nothing else.
- `mono` (JetBrains Mono) is the scoreboard: `score-xl` for the live number in a game, `score` for targets and counters, `share` for the share-text preview. Always with tabular figures so timers don't jitter.
- `body` (Figtree) is everything else: `body` for instructions and how-to-play text, `small` for labels and countdowns, `key` for button text, `eyebrow` for uppercase labels.
- One `game-title` per page. Keep running text under 65 characters a line.

## Layout by device

- **Phones (under 1000px wide):** one column, at most 560px, side gutter at least `space-4`. The game first, then its ticket below; the ticket scrolls itself into view when it prints. Everything must work one-handed at 360px.
- **Wide screens (1000px and up):** the page widens to 1120px. The game takes the left column; the right column shows how to play and the player's record, and the ticket replaces them when it prints, so no scrolling is needed. The home page shows three cards per row.
- **Landscape phones:** the same two columns as wide screens, with the instruction line hidden to save height.
- **Mouse and keyboard:** Space or Enter triggers the game's main action, number keys pick cards; key hints (`Button` `hint`) appear only on devices with a mouse. Touch devices get no hints and full-size targets.
- **Theme:** Auto follows the device; the footer's `Segmented` switch can fix Light or Dark, applied before the page draws.

## Shape, space and depth

- Tap targets are at least 48px tall (`Button` md); the main action in a game is a `size="lg"` key (64px) spanning the column.
- Radii: `radius-lg` for the stage, tickets and cards; `radius-md` for keys and grid cells; `radius-sm` for attempt tiles; `radius-pill` for pills.
- Depth is a **hard offset shadow, never a blur**. Keys sit on `shadow-key` and drop 4px onto `shadow-key-pressed` when pressed; tickets and cards sit on `shadow-card`. This is the one bold move in the system: don't add gradients, glows or blurred shadows anywhere.
- Spacing steps: `space-2` between keys, `space-3` between cards and inside ticket sections, `space-5` inside the stage and ticket, `space-6` between page sections.

## Sound and vibration

- Sound is off until the player turns it on with the `ToggleChip` in the top bar; the setting is shared by every game. Pitch Match is the one exception, because listening is the game.
- Every game uses the same feedback sounds from `feel`: tap, good move, mistake and the result printing (with a paper click). Satisfying games add `pop(n)` and `chime(n)`, whose pitch climbs with a chain or streak, `pour`, `click` for a piece snapping in, and `thud` for a landing. Vibration uses the named patterns `light`, `medium` and `success`. A new personal best shows a `Burst` on the ticket headline. Never play a sound that gives a timing advantage (Reaction Chain makes no sound when the panel turns green).
- Vibration is a short tick on the same moments where the phone supports it, and is skipped with reduced motion.

## Motion

Every animation answers something the player did; nothing moves just to decorate.

- Home cards play a short looping demo of each game on their band while on screen (see `GameCard`); with reduced motion they hold a still key frame.
- Keys press down in `duration-press` (60ms). On devices with a mouse, cards lift 3px and keys 1px toward the pointer.
- Opening a game from its card: the card's colour band grows into the game page's band and the title moves into place (cross-document view transition, about 340ms). Browsers without it load the page normally.
- A result ticket prints: revealed from the top down in about 460ms, and the number in its headline counts up to the result.
- A new Odd One Out level settles in (180ms) so progress is visible.
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

## Game stages: what each game may change

Everything around play is shared; inside its `Stage` each game may have its own world.

- **Shared, never changed per game:** `TopBar`, the title and instruction line, `ResultTicket`, sharing, streaks, `PlayNext`, keys, the focus ring, tap sizes and the contrast rules in this book.
- **Free inside the stage:** background, illustration, texture, animation, sound, board layout, physics and in-game lettering. A game may add its own colours there, as long as text keeps 4.5:1 and anything the player acts on keeps 3:1 against what is behind it.
- The game colour still marks the game everywhere outside the stage: its card band, ticket stub and main key.
- Respect reduced motion inside the stage too, and never put sound before the first tap.

## Multiplayer

Multiplayer games use the same shell plus shared multiplayer parts, so players learn rooms and turns once.

- First come **same-phone** games (two thumbs on one screen, or pass and play), which need no backend. Each player's half of the screen is a `Stage` filled with that player's colour, rotated to face them.
- **Player colours** are a fixed set of eight seats, each a colour plus a shape marker (circle, square, triangle, diamond, star, hexagon, plus, pentagon), so players are never told apart by hue alone.
- Online rooms use `RoomCode` (code plus invite link), `Lobby` (players, ready, host first), and `ScoreStrip` during play; the result ticket offers Rematch in the same room.
- Same-phone games use `SplitStage`; each player is a `PlayerChip` identity (P1 Coral circle, P2 Aqua square, P3 Lime triangle, P4 Orchid diamond; online rooms of up to eight add Sky star, Sand hexagon, Peach plus and Periwinkle pentagon).
- The result ticket of a multiplayer game names the winner and the score line (for example "Blue wins 3–2"); its share text never needs the other player's name.

## Challenges

Every result ticket's share link is a challenge: it carries the puzzle and the scores so far, so a friend who opens it plays exactly the same puzzle.

- A friend arriving from a link sees a `ChallengeBanner` above the stage: who to beat and their score, in one sentence.
- After playing, the ticket's `board` slot shows a `ChallengeBoard` of everyone on that link (at most 8), best first, the player's row in `primary`.
- The nickname is optional (`TextField`, kept in the browser). Anonymous players appear as "A friend"; never ask for anything else.
- Share text for a challenge ends with "Same puzzle. Beat me:" (first player) or "Same puzzle. Your turn:" (when others have played), followed by the link.

## Iconography

- There is no icon set. Controls are labelled with words; the only glyphs are ✓ ✕ ~ in attempt tiles and → on Play next.
- The brand mark is the `BrandMark` ticket, drawn in `primary` with an `edge` outline. It is a placeholder that will be redrawn with the real name.
- Game cards show a **score** in the game's units on their colour band (0.04s, 243ms, Lv 12) instead of a picture or emoji: the player's own result once they have one, otherwise an example clearly labelled "Example".
