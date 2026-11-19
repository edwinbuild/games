A row of toggle chips where exactly one is on: the home page's All, Daily, Any time and With friends. Each chip can carry a small count. The chosen chip is filled in `ink`; the rest are `surface` keys with the 3px drop of a key.

**Consumer provides** a group `label` for screen readers, the `options` (`value`, `label`, optional `count`), the current `value` and `onChange`. Remembering the choice is the consumer's job (the home page keeps it in this browser).

- On narrow phones the row scrolls sideways rather than wrapping, and the chosen chip is scrolled into view, so a remembered filter is never hidden off the edge.
- Each chip is 44px tall. Chips are `aria-pressed` buttons in a `role="group"`.
