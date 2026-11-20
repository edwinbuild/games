-- Stick Up: a new any-time game; its plays are counted like every other game's.
insert into app.games (slug) values ('stick-up') on conflict do nothing;
