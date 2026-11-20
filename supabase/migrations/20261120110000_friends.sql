-- Part E, step 2: friends. Requests by exact username or invite link; accept, decline, cancel,
-- remove, block. Friends see each other's daily results and can react with a fixed set of emoji
-- (no free text). A friend can be invited to an online room. Everything checks auth.uid().

create table app.reactions (
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  game text not null,
  day date not null,
  emoji text not null check (emoji in ('👏', '🔥', '😮', '😂')),
  seen boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user, game, day)
);
create index reactions_to on app.reactions (to_user, seen);
alter table app.reactions enable row level security;

create table app.play_invites (
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  game text not null,
  room text not null,
  seen boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user)
);
create index play_invites_to on app.play_invites (to_user);
alter table app.play_invites enable row level security;

-- ---------- Helpers ----------
create or replace function app.uid_by_name(p_name text) returns uuid
language sql stable security definer set search_path = '' as $$
  select user_id from app.profiles where lower(username) = lower(btrim(coalesce(p_name, '')))
$$;

create or replace function app.blocked_between(x uuid, y uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from app.blocks where (blocker = x and blocked = y) or (blocker = y and blocked = x))
$$;

create or replace function app.friendship(x uuid, y uuid) returns app.friendships
language sql stable security definer set search_path = '' as $$
  select * from app.friendships f where f.a = least(x, y) and f.b = greatest(x, y)
$$;

create or replace function app.are_friends(x uuid, y uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from app.friendships f where f.a = least(x, y) and f.b = greatest(x, y) and f.status = 'accepted')
$$;

-- The other player, found by exact username, never through a block; raises if there's no one.
create or replace function app.other(p_name text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := app.need_me(); them uuid := app.uid_by_name(p_name);
begin
  if them is null or app.blocked_between(me, them) then raise exception 'no such player'; end if;
  if them = me then raise exception 'that is you'; end if;
  return them;
end;
$$;

-- Starts (or completes) a friendship from me to them, within the limits.
create or replace function app.befriend(them uuid, auto_accept boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.need_me(); f app.friendships := app.friendship(me, them);
begin
  if f.a is not null then
    if f.status = 'accepted' then return 'friends'; end if;
    if f.requested_by = them or auto_accept then
      update app.friendships set status = 'accepted' where a = f.a and b = f.b;
      return 'friends';
    end if;
    return 'sent';
  end if;
  if (select count(*) from app.friendships x where x.requested_by = me and x.status = 'pending') >= 30 then raise exception 'too many pending'; end if;
  if (select count(*) from app.friendships x where x.requested_by = me and x.created_at > now() - interval '1 day') >= 20 then raise exception 'too many today'; end if;
  insert into app.friendships (a, b, requested_by, status) values (least(me, them), greatest(me, them), me, case when auto_accept then 'accepted' else 'pending' end);
  return case when auto_accept then 'friends' else 'sent' end;
end;
$$;

-- ---------- Finding and adding friends ----------
-- Exact username only (no browsing); nothing comes back through a block.
create or replace function public.find_player(p_name text)
returns json
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := app.need_me(); them uuid := app.uid_by_name(p_name); p app.profiles; f app.friendships;
begin
  if them is null or app.blocked_between(me, them) then return null; end if;
  select * into p from app.profiles where user_id = them;
  f := app.friendship(me, them);
  return json_build_object('username', p.username, 'icon', p.icon, 'colour', p.colour,
    'relation', case when them = me then 'self' when f.a is null then 'none' when f.status = 'accepted' then 'friend'
                     when f.requested_by = me then 'outgoing' else 'incoming' end);
end;
$$;

create or replace function public.friend_request(p_name text)
returns text
language plpgsql security definer set search_path = '' as $$
begin
  return app.befriend(app.other(p_name), false);
end;
$$;

-- Opening someone's invite link and tapping Add makes you friends at once (they invited you).
create or replace function public.friend_by_invite(p_code text)
returns json
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.need_me(); them uuid; p app.profiles;
begin
  select user_id into them from app.profiles where invite_code = p_code;
  if them is null or app.blocked_between(me, them) then raise exception 'no such invite'; end if;
  if them = me then raise exception 'that is you'; end if;
  perform app.befriend(them, true);
  select * into p from app.profiles where user_id = them;
  return json_build_object('username', p.username, 'icon', p.icon, 'colour', p.colour);
end;
$$;

-- Who an invite link belongs to (shown before adding).
create or replace function public.invite_owner(p_code text)
returns json
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := app.need_me(); p app.profiles;
begin
  select * into p from app.profiles where invite_code = p_code;
  if p.user_id is null or app.blocked_between(me, p.user_id) or p.username is null then return null; end if;
  return json_build_object('username', p.username, 'icon', p.icon, 'colour', p.colour, 'self', p.user_id = me,
    'friends', app.are_friends(me, p.user_id));
end;
$$;

create or replace function public.friend_respond(p_name text, p_accept boolean)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.need_me(); them uuid := app.other(p_name); f app.friendships := app.friendship(me, them);
begin
  if f.a is null or f.status <> 'pending' or f.requested_by = me then raise exception 'no request'; end if;
  if p_accept then update app.friendships set status = 'accepted' where a = f.a and b = f.b;
  else delete from app.friendships where a = f.a and b = f.b; end if;
  return p_accept;
end;
$$;

-- Cancels a request I sent, or ends a friendship.
create or replace function public.friend_remove(p_name text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.need_me(); them uuid := app.other(p_name);
begin
  delete from app.friendships where a = least(me, them) and b = greatest(me, them);
  delete from app.play_invites where (from_user = me and to_user = them) or (from_user = them and to_user = me);
  return true;
end;
$$;

-- A block ends any friendship, removes reactions and invites both ways, and hides each from the other.
create or replace function public.block_player(p_name text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.need_me(); them uuid := app.uid_by_name(p_name);
begin
  if them is null then raise exception 'no such player'; end if;
  if them = me then raise exception 'that is you'; end if;
  insert into app.blocks (blocker, blocked) values (me, them) on conflict do nothing;
  delete from app.friendships where a = least(me, them) and b = greatest(me, them);
  delete from app.reactions where (from_user = me and to_user = them) or (from_user = them and to_user = me);
  delete from app.play_invites where (from_user = me and to_user = them) or (from_user = them and to_user = me);
  return true;
end;
$$;

create or replace function public.unblock_player(p_name text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.need_me();
begin
  delete from app.blocks where blocker = me and blocked = app.uid_by_name(p_name);
  return true;
end;
$$;

create or replace function public.my_blocks()
returns table (username text)
language sql stable security definer set search_path = '' as $$
  select p.username from app.blocks b join app.profiles p on p.user_id = b.blocked where b.blocker = app.need_me() order by b.created_at desc
$$;

-- ---------- Friends list and results ----------
create or replace function public.my_friends(p_today date default null)
returns table (username text, icon text, colour text, status text, played_today integer, streak integer)
language sql stable security definer set search_path = '' as $$
  with me as (select app.need_me() as id), d as (select coalesce(p_today, (now() at time zone 'utc')::date) as day)
  select p.username, p.icon, p.colour,
    case when f.status = 'accepted' then 'friend' when f.requested_by = me.id then 'outgoing' else 'incoming' end,
    case when f.status = 'accepted' then (select count(*)::int from app.scores s where s.user_id = p.user_id and s.day = d.day) else 0 end,
    case when f.status = 'accepted' then app.streak_of(p.user_id, d.day) else 0 end
  from me, d, app.friendships f
  join app.profiles p on p.user_id = case when f.a = (select id from me) then f.b else f.a end
  where (f.a = me.id or f.b = me.id) and p.username is not null
  order by case when f.status = 'pending' and f.requested_by <> me.id then 0 when f.status = 'accepted' then 1 else 2 end, lower(p.username)
$$;

-- Today's results for one game among you and your friends, with reactions.
create or replace function public.friends_results(p_game text, p_day date)
returns table (username text, icon text, colour text, text text, rank bigint, mine boolean, reactions json, my_reaction text)
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := app.need_me(); r app.board_rules;
begin
  select * into r from app.board_rules where game = p_game;
  if not found then raise exception 'unknown game'; end if;
  return query
    with people as (
      select me as id
      union select case when f.a = me then f.b else f.a end from app.friendships f where (f.a = me or f.b = me) and f.status = 'accepted'
    )
    select p.username, p.icon, p.colour, s.text,
      rank() over (order by case when r.lower_is_better then s.score else -s.score end),
      s.user_id = me,
      (select coalesce(json_object_agg(x.emoji, x.n), '{}'::json) from (select emoji, count(*) as n from app.reactions where to_user = s.user_id and game = p_game and day = p_day group by emoji) x),
      (select emoji from app.reactions where from_user = me and to_user = s.user_id and game = p_game and day = p_day)
    from people pe join app.scores s on s.user_id = pe.id and s.game = p_game and s.day = p_day
    join app.profiles p on p.user_id = s.user_id
    order by 5, lower(p.username);
end;
$$;

-- A reaction on a friend's result for a day (null removes it). Fixed emoji only.
create or replace function public.react(p_name text, p_game text, p_day date, p_emoji text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.need_me(); them uuid := app.other(p_name);
begin
  if not app.are_friends(me, them) then raise exception 'not friends'; end if;
  if p_emoji is null then
    delete from app.reactions where from_user = me and to_user = them and game = p_game and day = p_day;
    return true;
  end if;
  if p_emoji not in ('👏', '🔥', '😮', '😂') then raise exception 'bad reaction'; end if;
  if not exists (select 1 from app.scores where user_id = them and game = p_game and day = p_day) then raise exception 'no result'; end if;
  insert into app.reactions (from_user, to_user, game, day, emoji) values (me, them, p_game, p_day, p_emoji)
    on conflict (from_user, to_user, game, day) do update set emoji = excluded.emoji, seen = false, created_at = now();
  return true;
end;
$$;

-- "Play with a friend": the room link waits in their inbox for 30 minutes.
create or replace function public.invite_to_play(p_name text, p_game text, p_room text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.need_me(); them uuid := app.other(p_name);
begin
  if not app.are_friends(me, them) then raise exception 'not friends'; end if;
  if p_game not in ('dots-and-boxes', 'reaction-online', 'spot-race', 'higher-lower', 'quick-draw') then raise exception 'not an online game'; end if;
  if p_room !~ '^[A-Z0-9]{5}$' then raise exception 'bad room'; end if;
  insert into app.play_invites (from_user, to_user, game, room) values (me, them, p_game, p_room)
    on conflict (from_user, to_user) do update set game = excluded.game, room = excluded.room, seen = false, created_at = now();
  return true;
end;
$$;

-- What's new for me: requests, game invites (last 30 minutes) and reactions not yet seen.
create or replace function public.my_inbox()
returns json
language sql stable security definer set search_path = '' as $$
  with me as (select app.need_me() as id)
  select json_build_object(
    'invites', coalesce((select json_agg(json_build_object('username', p.username, 'icon', p.icon, 'colour', p.colour, 'game', i.game, 'room', i.room, 'at', i.created_at) order by i.created_at desc)
      from app.play_invites i join app.profiles p on p.user_id = i.from_user, me where i.to_user = me.id and i.created_at > now() - interval '30 minutes'), '[]'::json),
    'reactions', coalesce((select json_agg(json_build_object('username', p.username, 'icon', p.icon, 'colour', p.colour, 'emoji', r.emoji, 'game', r.game, 'day', r.day) order by r.created_at desc)
      from app.reactions r join app.profiles p on p.user_id = r.from_user, me where r.to_user = me.id and not r.seen), '[]'::json))
$$;

create or replace function public.mark_seen()
returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.need_me();
begin
  update app.reactions set seen = true where to_user = me and not seen;
  update app.play_invites set seen = true where to_user = me and not seen;
  return true;
end;
$$;

-- The badge counts requests, fresh game invites and unseen reactions.
create or replace function public.my_profile(p_today date default null)
returns json
language plpgsql security definer set search_path = '' as $$
declare p app.profiles := app.my_profile_row(); uid uuid := app.need_me(); incoming int; news int;
begin
  select count(*) into incoming from app.friendships f
    where (f.a = uid or f.b = uid) and f.status = 'pending' and f.requested_by <> uid;
  select (select count(*) from app.reactions where to_user = uid and not seen)
       + (select count(*) from app.play_invites where to_user = uid and not seen and created_at > now() - interval '30 minutes') into news;
  return json_build_object(
    'username', p.username, 'changesLeft', greatest(0, 5 - p.changes_used), 'icon', p.icon, 'colour', p.colour,
    'unlocked', app.unlocked_icons(uid), 'inviteCode', p.invite_code, 'createdAt', p.created_at,
    'streak', app.streak_of(uid, coalesce(p_today, (now() at time zone 'utc')::date)),
    'incoming', incoming, 'news', news);
end;
$$;

-- ---------- Who may call what ----------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proowner = current_user::regrole
      and p.proname in ('find_player', 'friend_request', 'friend_by_invite', 'invite_owner', 'friend_respond', 'friend_remove', 'block_player',
                        'unblock_player', 'my_blocks', 'my_friends', 'friends_results', 'react', 'invite_to_play', 'my_inbox', 'mark_seen', 'my_profile') loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app' and p.proowner = current_user::regrole loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
