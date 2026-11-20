-- Hidden Word and its bigger versions: daily games with boards. Score = guesses used, or past the
-- most guesses allowed by one per word not found (lower is better). Nothing is deleted.
insert into app.games (slug) values ('hidden-word'), ('two-words'), ('four-words'), ('eight-words') on conflict do nothing;
insert into app.board_rules (game, lower_is_better, lo, hi) values
  ('hidden-word', true, 1, 7),
  ('two-words', true, 2, 9),
  ('four-words', true, 4, 13),
  ('eight-words', true, 8, 21)
on conflict do nothing;
