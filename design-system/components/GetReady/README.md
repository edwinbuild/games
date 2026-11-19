The 3-2-1 before anything timed: a flash of dots, a colour shown for two seconds, a path that lights up. It first scrolls the box it sits in fully on screen (or its top, if the box is taller than the screen) and waits for scrolling to stop, so a timed reveal never starts off-screen; then it counts down and calls `onDone`.

**Consumer provides** `onDone`, and optionally `from` (3 by default; 0 only makes sure the box is visible) and `step` (ms per number). Put it inside a positioned box: it overlays that box.

- Use it for every timed reveal, including after "Try again" from the result ticket.
- With reduced motion the numbers appear without the pop, and scrolling is instant.
