Same-phone play: the screen is split into one pressable half per player. With two players on a phone the top half is turned around so each player reads their own side; on wide screens and landscape phones the halves sit side by side, upright.

**Consumer provides** `halves` (content, label, optional colour token; defaults to the player colours) and `onPress(half)`, called on pointer down so two fingers on two halves both count.

- Keep each half's content to one big word or number.
- Offer keyboard keys on desktop (A and L) with `hint`s.
