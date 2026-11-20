-- Part H: votes, comments, play counts and players online. Nothing here deletes rows: a removed
-- comment is marked, a vote is set to 0, a tab that leaves just stops saying it's here.

-- ---------- Votes: 👍 / 👎 per game, one per player (account, or device for guests) ----------
create table app.game_votes (
  game text not null,
  voter text not null, -- 'u:<id>' or the hash of the guest's browser key
  vote smallint not null check (vote in (-1, 0, 1)),
  at timestamptz not null default now(),
  primary key (game, voter)
);
alter table app.game_votes enable row level security;

create or replace function public.vote_game(p_game text, p_key text, p_vote integer)
returns json
language plpgsql security definer set search_path = '' as $$
declare v text; prev app.game_votes;
begin
  if not exists (select 1 from app.games g where g.slug = p_game) then raise exception 'unknown game'; end if;
  if p_vote not in (-1, 0, 1) then raise exception 'bad vote'; end if;
  if auth.uid() is null and (p_key is null or p_key !~ '^[0-9a-f]{32}$') then raise exception 'bad key'; end if;
  v := app.device_for(p_key);
  select * into prev from app.game_votes where game = p_game and voter = v;
  if found and prev.at > now() - interval '2 seconds' then raise exception 'too fast'; end if;
  insert into app.game_votes (game, voter, vote) values (p_game, v, p_vote)
    on conflict (game, voter) do update set vote = excluded.vote, at = now();
  return json_build_object('vote', p_vote);
end;
$$;

create or replace function public.my_game_vote(p_game text, p_key text)
returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce((select vote from app.game_votes where game = p_game and voter = app.device_for(p_key)), 0)::int
$$;

-- ---------- Players online: each open page says "still here" once a minute ----------
create table app.heartbeats (
  tab text primary key, -- a random id made by the page, nothing else
  game text,
  at timestamptz not null default now()
);
create index heartbeats_at on app.heartbeats (at);
alter table app.heartbeats enable row level security;

create or replace function public.heartbeat(p_tab text, p_game text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_tab is null or p_tab !~ '^[0-9a-z]{12,32}$' then return; end if;
  if p_game is not null and not exists (select 1 from app.games g where g.slug = p_game) then p_game := null; end if;
  insert into app.heartbeats (tab, game, at) values (p_tab, p_game, now())
    on conflict (tab) do update set game = excluded.game, at = now()
    where app.heartbeats.at < now() - interval '30 seconds';
end;
$$;

-- What the home page and game pages show: plays (all time), likes, and who's here now.
create or replace function public.game_stats()
returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'plays', coalesce((select json_object_agg(game, n) from (select game, sum(count) as n from app.event_counts where event = 'finish' group by game) p), '{}'::json),
    'likes', coalesce((select json_object_agg(game, json_build_object('pct', pct, 'n', n)) from (
        select game, count(*) filter (where vote <> 0) as n,
          round(100.0 * count(*) filter (where vote = 1) / nullif(count(*) filter (where vote <> 0), 0)) as pct
        from app.game_votes group by game) l where l.n >= 20), '{}'::json),
    'online', (select count(*) from app.heartbeats where at > now() - interval '3 minutes'),
    'onlineByGame', coalesce((select json_object_agg(game, n) from (select game, count(*) as n from app.heartbeats where at > now() - interval '3 minutes' and game is not null group by game) o), '{}'::json))
$$;

-- ---------- Comments ----------
create table app.comments (
  id bigint generated always as identity primary key,
  game text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (length(body) between 1 and 280),
  status text not null check (status in ('pending', 'visible', 'hidden', 'removed')),
  likes integer not null default 0,
  reports integer not null default 0,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_game on app.comments (game, status, created_at desc);
create index comments_user on app.comments (user_id, created_at desc);
alter table app.comments enable row level security;

create table app.comment_likes (
  comment_id bigint not null references app.comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  liked boolean not null default true,
  primary key (comment_id, user_id)
);
alter table app.comment_likes enable row level security;

create table app.comment_reports (
  comment_id bigint not null references app.comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
alter table app.comment_reports enable row level security;

create or replace function app.comments_mode() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select value->>'comments' from app.site_config where id = 1), 'review')
$$;

-- Why a comment can't be posted, or null. Links, the word filter, and the rate limits.
create or replace function app.comment_problem(p_uid uuid, p_body text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare b text := btrim(coalesce(p_body, ''));
begin
  if app.comments_mode() = 'off' then return 'comments off'; end if;
  if exists (select 1 from app.bans where user_id = p_uid) then return 'banned'; end if;
  if (select username from app.profiles where user_id = p_uid) is null then return 'no username'; end if;
  if length(b) < 1 or length(b) > 280 then return 'length'; end if;
  if b ~* '(https?://|www\.|\m[a-z0-9-]+\.(com|net|org|io|co|me|ly|gg|app|xyz|info|ru|cn)\M)' then return 'link'; end if;
  if app.is_blocked(b) then return 'rude'; end if;
  if exists (select 1 from app.comments where user_id = p_uid and created_at > now() - interval '1 minute') then return 'too fast'; end if;
  if (select count(*) from app.comments where user_id = p_uid and created_at > now() - interval '1 day') >= 10 then return 'too many'; end if;
  return null;
end;
$$;

create or replace function public.post_comment(p_game text, p_body text)
returns json
language plpgsql security definer set search_path = '' as $$
declare uid uuid := app.need_me(); problem text; c app.comments;
begin
  if not exists (select 1 from app.games g where g.slug = p_game) then raise exception 'unknown game'; end if;
  problem := app.comment_problem(uid, p_body);
  if problem is not null then raise exception 'comment %', problem; end if;
  insert into app.comments (game, user_id, body, status)
    values (p_game, uid, btrim(p_body), case when app.comments_mode() = 'on' then 'visible' else 'pending' end)
    returning * into c;
  return json_build_object('id', c.id, 'status', c.status);
end;
$$;

-- A game's comments: visible ones, plus your own while they wait for review.
create or replace function public.game_comments(p_game text, p_sort text default 'new', p_limit integer default 50)
returns table (id bigint, username text, icon text, colour text, body text, likes integer, liked boolean, mine boolean, pending boolean, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, p.username, p.icon, p.colour, c.body, c.likes,
    coalesce((select l.liked from app.comment_likes l where l.comment_id = c.id and l.user_id = auth.uid()), false),
    c.user_id = auth.uid(), c.status = 'pending', c.created_at
  from app.comments c join app.profiles p on p.user_id = c.user_id
  where c.game = p_game and app.comments_mode() <> 'off'
    and (c.status = 'visible' or (c.status = 'pending' and c.user_id = auth.uid()))
    and (auth.uid() is null or not exists (select 1 from app.blocks b where (b.blocker = auth.uid() and b.blocked = c.user_id) or (b.blocker = c.user_id and b.blocked = auth.uid())))
  order by case when p_sort = 'top' then c.likes else 0 end desc, c.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;

create or replace function public.like_comment(p_id bigint, p_on boolean)
returns integer
language plpgsql security definer set search_path = '' as $$
declare uid uuid := app.need_me(); was boolean; n integer;
begin
  if not exists (select 1 from app.comments where id = p_id and status = 'visible') then raise exception 'no such comment'; end if;
  select liked into was from app.comment_likes where comment_id = p_id and user_id = uid;
  insert into app.comment_likes (comment_id, user_id, liked) values (p_id, uid, p_on)
    on conflict (comment_id, user_id) do update set liked = excluded.liked;
  if coalesce(was, false) <> p_on then
    update app.comments set likes = greatest(0, likes + case when p_on then 1 else -1 end) where id = p_id returning likes into n;
  else select likes into n from app.comments where id = p_id; end if;
  return n;
end;
$$;

-- Three reports hide a comment until the admin looks (an approved comment stays up).
create or replace function public.report_comment(p_id bigint)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := app.need_me(); n int;
begin
  insert into app.comment_reports (comment_id, user_id) values (p_id, uid) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 1 then
    update app.comments set reports = reports + 1,
      status = case when reports + 1 >= 3 and not approved and status = 'visible' then 'hidden' else status end
    where id = p_id;
  end if;
  return true;
end;
$$;

create or replace function public.remove_my_comment(p_id bigint)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update app.comments set status = 'removed' where id = p_id and user_id = app.need_me();
  return true;
end;
$$;

-- ---------- Admin: comments ----------
create or replace function public.admin_comments(p_token text, p_status text default 'pending')
returns table (id bigint, game text, username text, body text, status text, likes integer, reports integer, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.admin(p_token);
  return query
    select c.id, c.game, p.username, c.body, c.status, c.likes, c.reports, c.created_at
    from app.comments c left join app.profiles p on p.user_id = c.user_id
    where p_status = 'all' or c.status = p_status or (p_status = 'reported' and c.reports > 0 and c.status <> 'removed')
    order by c.created_at desc limit 200;
end;
$$;

create or replace function public.admin_set_comment(p_token text, p_id bigint, p_status text)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform app.admin(p_token);
  if p_status not in ('visible', 'hidden', 'removed') then raise exception 'bad status'; end if;
  update app.comments set status = p_status, approved = (p_status = 'visible') where id = p_id;
  perform app.log_admin('comment ' || p_status, jsonb_build_object('id', p_id));
  return true;
end;
$$;

-- The admin dashboard also shows likes, comments waiting and who's online.
create or replace function public.admin_community(p_token text)
returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.admin(p_token);
  return json_build_object(
    'votes', coalesce((select json_object_agg(game, json_build_object('up', up, 'down', down)) from (
       select game, count(*) filter (where vote = 1) as up, count(*) filter (where vote = -1) as down from app.game_votes group by game) v), '{}'::json),
    'commentsPending', (select count(*) from app.comments where status = 'pending'),
    'commentsReported', (select count(*) from app.comments where reports > 0 and status not in ('removed')),
    'online', (select count(*) from app.heartbeats where at > now() - interval '3 minutes'),
    'onlineByGame', coalesce((select json_object_agg(game, n) from (select game, count(*) as n from app.heartbeats where at > now() - interval '3 minutes' and game is not null group by game) o), '{}'::json));
end;
$$;

-- ---------- Who may call what ----------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proowner = current_user::regrole
      and p.proname in ('vote_game', 'my_game_vote', 'heartbeat', 'game_stats', 'game_comments', 'post_comment', 'like_comment', 'report_comment', 'remove_my_comment', 'admin_comments', 'admin_set_comment', 'admin_community') loop
    execute format('revoke all on function %s from public', f.sig);
    if f.proname in ('vote_game', 'my_game_vote', 'heartbeat', 'game_stats', 'game_comments') then
      execute format('grant execute on function %s to anon, authenticated', f.sig);
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
