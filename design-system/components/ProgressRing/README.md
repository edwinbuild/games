A small ring that fills to `value / max`, with the count in the middle: the home page's "7 of 19 daily games played today". The fill draws in once on load; when the ring is full it turns `mint` and shows a check.

**Consumer provides** `value`, `max`, a full `label` that is read out instead of the numbers ("7 of 19 daily games played today"), and optionally a `color` token (the home page uses `ticket`) and a `size` in pixels (64 by default).

- The track is `surface-sunken` inside a 2px `edge` circle, so it reads in both themes.
- With reduced motion the ring is drawn at its value without the sweep.
