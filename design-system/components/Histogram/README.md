A small bar chart of how a crowd answered a number question, with markers for the player's answer, their guess and the crowd's average. Bars grow in on mount.

**Consumer provides** `bins` (counts per bucket, left to right), optional `marks` (`{ at: 0..1, label, tone: 'me' | 'guess' | 'crowd' }`), `min` and `max` labels for the two ends, a game `color`, and a one-sentence `summary` that is read by screen readers and shown under the chart.

- Only real crowd data. With fewer than 20 answers, don't show it: say how many answers there are so far instead.
- Keep marker labels to a word or two ("You", "Your guess", "Average").
