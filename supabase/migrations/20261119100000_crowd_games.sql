-- Set B: register the ten new games for event counting.
insert into app.games (slug) values
  ('odd-pick'), ('guess-the-crowd'), ('beat-keeper'), ('pipe-turn'), ('light-path'),
  ('pendulum-stop'), ('steady-line'), ('shape-recall'), ('higher-lower'), ('quick-draw')
on conflict do nothing;

-- Crowd numbers (Guess the Crowd): answers as a share of the question's range (0..1), kept only as
-- a 20-bucket histogram plus a running total for the mean. No answerer data is stored.
create table app.crowd_numbers (
  game text not null,
  day date not null,
  question integer not null check (question between 0 and 9999),
  bucket smallint not null check (bucket between 0 and 19),
  count integer not null default 0,
  primary key (game, day, question, bucket)
);
create table app.crowd_totals (
  game text not null,
  day date not null,
  question integer not null check (question between 0 and 9999),
  n bigint not null default 0,
  total double precision not null default 0,
  primary key (game, day, question)
);
-- Crowd picks (Odd Pick): counts per choice.
create table app.crowd_picks (
  game text not null,
  day date not null,
  question integer not null check (question between 0 and 9999),
  choice smallint not null check (choice between 0 and 4),
  count integer not null default 0,
  primary key (game, day, question, choice)
);
alter table app.crowd_numbers enable row level security;
alter table app.crowd_totals enable row level security;
alter table app.crowd_picks enable row level security;

-- Reads the histogram and mean for a question.
create or replace function public.crowd_numbers(p_game text, p_day date, p_question integer)
returns table (n bigint, mean double precision, hist integer[])
language sql security definer set search_path = '' stable as $$
  select coalesce(t.n, 0)::bigint,
         case when coalesce(t.n, 0) > 0 then t.total / t.n else null end,
         array(select coalesce((select c.count from app.crowd_numbers c
                                where c.game = p_game and c.day = p_day and c.question = p_question and c.bucket = b), 0)
               from generate_series(0, 19) b order by b)
  from (select 1) one
  left join app.crowd_totals t on t.game = p_game and t.day = p_day and t.question = p_question;
$$;

-- Adds one answer (a share of the range, 0..1) and returns the updated histogram and mean.
create or replace function public.crowd_answer(p_game text, p_day date, p_question integer, p_value double precision)
returns table (n bigint, mean double precision, hist integer[])
language plpgsql security definer set search_path = '' as $$
declare utc_day date := (now() at time zone 'utc')::date; b smallint;
begin
  if p_game not in ('guess-the-crowd') then raise exception 'unknown game'; end if;
  if p_day < utc_day - 1 or p_day > utc_day + 1 then raise exception 'day out of range'; end if;
  if p_question < 0 or p_question > 9999 or p_value is null or p_value < 0 or p_value > 1 or p_value <> p_value then raise exception 'bad answer'; end if;
  b := least(19, floor(p_value * 20))::smallint;
  insert into app.crowd_numbers (game, day, question, bucket, count) values (p_game, p_day, p_question, b, 1)
  on conflict (game, day, question, bucket) do update set count = app.crowd_numbers.count + 1;
  insert into app.crowd_totals (game, day, question, n, total) values (p_game, p_day, p_question, 1, p_value)
  on conflict (game, day, question) do update set n = app.crowd_totals.n + 1, total = app.crowd_totals.total + p_value;
  return query select * from public.crowd_numbers(p_game, p_day, p_question);
end;
$$;

-- Adds one pick. Returns nothing: Odd Pick results appear only after the day is over.
create or replace function public.crowd_pick(p_game text, p_day date, p_question integer, p_choice integer)
returns void
language plpgsql security definer set search_path = '' as $$
declare utc_day date := (now() at time zone 'utc')::date;
begin
  if p_game not in ('odd-pick') then raise exception 'unknown game'; end if;
  if p_day < utc_day - 1 or p_day > utc_day + 1 then raise exception 'day out of range'; end if;
  if p_question < 0 or p_question > 9999 or p_choice < 0 or p_choice > 4 then raise exception 'bad pick'; end if;
  insert into app.crowd_picks (game, day, question, choice, count) values (p_game, p_day, p_question, p_choice, 1)
  on conflict (game, day, question, choice) do update set count = app.crowd_picks.count + 1;
end;
$$;

-- Reads the picks for a day that is already over (in UTC), as counts for choices 0..4.
create or replace function public.crowd_picks(p_game text, p_day date, p_question integer)
returns integer[]
language plpgsql security definer set search_path = '' stable as $$
declare utc_day date := (now() at time zone 'utc')::date;
begin
  if p_day >= utc_day then raise exception 'results are not out yet'; end if;
  return array(select coalesce((select c.count from app.crowd_picks c
                                where c.game = p_game and c.day = p_day and c.question = p_question and c.choice = k), 0)
               from generate_series(0, 4) k order by k);
end;
$$;

revoke all on function public.crowd_numbers(text, date, integer) from public;
revoke all on function public.crowd_answer(text, date, integer, double precision) from public;
revoke all on function public.crowd_pick(text, date, integer, integer) from public;
revoke all on function public.crowd_picks(text, date, integer) from public;
revoke all on function public.crowd_numbers(text, date, integer) from authenticated;
revoke all on function public.crowd_answer(text, date, integer, double precision) from authenticated;
revoke all on function public.crowd_pick(text, date, integer, integer) from authenticated;
revoke all on function public.crowd_picks(text, date, integer) from authenticated;
grant execute on function public.crowd_numbers(text, date, integer) to anon;
grant execute on function public.crowd_answer(text, date, integer, double precision) to anon;
grant execute on function public.crowd_pick(text, date, integer, integer) to anon;
grant execute on function public.crowd_picks(text, date, integer) to anon;
