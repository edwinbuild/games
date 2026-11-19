-- Launch checklist (Part F): limits on the public write functions, a small error log, and the
-- games missing from app.games (their events were being dropped).

-- 1. Every game on the site counts its events.
insert into app.games (slug) values
  ('chain-pop'), ('fair-slice'), ('domino-drop'), ('pour-line'), ('tidy-up'), ('paint-mix'), ('orbit-drop'),
  ('balance-beam'), ('untangle-lights'), ('word-ladder'), ('garden-path'), ('rule-stack'), ('dots-and-boxes')
on conflict do nothing;

-- 2. One answer per device per question. A device is the SHA-256 of the random key its browser
-- already keeps for the boards; rows older than two days are cleared as new answers arrive.
create table app.answered (
  kind text not null,
  day date not null,
  question integer not null,
  device text not null,
  primary key (kind, day, question, device)
);
create index answered_day on app.answered (day);
alter table app.answered enable row level security;

create or replace function app.first_answer(p_kind text, p_day date, p_question integer, p_key text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if p_key is null or p_key !~ '^[0-9a-f]{32}$' then raise exception 'bad key'; end if;
  if random() < 0.02 then delete from app.answered where day < (now() at time zone 'utc')::date - 2; end if;
  insert into app.answered (kind, day, question, device)
  values (p_kind, p_day, p_question, encode(extensions.digest(p_key, 'sha256'), 'hex'))
  on conflict do nothing;
  get diagnostics n = row_count;
  return n = 1;
end;
$$;
revoke all on function app.first_answer(text, date, integer, text) from public;

-- New versions of the three answer functions take the key; a repeat answer is not counted again
-- (the reply is the same, so the page behaves as before). The old versions are dropped once the
-- site that sends the key is live (next migration).
create or replace function public.vote(p_day date, p_question integer, p_choice integer, p_key text)
returns table (a bigint, b bigint)
language plpgsql security definer set search_path = '' as $$
declare utc_day date := (now() at time zone 'utc')::date;
begin
  if p_day < utc_day - 1 or p_day > utc_day + 1 then raise exception 'day out of range'; end if;
  if p_question < 0 or p_question > 9999 or p_choice not in (0, 1) then raise exception 'bad vote'; end if;
  if app.first_answer('vote', p_day, p_question, p_key) then
    insert into app.votes (day, question, choice, count) values (p_day, p_question, p_choice, 1)
    on conflict (day, question, choice) do update set count = app.votes.count + 1;
  end if;
  return query
    select coalesce(sum(v.count) filter (where v.choice = 0), 0)::bigint,
           coalesce(sum(v.count) filter (where v.choice = 1), 0)::bigint
    from app.votes v where v.day = p_day and v.question = p_question;
end;
$$;

create or replace function public.crowd_answer(p_game text, p_day date, p_question integer, p_value double precision, p_key text)
returns table (n bigint, mean double precision, hist integer[])
language plpgsql security definer set search_path = '' as $$
declare utc_day date := (now() at time zone 'utc')::date; b smallint;
begin
  if p_game not in ('guess-the-crowd') then raise exception 'unknown game'; end if;
  if p_day < utc_day - 1 or p_day > utc_day + 1 then raise exception 'day out of range'; end if;
  if p_question < 0 or p_question > 9999 or p_value is null or p_value < 0 or p_value > 1 or p_value <> p_value then raise exception 'bad answer'; end if;
  if app.first_answer(p_game, p_day, p_question, p_key) then
    b := least(19, floor(p_value * 20))::smallint;
    insert into app.crowd_numbers (game, day, question, bucket, count) values (p_game, p_day, p_question, b, 1)
    on conflict (game, day, question, bucket) do update set count = app.crowd_numbers.count + 1;
    insert into app.crowd_totals (game, day, question, n, total) values (p_game, p_day, p_question, 1, p_value)
    on conflict (game, day, question) do update set n = app.crowd_totals.n + 1, total = app.crowd_totals.total + p_value;
  end if;
  return query select * from public.crowd_numbers(p_game, p_day, p_question);
end;
$$;

create or replace function public.crowd_pick(p_game text, p_day date, p_question integer, p_choice integer, p_key text)
returns void
language plpgsql security definer set search_path = '' as $$
declare utc_day date := (now() at time zone 'utc')::date;
begin
  if p_game not in ('odd-pick') then raise exception 'unknown game'; end if;
  if p_day < utc_day - 1 or p_day > utc_day + 1 then raise exception 'day out of range'; end if;
  if p_question < 0 or p_question > 9999 or p_choice < 0 or p_choice > 4 then raise exception 'bad pick'; end if;
  if app.first_answer(p_game, p_day, p_question, p_key) then
    insert into app.crowd_picks (game, day, question, choice, count) values (p_game, p_day, p_question, p_choice, 1)
    on conflict (game, day, question, choice) do update set count = app.crowd_picks.count + 1;
  end if;
end;
$$;

-- 3. Event counts stop growing at 100,000 per game, event and hour (far above real traffic), so a
-- script can't blow up the numbers.
create or replace function public.log_event(p_game text, p_event text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from app.games g where g.slug = p_game) then return; end if;
  if p_event not in ('start', 'finish', 'share', 'play_next') then return; end if;
  insert into app.event_counts (hour, game, event, count)
  values (date_trunc('hour', now()), p_game, p_event, 1)
  on conflict (hour, game, event) do update set count = app.event_counts.count + 1
  where app.event_counts.count < 100000;
end;
$$;

-- 4. Browser errors: the page and the first line of the message, counted per hour. No device,
-- no address, nothing else. At most 200 different messages an hour and 10,000 of each.
create table app.error_counts (
  hour timestamptz not null,
  page text not null,
  message text not null,
  count integer not null default 1,
  primary key (hour, page, message)
);
alter table app.error_counts enable row level security;

create or replace function public.log_error(p_page text, p_message text)
returns void
language plpgsql security definer set search_path = '' as $$
declare h timestamptz := date_trunc('hour', now()); m text;
begin
  if p_page is null or (p_page not in ('home', 'about', 'category') and not exists (select 1 from app.games g where g.slug = p_page)) then return; end if;
  m := left(btrim(split_part(coalesce(p_message, ''), E'\n', 1)), 160);
  if m = '' then return; end if;
  if not exists (select 1 from app.error_counts e where e.hour = h and e.page = p_page and e.message = m)
     and (select count(*) from app.error_counts e where e.hour = h) >= 200 then return; end if;
  insert into app.error_counts (hour, page, message, count) values (h, p_page, m, 1)
  on conflict (hour, page, message) do update set count = app.error_counts.count + 1
  where app.error_counts.count < 10000;
end;
$$;

-- The stats page reads the last days' errors with the same private key as the other stats.
create or replace function public.error_stats(p_key text, p_days integer default 7)
returns table (day date, page text, message text, count bigint)
language plpgsql security definer set search_path = '' stable as $$
begin
  if p_key is null or p_key <> (select s.value from app.settings s where s.key = 'stats_key') then
    raise exception 'not allowed';
  end if;
  return query
    select (e.hour at time zone 'utc')::date, e.page, e.message, sum(e.count)::bigint
    from app.error_counts e
    where e.hour > now() - make_interval(days => least(greatest(p_days, 1), 30))
    group by 1, 2, 3 order by 1 desc, 4 desc;
end;
$$;

revoke all on function public.vote(date, integer, integer, text) from public;
revoke all on function public.crowd_answer(text, date, integer, double precision, text) from public;
revoke all on function public.crowd_pick(text, date, integer, integer, text) from public;
revoke all on function public.log_error(text, text) from public;
revoke all on function public.error_stats(text, integer) from public;
grant execute on function public.vote(date, integer, integer, text) to anon;
grant execute on function public.crowd_answer(text, date, integer, double precision, text) to anon;
grant execute on function public.crowd_pick(text, date, integer, integer, text) to anon;
grant execute on function public.log_error(text, text) to anon;
grant execute on function public.error_stats(text, integer) to anon;
revoke execute on function public.vote(date, integer, integer, text) from authenticated;
revoke execute on function public.crowd_answer(text, date, integer, double precision, text) from authenticated;
revoke execute on function public.crowd_pick(text, date, integer, integer, text) from authenticated;
revoke execute on function public.log_error(text, text) from authenticated;
revoke execute on function public.error_stats(text, integer) from authenticated;
