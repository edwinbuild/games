-- Tests for the daily leaderboards (supabase/migrations/20261119170000_daily_boards.sql).
-- Run against the database: everything happens in one block that ends by raising
-- 'ALL BOARD TESTS PASSED (rolled back)', so no test rows are ever kept. Any other error is a failure.
do $$
declare d date := (now() at time zone 'utc')::date; k1 text := repeat('a', 32); k2 text := repeat('b', 32); k3 text := repeat('c', 32); r record; n int;
begin
  insert into app.board_rules values ('e2e-test', true, 0, 100);
  begin perform public.submit_score('nope', d, k1, 5, '5'); raise exception 'FAIL unknown game accepted'; exception when others then if sqlerrm not like '%unknown game%' then raise; end if; end;
  begin perform public.submit_score('e2e-test', d, k1, 500, '500'); raise exception 'FAIL out of range accepted'; exception when others then if sqlerrm not like '%out of range%' then raise; end if; end;
  begin perform public.submit_score('e2e-test', d, 'short', 5, '5'); raise exception 'FAIL bad key accepted'; exception when others then if sqlerrm not like '%bad key%' then raise; end if; end;
  begin perform public.submit_score('e2e-test', d - 5, k1, 5, '5'); raise exception 'FAIL old day accepted'; exception when others then if sqlerrm not like '%day out of range%' then raise; end if; end;
  select * into r from public.submit_score('e2e-test', d, k1, 40, '40 s', 'Sam');
  if r.rank <> 1 or r.total <> 1 then raise exception 'FAIL first rank %', r; end if;
  begin perform public.submit_score('e2e-test', d, k1, 30, '30 s'); raise exception 'FAIL too fast accepted'; exception when others then if sqlerrm not like '%too fast%' then raise; end if; end;
  update app.scores set updated_at = now() - interval '1 minute' where game = 'e2e-test';
  perform public.submit_score('e2e-test', d, k1, 30, '30 s');
  update app.scores set updated_at = now() - interval '1 minute' where game = 'e2e-test';
  perform public.submit_score('e2e-test', d, k1, 50, '50 s');
  select count(*) into n from app.scores where game = 'e2e-test' and score = 30 and text = '30 s' and nick = 'Sam';
  if n <> 1 then raise exception 'FAIL best not kept'; end if;
  perform public.submit_score('e2e-test', d, k2, 20, '20 s', 'sh1t head');
  perform public.submit_score('e2e-test', d, k3, 30, '30 s', 'grapes');
  if exists (select 1 from app.scores where game = 'e2e-test' and nick ilike 'sh1t%') then raise exception 'FAIL blocked nick kept'; end if;
  if not exists (select 1 from app.scores where game = 'e2e-test' and nick = 'grapes') then raise exception 'FAIL innocent nick dropped'; end if;
  select * into r from public.my_rank('e2e-test', d, k2);
  if r.rank <> 1 or r.total <> 3 or r.better_than <> 100 then raise exception 'FAIL rank k2 %', r; end if;
  select * into r from public.my_rank('e2e-test', d, k1);
  if r.rank <> 2 or r.better_than <> 0 then raise exception 'FAIL rank k1 %', r; end if;
  select count(*) into n from public.daily_board('e2e-test', d, k1) b where b.mine;
  if n <> 1 then raise exception 'FAIL mine not marked once'; end if;
  select b.rank into n from public.daily_board('e2e-test', d, k1) b order by b.rank desc limit 1;
  if n <> 2 then raise exception 'FAIL tie should share rank 2, got %', n; end if;
  raise exception 'ALL BOARD TESTS PASSED (rolled back)';
end $$;
