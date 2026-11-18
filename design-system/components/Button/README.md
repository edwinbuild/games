A chunky key that drops 4px onto its shadow when pressed; the only kind of button in the system.

**Use** `primary` (the default, filled with `primary`, black in light and white in dark, or with a game colour via `color`) for the one main action, `secondary` for a second choice, `ghost` for a quiet text link such as practice mode, and `whatsapp` / `x` only inside share rows.

**The main action of a game** is `size="lg"` with `block`, filled with that game's colour: Start, Stop, Roll my luck.

**Consumer provides** the label (a verb that says what happens), `onClick` or `href`, and optionally `color` as a token name.

- Do keep labels to one or two words.
- Don't put two primary keys side by side; make the second `secondary`.
- Don't use a key for navigation inside a paragraph; use a link.
- Game controls that need exact timing (Stop, a reaction tap) should listen to `onPointerDown`, not `onClick`, and keep `onClick` for the keyboard.
