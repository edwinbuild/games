-- Pocket Fair event counting. No personal data: hourly counts per game and event only.
-- Tables live in a private schema the API does not expose; the browser can only call the functions below.
create schema if not exists app;
revoke all on schema app from public, anon, authenticated;

create table app.games (
  slug text primary key
);
insert into app.games (slug) values
  ('blind-timer'), ('reaction-chain'), ('odd-one-out'), ('memory-path'), ('pitch-match'), ('luckiest-person');

create table app.event_counts (
  hour timestamptz not null,
  game text not null references app.games (slug),
  event text not null check (event in ('start', 'finish', 'share', 'play_next')),
  count integer not null default 0,
  primary key (hour, game, event)
);

create table app.settings (
  key text primary key,
  value text not null
);
insert into app.settings (key, value) values ('stats_key', replace(gen_random_uuid()::text, '-', ''));

alter table app.games enable row level security;
alter table app.event_counts enable row level security;
alter table app.settings enable row level security;

create or replace function public.log_event(p_game text, p_event text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from app.games g where g.slug = p_game) then return; end if;
  if p_event not in ('start', 'finish', 'share', 'play_next') then return; end if;
  insert into app.event_counts (hour, game, event, count)
  values (date_trunc('hour', now()), p_game, p_event, 1)
  on conflict (hour, game, event) do update set count = app.event_counts.count + 1;
end;
$$;

create or replace function public.recent_plays()
returns table (game text, plays bigint) language sql security definer set search_path = '' stable as $$
  select e.game, sum(e.count)::bigint
  from app.event_counts e
  where e.event = 'finish' and e.hour > now() - interval '24 hours'
  group by e.game;
$$;

create or replace function public.stats(p_key text, p_days integer default 14)
returns table (day date, game text, starts bigint, finishes bigint, shares bigint, play_next bigint)
language plpgsql security definer set search_path = '' stable as $$
begin
  if p_key is null or p_key <> (select s.value from app.settings s where s.key = 'stats_key') then
    raise exception 'not allowed';
  end if;
  return query
    select (e.hour at time zone 'utc')::date as day, e.game,
           coalesce(sum(e.count) filter (where e.event = 'start'), 0)::bigint,
           coalesce(sum(e.count) filter (where e.event = 'finish'), 0)::bigint,
           coalesce(sum(e.count) filter (where e.event = 'share'), 0)::bigint,
           coalesce(sum(e.count) filter (where e.event = 'play_next'), 0)::bigint
    from app.event_counts e
    where e.hour > now() - make_interval(days => least(greatest(p_days, 1), 90))
    group by 1, 2 order by 1 desc, 2;
end;
$$;

revoke all on function public.log_event(text, text) from public;
revoke all on function public.recent_plays() from public;
revoke all on function public.stats(text, integer) from public;
grant execute on function public.log_event(text, text) to anon, authenticated;
grant execute on function public.recent_plays() to anon, authenticated;
grant execute on function public.stats(text, integer) to anon, authenticated;
