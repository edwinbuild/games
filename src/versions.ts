// The site's versions, newest first. The first is the current version (shown in the top-right
// corner and on the About page); package.json carries the same number. Plain Node reads this file
// too (scripts/pages.ts), so keep it free of imports.
export const VERSIONS: { v: string; date: string; notes: string }[] = [
  { v: '1.7.0', date: '2026-11-20', notes: 'Faster everywhere: pages show before their code has loaded, fonts and styles are lighter, home starts quicker, online rooms show their code at once. And practice rounds after the daily word games.' },
  { v: '1.6.0', date: '2026-11-20', notes: 'Word guessing: Hidden Word (one word, six guesses), and Two, Four and Eight Words, where every guess goes on every board. New words every day.' },
  { v: '1.5.0', date: '2026-11-20', notes: 'New game: Stick Up (balance a stick on a ball while the wind picks up).' },
  { v: '1.4.0', date: '2026-11-20', notes: 'Three new games: Tilt (roll every marble into its hole), Sum Path (corner to corner, add up to the target) and Letter Race (seven letters, one minute, up to eight friends).' },
  { v: '1.3.0', date: '2026-11-20', notes: 'Play all of today’s puzzles in one go, arcade games start again by themselves, an archive of past dailies, hints for the logic games, a weekly streak freeze ❄️ and sharing your result as a picture.' },
  { v: '1.2.0', date: '2026-11-20', notes: 'Votes, comments, play counts and players online (they appear once the database for them is switched on).' },
  { v: '1.1.0', date: '2026-11-20', notes: 'Behind the scenes: an admin page for switching games on and off, announcements, moderation and fixing a broken daily puzzle.' },
  { v: '1.0.0', date: '2026-11-20', notes: 'Accounts: sign in with an email link, one username each, profile icons, friends, your profile page.' },
  { v: '0.9.0', date: '2026-11-19', notes: 'Ready for launch: a privacy page, install it on your phone, any-time games work offline, fairer crowd answers.' },
  { v: '0.8.0', date: '2026-11-19', notes: 'Five new games: Dots & Boxes, Rule Stack, Garden Path, Word Ladder and Untangle Lights.' },
  { v: '0.7.0', date: '2026-11-19', notes: 'Daily boards: see your rank and today’s top 50 after every daily game.' },
  { v: '0.6.0', date: '2026-11-19', notes: 'Games by kind (Logic, Timing, Memory…), a desktop sidebar, the new footer, and reworked Paint Mix and Balance Beam.' },
  { v: '0.5.0', date: '2026-11-18', notes: 'The first games, challenge links, online rooms and the result ticket.' },
]
export const VERSION = VERSIONS[0].v
