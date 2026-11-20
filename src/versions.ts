// The site's versions, newest first. The first is the current version (shown in the top-right
// corner and on the About page); package.json carries the same number. Plain Node reads this file
// too (scripts/pages.ts), so keep it free of imports.
export const VERSIONS: { v: string; date: string; notes: string }[] = [
  { v: '1.0.0', date: '2026-11-20', notes: 'Accounts: sign in with an email link, one username each, profile icons, friends, your profile page.' },
  { v: '0.9.0', date: '2026-11-19', notes: 'Ready for launch: a privacy page, install it on your phone, any-time games work offline, fairer crowd answers.' },
  { v: '0.8.0', date: '2026-11-19', notes: 'Five new games: Dots & Boxes, Rule Stack, Garden Path, Word Ladder and Untangle Lights.' },
  { v: '0.7.0', date: '2026-11-19', notes: 'Daily boards: see your rank and today’s top 50 after every daily game.' },
  { v: '0.6.0', date: '2026-11-19', notes: 'Games by kind (Logic, Timing, Memory…), a desktop sidebar, the new footer, and reworked Paint Mix and Balance Beam.' },
  { v: '0.5.0', date: '2026-11-18', notes: 'The first games, challenge links, online rooms and the result ticket.' },
]
export const VERSION = VERSIONS[0].v
