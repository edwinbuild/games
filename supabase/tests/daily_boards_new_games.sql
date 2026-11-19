-- Tests for the new games' boards (supabase/migrations/20261119180000_daily_boards_new_games.sql).
-- Ends by raising 'ALL NEW BOARD TESTS PASSED (rolled back)', so no rows are kept.
do $$
declare d date := (now() at time zone 'utc')::date; r record;
begin
  perform public.submit_score('untangle-lights', d, repeat('a', 32), 9, '9 moves');
  perform public.submit_score('word-ladder', d, repeat('a', 32), 4, '4 steps');
  perform public.submit_score('garden-path', d, repeat('a', 32), 84, '1:24');
  perform public.submit_score('rule-stack', d, repeat('a', 32), 119815, '12/12 in 3:05');
  perform public.submit_score('rule-stack', d, repeat('b', 32), 70000, '7/12');
  select * into r from public.my_rank('rule-stack', d, repeat('a', 32));
  if r.rank <> 1 then raise exception 'FAIL rule-stack: more levels should rank first %', r; end if;
  begin perform public.submit_score('word-ladder', d, repeat('c', 32), 31, '31 steps'); raise exception 'FAIL out of range accepted'; exception when others then if sqlerrm not like '%out of range%' then raise; end if; end;
  raise exception 'ALL NEW BOARD TESTS PASSED (rolled back)';
end $$;
