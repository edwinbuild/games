A small on/off switch for one site-wide setting, shown at the right of the `TopBar`; today it is only the sound switch.

**Consumer provides** the setting's `label` ("Sound"), whether it is `on`, and `onChange`. The chip reads "Sound on" or "Sound off" and fills with `ticket` when on, so the state shows in both the words and the fill.

- Remember the setting across games (the site stores it in the browser).
- Don't use it for in-game choices; those are `Button`s.
