-- Daily leaderboards without accounts.
-- A player is a random 128-bit key kept in their browser; only its SHA-256 is stored.
-- One row per player, game and day, keeping the best score. Scores come from the browser, so
-- each game's possible range is checked here, updates are rate limited, and nicknames pass the
-- same word filter as the site (src/shell/filter.ts, copied into app.blocked_words).

create table app.board_rules (
  game text primary key,
  lower_is_better boolean not null,
  lo double precision not null,
  hi double precision not null
);
alter table app.board_rules enable row level security;
insert into app.board_rules (game, lower_is_better, lo, hi) values
  ('blind-timer', true, 0, 60),
  ('pitch-match', false, 0, 100),
  ('color-recall', false, 0, 100),
  ('count-flash', true, 0, 1000),
  ('flip-grid', true, 1, 200),
  ('stack-tower', false, 0, 200),
  ('pour-line', true, 0, 100),
  ('chain-pop', false, 1, 60),
  ('fair-slice', true, 0, 50),
  ('domino-drop', false, 0, 40),
  ('beat-keeper', true, 0, 2000),
  ('pipe-turn', true, 1, 500),
  ('light-path', true, 1000, 3999),
  ('steady-line', false, -999, 100000),
  ('shape-recall', false, 0, 100),
  ('paint-mix', false, 0, 100),
  ('balance-beam', true, 1, 10);

create table app.scores (
  game text not null references app.board_rules (game),
  day date not null,
  device text not null,
  score double precision not null,
  text text not null,
  nick text,
  updated_at timestamptz not null default now(),
  primary key (game, day, device)
);
create index scores_board on app.scores (game, day, score);
alter table app.scores enable row level security;

create table app.blocked_words (word text primary key);
alter table app.blocked_words enable row level security;
insert into app.blocked_words (word) values ('fuck'),('shit'),('cunt'),('bitch'),('bastard'),('dick'),('cock'),('pussy'),('whore'),('slut'),('fag'),('faggot'),('nigger'),('nigga'),('retard'),('rape'),('nazi'),('kike'),('spic'),('chink'),('tranny'),('wank'),('twat'),('porn');

-- Same rules as isBlocked() in src/shell/filter.ts: letter swaps undone, word by word, plurals, long words anywhere.
create or replace function app.is_blocked(p text) returns boolean
language sql stable security definer set search_path = '' as $$
  with tokens as (
    select regexp_replace(translate(lower(t), '@4310!$57+', 'aaeiioosstt'), '[^a-z]', '', 'g') as t
    from unnest(regexp_split_to_array(coalesce(p, ''), '\s+')) as t
    union all
    select regexp_replace(translate(lower(p), '@4310!$57+', 'aaeiioosstt'), '[^a-z]', '', 'g')
  )
  select exists (
    select 1 from tokens k join app.blocked_words w
      on k.t <> '' and (k.t = w.word or k.t = w.word || 's' or k.t = w.word || 'es' or (length(w.word) >= 5 and position(w.word in k.t) > 0))
  );
$$;

create or replace function public.my_rank(p_game text, p_day date, p_key text)
returns table (rank bigint, total bigint, better_than integer)
language plpgsql stable security definer set search_path = '' as $$
declare r app.board_rules; dev text; mine double precision;
begin
  select * into r from app.board_rules where game = p_game;
  if not found then raise exception 'unknown game'; end if;
  dev := encode(extensions.digest(coalesce(p_key, ''), 'sha256'), 'hex');
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

create or replace function public.submit_score(p_game text, p_day date, p_key text, p_score double precision, p_text text, p_nick text default null)
returns table (rank bigint, total bigint, better_than integer)
language plpgsql security definer set search_path = '' as $$
declare r app.board_rules; dev text; prev app.scores; utc_day date := (now() at time zone 'utc')::date; v_nick text; better boolean;
begin
  select * into r from app.board_rules where game = p_game;
  if not found then raise exception 'unknown game'; end if;
  if p_day < utc_day - 1 or p_day > utc_day + 1 then raise exception 'day out of range'; end if;
  if p_score is null or p_score <> p_score or p_score < r.lo or p_score > r.hi then raise exception 'score out of range'; end if;
  if p_key is null or p_key !~ '^[0-9a-f]{32}$' then raise exception 'bad key'; end if;
  if p_text is null or length(p_text) = 0 or length(p_text) > 24 then raise exception 'bad text'; end if;
  v_nick := nullif(btrim(coalesce(p_nick, '')), '');
  if v_nick is not null and (length(v_nick) > 16 or v_nick !~ '^[[:alnum:] _.''-]+$' or app.is_blocked(v_nick)) then v_nick := null; end if;
  dev := encode(extensions.digest(p_key, 'sha256'), 'hex');
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
    insert into app.scores (game, day, device, score, text, nick) values (p_game, p_day, dev, p_score, p_text, v_nick);
  end if;
  return query select * from public.my_rank(p_game, p_day, p_key);
end;
$$;

create or replace function public.daily_board(p_game text, p_day date, p_key text default null, p_limit integer default 50)
returns table (rank bigint, nick text, text text, mine boolean)
language plpgsql stable security definer set search_path = '' as $$
declare r app.board_rules; dev text;
begin
  select * into r from app.board_rules where game = p_game;
  if not found then raise exception 'unknown game'; end if;
  dev := encode(extensions.digest(coalesce(p_key, ''), 'sha256'), 'hex');
  return query
    select x.rk, x.nick, x.text, x.device = dev from (
      select s.device, s.nick, s.text, s.updated_at,
        rank() over (order by case when r.lower_is_better then s.score else -s.score end) as rk
      from app.scores s where s.game = p_game and s.day = p_day
    ) x order by x.rk, x.updated_at limit least(greatest(coalesce(p_limit, 50), 1), 50);
end;
$$;

revoke all on function public.submit_score(text, date, text, double precision, text, text) from public;
revoke all on function public.my_rank(text, date, text) from public;
revoke all on function public.daily_board(text, date, text, integer) from public;
revoke all on function app.is_blocked(text) from public;
grant execute on function public.submit_score(text, date, text, double precision, text, text) to anon;
grant execute on function public.my_rank(text, date, text) to anon;
grant execute on function public.daily_board(text, date, text, integer) to anon;
