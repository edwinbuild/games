A sheet that slides up from the bottom on phones and is a centred dialog from 760px. Built on the native dialog element, so focus stays inside, Esc closes it and the page behind is inert; tapping the dimmed backdrop closes it too.

**Consumer provides** `open`, `onClose`, a `title` (also its accessible name) and the content. Content renders only while open.

- Use it for short tasks over the page: sign in, pick a username or an icon, confirm a deletion.
- Keep one primary action at the bottom.
<!-- @dsCard group="Account" height=360 -->
