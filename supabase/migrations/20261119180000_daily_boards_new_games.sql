-- Boards for the new daily games (Part D). Scores are what each game records as its daily result:
-- Untangle Lights moves, Word Ladder steps and Garden Path seconds (lower is better); Rule Stack
-- ranks a try as levels × 10000 minus seconds (higher is better).
insert into app.board_rules (game, lower_is_better, lo, hi) values
  ('untangle-lights', true, 1, 200),
  ('word-ladder', true, 1, 30),
  ('garden-path', true, 1, 86400),
  ('rule-stack', false, -9999, 120000);
