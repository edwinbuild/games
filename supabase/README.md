# Supabase (project `pocketfair`, organisation "edwin 2")

The database only keeps counts: hourly plays per game and event, and anonymous crowd answers per day and question. No personal data, no accounts.

- `app` schema (not exposed by the API): `games`, `event_counts`, `settings` (holds the stats key), `votes` (This or That), `crowd_numbers` and `crowd_totals` (Guess the Crowd: a 20-bucket histogram and a running total per question), `crowd_picks` (Odd Pick). RLS on, no policies: no direct access.
- Public functions, called by the site with the publishable key:
  - `log_event(p_game, p_event)`: adds one to this hour's count; unknown games or events are ignored.
  - `recent_plays()`: finished games per game in the last 24 hours.
  - `stats(p_key, p_days)`: daily totals for the private `/stats/` page; needs the stats key.
  - `vote(p_day, p_question, p_choice)` and `split(p_day, p_question)`: This or That.
  - `crowd_answer(p_game, p_day, p_question, p_value)` and `crowd_numbers(...)`: an answer as a share of the question's range (0..1); returns the count, mean and 20-bucket histogram.
  - `crowd_pick(p_game, p_day, p_question, p_choice)` and `crowd_picks(...)`: picks 0..4; `crowd_picks` refuses days that are not over yet (UTC), so today's split stays hidden.
  - All write functions accept only the local day within one day of the UTC date, and only their own game. `execute` is granted to `anon` only.
- Testing against the real database: use question number 9999 and delete those rows afterwards (`delete from app.crowd_* where question = 9999`).
- Adding a game: insert its slug into `app.games` in a new migration.

Migrations in `migrations/` were applied in order through the Supabase connector.
