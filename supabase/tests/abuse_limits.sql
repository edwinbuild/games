-- Tests for supabase/migrations/20261119190000_abuse_limits.sql, plus a load test of the boards
-- with 5,000 fake players. Ends by raising 'ALL LIMIT TESTS PASSED (rolled back)', so nothing is kept.
do $$
declare d date := (now() at time zone 'utc')::date; k1 text := repeat('a', 32); k2 text := repeat('b', 32);
  r record; n bigint; t0 timestamptz; ms numeric;
begin
  -- Votes: a second vote from the same device isn't counted; another device's is.
  select * into r from public.vote(d, 9001, 0, k1);
  if r.a <> 1 then raise exception 'FAIL first vote %', r; end if;
  select * into r from public.vote(d, 9001, 0, k1);
  if r.a <> 1 then raise exception 'FAIL repeat vote counted %', r; end if;
  select * into r from public.vote(d, 9001, 1, k2);
  if r.a <> 1 or r.b <> 1 then raise exception 'FAIL second device %', r; end if;
  begin perform public.vote(d, 9001, 0, 'nope'); raise exception 'FAIL bad key accepted'; exception when others then if sqlerrm not like '%bad key%' then raise; end if; end;
  -- Crowd answers and picks: once per device and question.
  select * into r from public.crowd_answer('guess-the-crowd', d, 9001, 0.5, k1);
  select * into r from public.crowd_answer('guess-the-crowd', d, 9001, 0.9, k1);
  if r.n <> 1 then raise exception 'FAIL repeat crowd answer counted %', r; end if;
  perform public.crowd_pick('odd-pick', d, 9001, 2, k1);
  perform public.crowd_pick('odd-pick', d, 9001, 2, k1);
  select sum(count) into n from app.crowd_picks where game = 'odd-pick' and day = d and question = 9001;
  if n <> 1 then raise exception 'FAIL repeat pick counted %', n; end if;
  -- Event counts stop at 100,000 an hour.
  perform public.log_event('dots-and-boxes', 'start');
  update app.event_counts set count = 100000 where game = 'dots-and-boxes' and event = 'start' and hour = date_trunc('hour', now());
  perform public.log_event('dots-and-boxes', 'start');
  select count into n from app.event_counts where game = 'dots-and-boxes' and event = 'start' and hour = date_trunc('hour', now());
  if n <> 100000 then raise exception 'FAIL event cap %', n; end if;
  -- Errors: known pages only, first line only, 160 characters.
  perform public.log_error('rule-stack', 'TypeError: x is undefined' || E'\n' || 'at secret stack');
  perform public.log_error('rule-stack', 'TypeError: x is undefined');
  perform public.log_error('not-a-page', 'nope');
  perform public.log_error('home', repeat('z', 500));
  select count into n from app.error_counts where page = 'rule-stack' and message = 'TypeError: x is undefined';
  if n <> 2 then raise exception 'FAIL error count %', n; end if;
  if exists (select 1 from app.error_counts where page = 'not-a-page' or message like '%secret%' or length(message) > 160) then raise exception 'FAIL error filter'; end if;
  begin perform public.error_stats('wrong', 7); raise exception 'FAIL error stats open'; exception when others then if sqlerrm not like '%not allowed%' then raise; end if; end;
  -- Load: 5,000 players on one board, then time a rank and the top 50.
  insert into app.board_rules values ('e2e-load', true, 0, 100000);
  insert into app.scores (game, day, device, score, text)
    select 'e2e-load', d, md5(i::text), (random() * 100000)::int, 'x' from generate_series(1, 5000) i;
  perform public.submit_score('e2e-load', d, k1, 500, '500');
  t0 := clock_timestamp();
  for i in 1..20 loop perform * from public.my_rank('e2e-load', d, k1); perform * from public.daily_board('e2e-load', d, k1, 50); end loop;
  ms := extract(epoch from clock_timestamp() - t0) * 1000 / 20;
  if ms > 50 then raise exception 'FAIL board too slow: % ms per rank + top 50', round(ms, 1); end if;
  raise exception 'ALL LIMIT TESTS PASSED (rolled back) · rank + top 50 of 5,000 in % ms', round(ms, 1);
end $$;
