// Site-wide settings. The name is a placeholder until a name is picked
// (see "Next actions" in the build plan).
export const SITE = {
  name: 'Pocket Fair',
  tagline: 'Quick games that take a minute or two. No sign\u2011up, nothing to install.',
  url: 'https://games-sigma-gold.vercel.app', // Vercel production URL; change when the real domain is bought
  supportUrl: '', // "Buy me a coffee" link; hidden while empty
  /** Supabase project "pocketfair". The publishable key is meant to be public; the database only exposes the functions in supabase/README.md. */
  api: {
    url: 'https://ebfhnhynifyyzurzezkl.supabase.co',
    key: 'sb_publishable_tYuY2reQdFRnbg9lwWVwdA_3Ycx0oap',
  },
}
