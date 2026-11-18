# Supabase (project `pocketfair`, organisation "edwin 2")

The database only keeps hourly counts per game and event. No personal data, no accounts.

- `app` schema (not exposed by the API): `games`, `event_counts`, `settings` (holds the stats key). RLS on, no policies: no direct access.
- Public functions, called by the site with the publishable key:
  - `log_event(p_game, p_event)`: adds one to this hour's count; unknown games or events are ignored.
  - `recent_plays()`: finished games per game in the last 24 hours.
  - `stats(p_key, p_days)`: daily totals for the private `/stats/` page; needs the stats key.
- Adding a game: insert its slug into `app.games` in a new migration.

Migrations in `migrations/` were applied in order through the Supabase connector.
