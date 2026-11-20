-- Part G: the admin page. Locked to one signed-in account plus a PIN. The PIN is stored only as a
-- bcrypt hash in app.settings (set by hand, never in this repo); the first signed-in account to
-- enter it becomes the admin, and from then on only that account can. Wrong PINs: 5 per account
-- per 15 minutes, 50 per hour in all. A correct PIN opens an 8-hour admin session.

-- ---------- Site settings every page reads ----------
create table app.site_config (
  id integer primary key default 1 check (id = 1),
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into app.site_config (value) values ('{
  "disabled": [], "featured": [], "new": [], "banner": null, "maintenance": null,
  "rooms": true, "signups": true, "comments": "review",
  "autoplay": {"run": true, "replay": true},
  "counters": {"plays": 100, "online": 5, "gameOnline": 3},
  "rerolls": {}
}');
alter table app.site_config enable row level security;

create or replace function public.site_config()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select value from app.site_config where id = 1
$$;

-- ---------- Admin lock ----------
create table app.admin_sessions (
  token_hash text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table app.admin_sessions enable row level security;

create table app.admin_attempts (
  id bigint generated always as identity primary key,
  user_id uuid,
  ok boolean not null,
  at timestamptz not null default now()
);
create index admin_attempts_at on app.admin_attempts (at);
alter table app.admin_attempts enable row level security;

create table app.admin_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  action text not null,
  detail jsonb,
  at timestamptz not null default now()
);
alter table app.admin_log enable row level security;

create or replace function app.setting(p_key text) returns text
language sql stable security definer set search_path = '' as $$
  select value from app.settings where key = p_key
$$;

create or replace function app.log_admin(p_action text, p_detail jsonb default null) returns void
language sql security definer set search_path = '' as $$
  insert into app.admin_log (user_id, action, detail) values (auth.uid(), p_action, p_detail)
$$;

-- Unlock with the PIN. Wrong PINs are recorded (so this returns an error instead of raising).
create or replace function public.admin_unlock(p_pin text)
returns json
language plpgsql security definer set search_path = '' as $$
declare uid uuid := app.need_me(); admin text := app.setting('admin_user'); hash text := app.setting('admin_pin_hash'); token text; mine int; everyone int;
begin
  select count(*) into mine from app.admin_attempts where user_id = uid and not ok and at > now() - interval '15 minutes';
  select count(*) into everyone from app.admin_attempts where not ok and at > now() - interval '1 hour';
  if mine >= 5 or everyone >= 50 then return json_build_object('error', 'locked'); end if;
  if hash is null then return json_build_object('error', 'no pin'); end if;
  if (admin is not null and admin <> uid::text) or p_pin is null or extensions.crypt(p_pin, hash) <> hash then
    insert into app.admin_attempts (user_id, ok) values (uid, false);
    return json_build_object('error', 'wrong', 'left', greatest(0, 4 - mine));
  end if;
  insert into app.admin_attempts (user_id, ok) values (uid, true);
  if admin is null then
    insert into app.settings (key, value) values ('admin_user', uid::text);
    perform app.log_admin('claimed admin');
  end if;
  token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into app.admin_sessions (token_hash, user_id, expires_at) values (encode(extensions.digest(token, 'sha256'), 'hex'), uid, now() + interval '8 hours');
  perform app.log_admin('unlocked');
  return json_build_object('token', token, 'expires', extract(epoch from now() + interval '8 hours')::bigint);
end;
$$;

-- Every admin function starts with this: the admin account, signed in, with a live session.
create or replace function app.admin(p_token text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null or app.setting('admin_user') is distinct from uid::text or p_token is null
     or not exists (select 1 from app.admin_sessions s where s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and s.user_id = uid and s.expires_at > now())
  then raise exception 'not allowed'; end if;
  return uid;
end;
$$;

create or replace function public.admin_check(p_token text)
returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.admin(p_token);
  return true;
end;
$$;



create or replace function public.admin_security(p_token text)
returns json
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := app.admin(p_token);
begin
  return json_build_object(
    'attempts', coalesce((select json_agg(json_build_object('ok', a.ok, 'at', a.at, 'mine', a.user_id = uid) order by a.at desc) from (select * from app.admin_attempts order by at desc limit 20) a), '[]'::json),
    'sessions', (select count(*) from app.admin_sessions where user_id = uid and expires_at > now()),
    'log', coalesce((select json_agg(json_build_object('action', l.action, 'detail', l.detail, 'at', l.at) order by l.at desc) from (select * from app.admin_log order by at desc limit 50) l), '[]'::json));
end;
$$;

-- ---------- Dashboard ----------
create or replace function public.admin_dashboard(p_token text, p_days integer default 14)
returns json
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := app.admin(p_token); days int := least(greatest(coalesce(p_days, 14), 1), 90); today date := (now() at time zone 'utc')::date;
begin
  return json_build_object(
    'games', coalesce((select json_agg(x) from (
      select e.game,
        coalesce(sum(e.count) filter (where e.event = 'start'), 0) as starts,
        coalesce(sum(e.count) filter (where e.event = 'finish'), 0) as finishes,
        coalesce(sum(e.count) filter (where e.event = 'share'), 0) as shares,
        coalesce(sum(e.count) filter (where e.event = 'play_next'), 0) as play_next,
        (select coalesce(sum(a.count), 0) from app.event_counts a where a.game = e.game and a.event = 'finish') as finishes_all,
        (select json_agg(coalesce(d.n, 0) order by g.day) from generate_series(today - (days - 1), today, interval '1 day') as g(day)
           left join (select (h.hour at time zone 'utc')::date as day, sum(h.count) as n from app.event_counts h where h.game = e.game and h.event = 'finish' group by 1) d on d.day = g.day::date) as daily
      from app.event_counts e where e.hour > now() - make_interval(days => days)
      group by e.game order by 3 desc) x), '[]'::json),
    'today', json_build_object(
      'starts', (select coalesce(sum(count), 0) from app.event_counts where event = 'start' and hour >= date_trunc('day', now())),
      'finishes', (select coalesce(sum(count), 0) from app.event_counts where event = 'finish' and hour >= date_trunc('day', now()))),
    'finishesAll', (select coalesce(sum(count), 0) from app.event_counts where event = 'finish'),
    'accounts', (select count(*) from auth.users),
    'accounts7', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'named', (select count(*) from app.profiles where username is not null),
    'friendships', (select count(*) from app.friendships where status = 'accepted'),
    'boardsToday', coalesce((select json_object_agg(game, n) from (select game, count(*) as n from app.scores where day = today group by game) b), '{}'::json),
    'errors7', (select coalesce(sum(count), 0) from app.error_counts where hour > now() - interval '7 days'),
    'reports', (select count(distinct username) from app.reports where resolved_at is null),
    'banned', (select count(*) from app.bans));
end;
$$;

create or replace function public.admin_errors(p_token text)
returns table (day date, page text, message text, count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.admin(p_token);
  return query
    select (e.hour at time zone 'utc')::date, e.page, e.message, sum(e.count)::bigint
    from app.error_counts e where e.hour > now() - interval '14 days'
    group by 1, 2, 3 order by 1 desc, 4 desc limit 200;
end;
$$;

-- ---------- Site settings and games ----------
-- Merges a change into the settings (top-level keys only, each checked).
create or replace function public.admin_set_config(p_token text, p_patch jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare k text; v jsonb;
begin
  perform app.admin(p_token);
  if jsonb_typeof(p_patch) <> 'object' then raise exception 'bad settings'; end if;
  for k, v in select * from jsonb_each(p_patch) loop
    if k in ('disabled', 'featured', 'new') then
      if jsonb_typeof(v) <> 'array' or exists (select 1 from jsonb_array_elements_text(v) s where s !~ '^[a-z0-9-]{2,40}$') then raise exception 'bad %', k; end if;
    elsif k in ('banner', 'maintenance') then
      if jsonb_typeof(v) not in ('object', 'null') or length(coalesce(v->>'text', '')) > 200 or (v ? 'link' and coalesce(v->>'link', '') !~ '^(/[^\s]*|https://[^\s]+)?$') then raise exception 'bad %', k; end if;
    elsif k in ('rooms', 'signups') then
      if jsonb_typeof(v) <> 'boolean' then raise exception 'bad %', k; end if;
    elsif k = 'comments' then
      if v #>> '{}' not in ('off', 'review', 'on') then raise exception 'bad comments'; end if;
    elsif k in ('autoplay', 'counters') then
      if jsonb_typeof(v) <> 'object' then raise exception 'bad %', k; end if;
    else raise exception 'unknown setting %', k;
    end if;
  end loop;
  update app.site_config set value = value || p_patch, updated_at = now() where id = 1;
  perform app.log_admin('settings', p_patch);
  return public.site_config();
end;
$$;

-- A new puzzle for one daily game on one day (when the day's puzzle is broken).
create or replace function public.admin_reroll(p_token text, p_game text, p_day date)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare k text := p_game || ':' || p_day::text;
begin
  perform app.admin(p_token);
  if p_game !~ '^[a-z0-9-]{2,40}$' then raise exception 'bad game'; end if;
  update app.site_config set value = jsonb_set(value, array['rerolls', k], to_jsonb(coalesce((value #>> array['rerolls', k])::int, 0) + 1)), updated_at = now() where id = 1;
  perform app.log_admin('reroll', jsonb_build_object('game', p_game, 'day', p_day));
  return public.site_config();
end;
$$;

-- ---------- Moderation ----------
create table app.bans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reason text,
  at timestamptz not null default now()
);
alter table app.bans enable row level security;
alter table app.reports add column resolved_at timestamptz;

create table app.reserved_names (name text primary key);
alter table app.reserved_names enable row level security;
insert into app.reserved_names (name) values
  ('admin'), ('administrator'), ('pocketfair'), ('pocket_fair'), ('edwin'), ('edwinsm'), ('support'), ('help'), ('mod'), ('moderator'),
  ('staff'), ('official'), ('system'), ('root'), ('null'), ('undefined'), ('guest'), ('you'), ('me'), ('anonymous'), ('claude'), ('anthropic');

create or replace function app.username_problem(p_name text, p_uid uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare n text := lower(coalesce(p_name, ''));
begin
  if p_name is null or p_name !~ '^[A-Za-z0-9_]{3,16}$' then return 'format'; end if;
  if exists (select 1 from app.reserved_names r where r.name = n) or n like 'pocketfair%' then return 'reserved'; end if;
  if app.is_blocked(replace(p_name, '_', ' ')) or app.is_blocked(p_name) then return 'rude'; end if;
  if exists (select 1 from app.profiles where lower(username) = n and user_id <> p_uid) then return 'taken'; end if;
  if exists (select 1 from app.username_holds h where h.name_lower = n and h.until > now() and h.held_by is distinct from p_uid) then return 'held'; end if;
  return null;
end;
$$;

-- Banned players are left off boards (they can still play).
create or replace function public.daily_board(p_game text, p_day date, p_key text default null, p_limit integer default 50)
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
        and (s.user_id is null or s.user_id = uid or not exists (select 1 from app.bans bn where bn.user_id = s.user_id))
    ) x
    left join app.profiles p on p.user_id = x.user_id
    where uid is null or x.user_id is null or not exists (select 1 from app.blocks b where b.blocker = x.user_id and b.blocked = uid)
    order by x.rk, x.updated_at limit least(greatest(coalesce(p_limit, 50), 1), 50);
end;
$$;

create or replace function public.admin_reports(p_token text)
returns table (username text, reports bigint, last timestamptz, banned boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.admin(p_token);
  return query
    select r.username, count(*), max(r.created_at), exists (select 1 from app.bans b join app.profiles p on p.user_id = b.user_id where lower(p.username) = lower(r.username))
    from app.reports r where r.resolved_at is null group by r.username order by 2 desc, 3 desc limit 100;
end;
$$;

create or replace function public.admin_dismiss_reports(p_token text, p_name text)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform app.admin(p_token);
  update app.reports set resolved_at = now() where lower(username) = lower(p_name) and resolved_at is null;
  perform app.log_admin('dismissed reports', jsonb_build_object('username', p_name));
  return true;
end;
$$;

-- The player by exact username, for the admin. The email is masked unless revealed (logged).
create or replace function app.admin_target(p_name text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare them uuid := app.uid_by_name(p_name);
begin
  if them is null then raise exception 'no such player'; end if;
  return them;
end;
$$;

create or replace function public.admin_player(p_token text, p_name text)
returns json
language plpgsql stable security definer set search_path = '' as $$
declare them uuid; p app.profiles; email text;
begin
  perform app.admin(p_token);
  them := app.admin_target(p_name);
  select * into p from app.profiles where user_id = them;
  select u.email into email from auth.users u where u.id = them;
  return json_build_object('username', p.username, 'icon', p.icon, 'colour', p.colour, 'joined', p.created_at,
    'changesUsed', p.changes_used,
    'email', regexp_replace(coalesce(email, ''), '^(.)[^@]*', '\1***'),
    'results', (select count(*) from app.scores where user_id = them),
    'friends', (select count(*) from app.friendships where (a = them or b = them) and status = 'accepted'),
    'reports', (select count(*) from app.reports where lower(username) = lower(p.username) and resolved_at is null),
    'banned', exists (select 1 from app.bans where user_id = them),
    'banReason', (select reason from app.bans where user_id = them));
end;
$$;

create or replace function public.admin_reveal_email(p_token text, p_name text)
returns text
language plpgsql security definer set search_path = '' as $$
declare them uuid; email text;
begin
  perform app.admin(p_token);
  them := app.admin_target(p_name);
  select u.email into email from auth.users u where u.id = them;
  perform app.log_admin('revealed email', jsonb_build_object('username', p_name));
  return email;
end;
$$;


-- Takes the name away (held from everyone for 30 days); the player picks a new one next visit.
create or replace function public.admin_force_rename(p_token text, p_name text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare them uuid;
begin
  perform app.admin(p_token);
  them := app.admin_target(p_name);
  insert into app.username_holds (name_lower, held_by, until) values (lower(p_name), null, now() + interval '30 days')
    on conflict (name_lower) do update set held_by = null, until = excluded.until;
  update app.profiles set username = null where user_id = them;
  update app.scores set nick = null where user_id = them;
  update app.reports set resolved_at = now() where lower(username) = lower(p_name) and resolved_at is null;
  perform app.log_admin('forced rename', jsonb_build_object('username', p_name));
  return true;
end;
$$;

create or replace function public.admin_reset_changes(p_token text, p_name text)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform app.admin(p_token);
  update app.profiles set changes_used = 0 where user_id = app.admin_target(p_name);
  perform app.log_admin('reset username changes', jsonb_build_object('username', p_name));
  return true;
end;
$$;


-- A day's full board for one game, with a handle to remove a score.
create or replace function public.admin_board(p_token text, p_game text, p_day date)
returns table (rank bigint, nick text, text text, score double precision, who text, handle text, at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare r app.board_rules;
begin
  perform app.admin(p_token);
  select * into r from app.board_rules where game = p_game;
  if not found then raise exception 'unknown game'; end if;
  return query
    select rank() over (order by case when r.lower_is_better then s.score else -s.score end), s.nick, s.text, s.score,
      case when s.user_id is null then 'guest' else coalesce(p.username, 'player') end, s.device, s.updated_at
    from app.scores s left join app.profiles p on p.user_id = s.user_id
    where s.game = p_game and s.day = p_day order by 1 limit 200;
end;
$$;


-- The word filter (names, comments) and reserved usernames.
create or replace function public.admin_words(p_token text)
returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.admin(p_token);
  return json_build_object(
    'blocked', coalesce((select json_agg(word order by word) from app.blocked_words), '[]'::json),
    'reserved', coalesce((select json_agg(name order by name) from app.reserved_names), '[]'::json));
end;
$$;


-- ---------- Who may call what ----------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proowner = current_user::regrole and (p.proname like 'admin\_%' or p.proname = 'site_config') loop
    execute format('revoke all on function %s from public', f.sig);
    if f.proname = 'site_config' then execute format('grant execute on function %s to anon, authenticated', f.sig);
    else
      execute format('revoke execute on function %s from anon', f.sig);
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app' and p.proowner = current_user::regrole loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
