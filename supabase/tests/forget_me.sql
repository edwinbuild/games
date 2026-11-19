-- Tests for supabase/migrations/20261119191000_forget_me.sql. Ends by raising
-- 'FORGET_ME PASSED (rolled back)', so nothing is kept.
do $$
declare d date := (now() at time zone 'utc')::date; n int;
begin
  perform public.submit_score('word-ladder', d, repeat('a', 32), 5, '5 steps');
  perform public.submit_score('word-ladder', d, repeat('b', 32), 6, '6 steps');
  perform public.vote(d, 9002, 0, repeat('a', 32));
  n := public.forget_me(repeat('a', 32));
  if n <> 2 then raise exception 'FAIL forgot % rows', n; end if;
  if exists (select 1 from app.scores where device = encode(extensions.digest(repeat('a', 32), 'sha256'), 'hex')) then raise exception 'FAIL score kept'; end if;
  if not exists (select 1 from app.scores where device = encode(extensions.digest(repeat('b', 32), 'sha256'), 'hex')) then raise exception 'FAIL other device removed'; end if;
  begin perform public.forget_me('x'); raise exception 'FAIL bad key accepted'; exception when others then if sqlerrm not like '%bad key%' then raise; end if; end;
  raise exception 'FORGET_ME PASSED (rolled back)';
end $$;
