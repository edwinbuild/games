-- Register the next ten games for event counting.
insert into app.games (slug) values
  ('tap-duel'), ('this-or-that'), ('color-recall'), ('count-flash'), ('tug-of-taps'),
  ('angle-eye'), ('reaction-online'), ('flip-grid'), ('spot-race'), ('stack-tower')
on conflict do nothing;

-- This or That: vote counts per day, question and choice. No voter data is stored.
create table app.votes (
  day date not null,
  question integer not null check (question between 0 and 9999),
  choice smallint not null check (choice in (0, 1)),
  count integer not null default 0,
  primary key (day, question, choice)
);
alter table app.votes enable row level security;

-- Adds one vote and returns the split. The day is the player's local date, so it may be
-- one day either side of the UTC date; anything else is refused.
create or replace function public.vote(p_day date, p_question integer, p_choice integer)
returns table (a bigint, b bigint)
language plpgsql security definer set search_path = '' as $$
declare utc_day date := (now() at time zone 'utc')::date;
begin
  if p_day < utc_day - 1 or p_day > utc_day + 1 then raise exception 'day out of range'; end if;
  if p_question < 0 or p_question > 9999 or p_choice not in (0, 1) then raise exception 'bad vote'; end if;
  insert into app.votes (day, question, choice, count) values (p_day, p_question, p_choice, 1)
  on conflict (day, question, choice) do update set count = app.votes.count + 1;
  return query
    select coalesce(sum(v.count) filter (where v.choice = 0), 0)::bigint,
           coalesce(sum(v.count) filter (where v.choice = 1), 0)::bigint
    from app.votes v where v.day = p_day and v.question = p_question;
end;
$$;

create or replace function public.split(p_day date, p_question integer)
returns table (a bigint, b bigint)
language sql security definer set search_path = '' stable as $$
  select coalesce(sum(v.count) filter (where v.choice = 0), 0)::bigint,
         coalesce(sum(v.count) filter (where v.choice = 1), 0)::bigint
  from app.votes v where v.day = p_day and v.question = p_question;
$$;

revoke all on function public.vote(date, integer, integer) from public;
revoke all on function public.split(date, integer) from public;
grant execute on function public.vote(date, integer, integer) to anon;
grant execute on function public.split(date, integer) to anon;
