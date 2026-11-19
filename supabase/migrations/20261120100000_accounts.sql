-- Part E, step 1: accounts. Sign-in is Supabase Auth (email link now, Google later). Everything
-- stays behind functions: tables are private (RLS on, no policies), functions are security
-- definer and check auth.uid(). Guests keep working exactly as before.

-- ---------- Profiles and usernames ----------
create table app.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text,
  changes_used integer not null default 0,
  icon text not null default 'ticket',
  colour text not null default 'mint',
  invite_code text not null unique default substr(md5(gen_random_uuid()::text), 1, 10),
  created_at timestamptz not null default now()
);
create unique index profiles_username_ci on app.profiles (lower(username));
alter table app.profiles enable row level security;

-- A released name (after a change or a deleted account) is kept from others for 30 days.
create table app.username_holds (
  name_lower text primary key,
  held_by uuid, -- the previous owner may take it back; null after a deleted account
  until timestamptz not null
);
alter table app.username_holds enable row level security;

-- Each signed-in player's saved data: per-game stats and today's tries, merged by the site.
create table app.user_data (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table app.user_data enable row level security;

-- Reported usernames, reviewed by Edwin on the stats page.
create table app.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now()
);
alter table app.reports enable row level security;

-- Boards remember the player when signed in (one row per player, not per device).
alter table app.scores add column user_id uuid references auth.users (id) on delete cascade;
create index scores_user_day on app.scores (user_id, day) where user_id is not null;

-- ---------- Helpers ----------
create or replace function app.me() returns uuid
language sql stable set search_path = '' as $$ select auth.uid() $$;

-- The board identity: the signed-in player, or the hash of the guest's browser key.
create or replace function app.device_for(p_key text) returns text
language sql stable set search_path = '' as $$
  select case when auth.uid() is not null then 'u:' || auth.uid()::text
              else encode(extensions.digest(coalesce(p_key, ''), 'sha256'), 'hex') end
$$;

create or replace function app.need_me() returns uuid
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  return auth.uid();
end;
$$;

-- The profile row, made on first use.
create or replace function app.my_profile_row() returns app.profiles
language plpgsql security definer set search_path = '' as $$
declare p app.profiles; uid uuid := app.need_me();
begin
  select * into p from app.profiles where user_id = uid;
  if not found then
    insert into app.profiles (user_id) values (uid) on conflict do nothing;
    select * into p from app.profiles where user_id = uid;
  end if;
  return p;
end;
$$;

-- Why a name can't be used, or null if it can (for this player).
create or replace function app.username_problem(p_name text, p_uid uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare n text := lower(coalesce(p_name, ''));
begin
  if p_name is null or p_name !~ '^[A-Za-z0-9_]{3,16}$' then return 'format'; end if;
  if n in ('admin', 'administrator', 'pocketfair', 'pocket_fair', 'edwin', 'edwinsm', 'support', 'help', 'mod', 'moderator',
           'staff', 'official', 'system', 'root', 'null', 'undefined', 'guest', 'you', 'me', 'anonymous', 'claude', 'anthropic')
     or n like 'pocketfair%' then return 'reserved'; end if;
  if app.is_blocked(replace(p_name, '_', ' ')) or app.is_blocked(p_name) then return 'rude'; end if;
  if exists (select 1 from app.profiles where lower(username) = n and user_id <> p_uid) then return 'taken'; end if;
  if exists (select 1 from app.username_holds h where h.name_lower = n and h.until > now() and h.held_by is distinct from p_uid) then return 'held'; end if;
  return null;
end;
$$;

-- Icons: 24 open to everyone signed in, 6 unlocked by playing.
create or replace function app.unlocked_icons(p_uid uuid) returns text[]
language plpgsql stable security definer set search_path = '' as $$
declare max_streak int; plays int; games int; friends int; top boolean; got text[] := '{}';
begin
  -- Plays count finished any-time plays plus days played of each daily game.
  select coalesce(max(x.streak), 0), coalesce(sum(x.plays + x.days), 0), count(*) filter (where x.plays + x.days > 0)
    into max_streak, plays, games
    from (
      select coalesce((d.value->>'maxStreak')::int, 0) as streak, coalesce((d.value->>'plays')::int, 0) as plays,
             (select count(*)::int from jsonb_object_keys(case when jsonb_typeof(d.value->'daily') = 'object' then d.value->'daily' else '{}'::jsonb end)) as days
      from app.user_data d where d.user_id = p_uid and d.key like 'stats:%'
    ) x;
  select count(*) into friends from app.friendships f where (f.a = p_uid or f.b = p_uid) and f.status = 'accepted';
  select exists (
    select 1 from app.scores s join app.board_rules r on r.game = s.game
    where s.user_id = p_uid and s.day < (now() at time zone 'utc')::date - 1
      and not exists (select 1 from app.scores o where o.game = s.game and o.day = s.day
                      and ((r.lower_is_better and o.score < s.score) or (not r.lower_is_better and o.score > s.score)))
  ) into top;
  if max_streak >= 7 then got := array_append(got, 'flame'); end if;
  if max_streak >= 30 then got := array_append(got, 'crown'); end if;
  if plays >= 100 then got := array_append(got, 'trophy'); end if;
  if games >= 20 then got := array_append(got, 'comet'); end if;
  if friends >= 3 then got := array_append(got, 'balloons'); end if;
  if top then got := array_append(got, 'medal'); end if;
  return got;
end;
$$;

create or replace function app.icon_ok(p_icon text, p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_icon = any (array['ticket','cat','dog','fox','bear','frog','owl','penguin','rabbit','whale','octopus','snail','bee',
                             'apple','cherry','pear','lemon','donut','cupcake','pizza','cactus','mushroom','kite','rocket','planet'])
      or p_icon = any (app.unlocked_icons(p_uid))
$$;

create or replace function app.colour_ok(p_colour text) returns boolean
language sql immutable set search_path = '' as $$
  select p_colour = any (array['tangerine','mint','grape','sky','bubblegum','lagoon','chili','lime','coral','aqua','sand','periwinkle',
    'peach','orchid','pistachio','honey','lilac','apricot','seafoam','butter','blush','citrus','iris','denim','glacier','sunbeam',
    'sage','mauve','melon','jade','poppy','nebula','olive','twilight','lemon','fern','amber','salmon'])
$$;

-- Days in a row (ending today or yesterday, by the player's own dates) with any daily result.
create or replace function app.streak_of(p_uid uuid, p_today date) returns integer
language sql stable security definer set search_path = '' as $$
  with d as (select distinct day from app.scores where user_id = p_uid and day > p_today - 400 and day <= p_today),
  g as (select day, day - (row_number() over (order by day))::int as grp from d),
  last as (select grp from g order by day desc limit 1)
  select coalesce((select count(*)::int from g where g.grp = (select grp from last)
                    and (select max(day) from d) >= p_today - 1), 0)
$$;

-- ---------- Profile functions ----------
-- Friendships are defined here (step 2 fills in the functions) because the profile reads them.
create table app.friendships (
  a uuid not null references auth.users (id) on delete cascade,
  b uuid not null references auth.users (id) on delete cascade,
  requested_by uuid not null,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
create index friendships_b on app.friendships (b);
alter table app.friendships enable row level security;

create or replace function public.my_profile(p_today date default null)
returns json
language plpgsql security definer set search_path = '' as $$
declare p app.profiles := app.my_profile_row(); uid uuid := app.need_me(); incoming int;
begin
  select count(*) into incoming from app.friendships f
    where (f.a = uid or f.b = uid) and f.status = 'pending' and f.requested_by <> uid;
  return json_build_object(
    'username', p.username, 'changesLeft', greatest(0, 5 - p.changes_used), 'icon', p.icon, 'colour', p.colour,
    'unlocked', app.unlocked_icons(uid), 'inviteCode', p.invite_code, 'createdAt', p.created_at,
    'streak', app.streak_of(uid, coalesce(p_today, (now() at time zone 'utc')::date)),
    'incoming', incoming);
end;
$$;

-- For the live check while typing. Reasons: format, reserved, rude, taken, held; null = free.
create or replace function public.check_username(p_name text)
returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  return app.username_problem(p_name, app.need_me());
end;
$$;

-- The first pick is free; after that, five changes in total. The old name is held for 30 days.
create or replace function public.set_username(p_name text)
returns json
language plpgsql security definer set search_path = '' as $$
declare p app.profiles := app.my_profile_row(); problem text;
begin
  if p.username is not null and p.username = p_name then return public.my_profile(); end if;
  problem := app.username_problem(p_name, p.user_id);
  if problem is not null then raise exception 'username %', problem; end if;
  if p.username is not null then
    if p.changes_used >= 5 then raise exception 'no changes left'; end if;
    insert into app.username_holds (name_lower, held_by, until) values (lower(p.username), p.user_id, now() + interval '30 days')
      on conflict (name_lower) do update set held_by = excluded.held_by, until = excluded.until;
  end if;
  delete from app.username_holds where name_lower = lower(p_name) and held_by = p.user_id;
  update app.profiles set username = p_name,
    changes_used = changes_used + case when p.username is null then 0 else 1 end
  where user_id = p.user_id;
  -- Today's board rows show the new name.
  update app.scores set nick = p_name where user_id = p.user_id;
  return public.my_profile();
end;
$$;

create or replace function public.set_icon(p_icon text, p_colour text)
returns json
language plpgsql security definer set search_path = '' as $$
declare p app.profiles := app.my_profile_row();
begin
  if not app.icon_ok(p_icon, p.user_id) then raise exception 'icon locked'; end if;
  if not app.colour_ok(p_colour) then raise exception 'bad colour'; end if;
  update app.profiles set icon = p_icon, colour = p_colour where user_id = p.user_id;
  return public.my_profile();
end;
$$;

-- ---------- Saved data (sync) ----------
create or replace function public.get_data()
returns table (key text, value jsonb, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.key, d.value, d.updated_at from app.user_data d where d.user_id = app.need_me()
$$;

-- The site merges before it writes (best of both), so a write replaces the stored value.
create or replace function public.put_data(p_items jsonb)
returns integer
language plpgsql security definer set search_path = '' as $$
declare uid uuid := app.need_me(); item record; n int := 0;
begin
  if jsonb_typeof(p_items) <> 'object' then raise exception 'bad data'; end if;
  for item in select * from jsonb_each(p_items) loop
    if item.key !~ '^(stats|today):[a-z0-9-]{2,40}$' then raise exception 'bad key %', item.key; end if;
    if length(item.value::text) > 32000 then raise exception 'too big %', item.key; end if;
    insert into app.user_data (user_id, key, value, updated_at) values (uid, item.key, item.value, now())
      on conflict (user_id, key) do update set value = excluded.value, updated_at = now();
    n := n + 1;
  end loop;
  if (select count(*) from app.user_data where user_id = uid) > 300 then raise exception 'too many keys'; end if;
  return n;
end;
$$;

-- On first sign-in on a device: the guest's board results and answer marks become the player's
-- (best result kept when both have one).
create or replace function public.claim_device(p_key text)
returns integer
language plpgsql security definer set search_path = '' as $$
declare uid uuid := app.need_me(); dev text; me_dev text := 'u:' || uid::text; p app.profiles := app.my_profile_row(); g record; n int := 0;
begin
  if p_key is null or p_key !~ '^[0-9a-f]{32}$' then raise exception 'bad key'; end if;
  dev := encode(extensions.digest(p_key, 'sha256'), 'hex');
  for g in select s.*, r.lower_is_better from app.scores s join app.board_rules r on r.game = s.game where s.device = dev loop
    if exists (select 1 from app.scores where game = g.game and day = g.day and device = me_dev) then
      update app.scores s set score = g.score, text = g.text
        where s.game = g.game and s.day = g.day and s.device = me_dev
          and ((g.lower_is_better and g.score < s.score) or (not g.lower_is_better and g.score > s.score));
      delete from app.scores where game = g.game and day = g.day and device = dev;
    else
      update app.scores set device = me_dev, user_id = uid, nick = coalesce(p.username, nick)
        where game = g.game and day = g.day and device = dev;
    end if;
    n := n + 1;
  end loop;
  update app.answered a set device = me_dev where a.device = dev
    and not exists (select 1 from app.answered x where x.kind = a.kind and x.day = a.day and x.question = a.question and x.device = me_dev);
  delete from app.answered where device = dev;
  return n;
end;
$$;

-- Removes the account and everything tied to it. The username stays held for 30 days.
create or replace function public.delete_account()
returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := app.need_me(); p app.profiles;
begin
  select * into p from app.profiles where user_id = uid;
  if p.username is not null then
    insert into app.username_holds (name_lower, held_by, until) values (lower(p.username), null, now() + interval '30 days')
      on conflict (name_lower) do update set held_by = null, until = excluded.until;
  end if;
  delete from app.answered where device = 'u:' || uid::text;
  delete from auth.users where id = uid; -- cascades to profiles, data, scores, friendships
  return true;
end;
$$;

create or replace function public.report_username(p_name text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := app.need_me();
begin
  if (select count(*) from app.reports where reporter = uid and created_at > now() - interval '1 day') >= 10 then raise exception 'too many reports'; end if;
  if not exists (select 1 from app.profiles where lower(username) = lower(p_name)) then raise exception 'no such player'; end if;
  insert into app.reports (reporter, username) values (uid, p_name);
  return true;
end;
$$;

-- For the stats page (same private key as the other stats).
create or replace function public.reported_usernames(p_key text)
returns table (username text, reports bigint, last timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_key is null or p_key <> (select s.value from app.settings s where s.key = 'stats_key') then raise exception 'not allowed'; end if;
  return query select r.username, count(*), max(r.created_at) from app.reports r group by r.username order by 2 desc, 3 desc limit 100;
end;
$$;

-- ---------- Boards: signed-in players by username ----------
create or replace function public.submit_score(p_game text, p_day date, p_key text, p_score double precision, p_text text, p_nick text default null)
returns table (rank bigint, total bigint, better_than integer)
language plpgsql security definer set search_path = '' as $$
declare r app.board_rules; dev text; prev app.scores; utc_day date := (now() at time zone 'utc')::date; v_nick text; better boolean; uid uuid := auth.uid();
begin
  select * into r from app.board_rules where game = p_game;
  if not found then raise exception 'unknown game'; end if;
  if p_day < utc_day - 1 or p_day > utc_day + 1 then raise exception 'day out of range'; end if;
  if p_score is null or p_score <> p_score or p_score < r.lo or p_score > r.hi then raise exception 'score out of range'; end if;
  if uid is null and (p_key is null or p_key !~ '^[0-9a-f]{32}$') then raise exception 'bad key'; end if;
  if p_text is null or length(p_text) = 0 or length(p_text) > 24 then raise exception 'bad text'; end if;
  if uid is not null then
    select username into v_nick from app.profiles where user_id = uid;
  else
    v_nick := nullif(btrim(coalesce(p_nick, '')), '');
    if v_nick is not null and (length(v_nick) > 16 or v_nick !~ '^[[:alnum:] _.''-]+$' or app.is_blocked(v_nick)) then v_nick := null; end if;
  end if;
  dev := app.device_for(p_key);
  select * into prev from app.scores s where s.game = p_game and s.day = p_day and s.device = dev;
  if found then
    if prev.updated_at > now() - interval '3 seconds' then raise exception 'too fast'; end if;
    better := (r.lower_is_better and p_score < prev.score) or (not r.lower_is_better and p_score > prev.score);
    update app.scores s set
      score = case when better then p_score else prev.score end,
      text = case when better then p_text else prev.text end,
      nick = coalesce(v_nick, prev.nick),
      updated_at = now()
    where s.game = p_game and s.day = p_day and s.device = dev;
  else
    insert into app.scores (game, day, device, score, text, nick, user_id) values (p_game, p_day, dev, p_score, p_text, v_nick, uid);
  end if;
  return query select * from public.my_rank(p_game, p_day, p_key);
end;
$$;

create or replace function public.my_rank(p_game text, p_day date, p_key text)
returns table (rank bigint, total bigint, better_than integer)
language plpgsql stable security definer set search_path = '' as $$
declare r app.board_rules; dev text := app.device_for(p_key); mine double precision;
begin
  select * into r from app.board_rules where game = p_game;
  if not found then raise exception 'unknown game'; end if;
  select s.score into mine from app.scores s where s.game = p_game and s.day = p_day and s.device = dev;
  return query
    select
      case when mine is null then null else 1 + count(*) filter (where (r.lower_is_better and s.score < mine) or (not r.lower_is_better and s.score > mine)) end,
      count(*),
      case when mine is null or count(*) < 2 then null
        else round(100.0 * count(*) filter (where (r.lower_is_better and s.score > mine) or (not r.lower_is_better and s.score < mine)) / (count(*) - 1))::integer end
    from app.scores s where s.game = p_game and s.day = p_day;
end;
$$;

-- The board now carries each signed-in player's icon; players who blocked you are left out.
drop function public.daily_board(text, date, text, integer);
create function public.daily_board(p_game text, p_day date, p_key text default null, p_limit integer default 50)
returns table (rank bigint, nick text, text text, mine boolean, icon text, colour text)
language plpgsql stable security definer set search_path = '' as $$
declare r app.board_rules; dev text := app.device_for(p_key); uid uuid := auth.uid();
begin
  select * into r from app.board_rules where game = p_game;
  if not found then raise exception 'unknown game'; end if;
  return query
    select x.rk, x.nick, x.text, x.device = dev, p.icon, p.colour from (
      select s.device, s.nick, s.text, s.updated_at, s.user_id,
        rank() over (order by case when r.lower_is_better then s.score else -s.score end) as rk
      from app.scores s where s.game = p_game and s.day = p_day
    ) x
    left join app.profiles p on p.user_id = x.user_id
    where uid is null or x.user_id is null or not exists (select 1 from app.blocks b where b.blocker = x.user_id and b.blocked = uid)
    order by x.rk, x.updated_at limit least(greatest(coalesce(p_limit, 50), 1), 50);
end;
$$;

-- Answers count once per player when signed in (on any device).
create or replace function app.first_answer(p_kind text, p_day date, p_question integer, p_key text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if auth.uid() is null and (p_key is null or p_key !~ '^[0-9a-f]{32}$') then raise exception 'bad key'; end if;
  if random() < 0.02 then delete from app.answered where day < (now() at time zone 'utc')::date - 2; end if;
  insert into app.answered (kind, day, question, device) values (p_kind, p_day, p_question, app.device_for(p_key))
  on conflict do nothing;
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

-- Blocks are defined here (the board reads them); step 2 adds the functions.
create table app.blocks (
  blocker uuid not null references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);
create index blocks_blocked on app.blocks (blocked);
alter table app.blocks enable row level security;

-- ---------- Who may call what ----------
-- The site calls the public functions as a guest (anon) or signed in (authenticated).
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proowner = current_user::regrole loop
    execute format('revoke all on function %s from public', f.sig);
    if f.proname in ('stats', 'error_stats', 'reported_usernames') then
      execute format('grant execute on function %s to anon', f.sig);
    elsif f.proname in ('my_profile', 'check_username', 'set_username', 'set_icon', 'get_data', 'put_data', 'claim_device', 'delete_account', 'report_username') then
      execute format('revoke execute on function %s from anon', f.sig);
      execute format('grant execute on function %s to authenticated', f.sig);
    else
      execute format('grant execute on function %s to anon, authenticated', f.sig);
    end if;
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'app' and p.proowner = current_user::regrole loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
