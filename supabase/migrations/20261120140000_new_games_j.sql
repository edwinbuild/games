-- Part J: three new games. Tilt and Sum Path are daily games with boards (fewer tilts / squares is
-- better); Letter Race is an online game friends can invite each other to. Nothing is deleted.
insert into app.games (slug) values ('tilt'), ('sum-path'), ('letter-race') on conflict do nothing;

insert into app.board_rules (game, lower_is_better, lo, hi) values
  ('tilt', true, 1, 200),
  ('sum-path', true, 1, 36)
on conflict do nothing;

-- "Play with a friend" now offers Letter Race too.
create or replace function public.invite_to_play(p_name text, p_game text, p_room text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.need_me(); them uuid := app.other(p_name);
begin
  if not app.are_friends(me, them) then raise exception 'not friends'; end if;
  if p_game not in ('dots-and-boxes', 'reaction-online', 'spot-race', 'higher-lower', 'quick-draw', 'letter-race') then raise exception 'not an online game'; end if;
  if p_room !~ '^[A-Z0-9]{5}$' then raise exception 'bad room'; end if;
  insert into app.play_invites (from_user, to_user, game, room) values (me, them, p_game, p_room)
    on conflict (from_user, to_user) do update set game = excluded.game, room = excluded.room, seen = false, created_at = now();
  return true;
end;
$$;
