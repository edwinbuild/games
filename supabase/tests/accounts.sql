-- Tests for supabase/migrations/20261120100000_accounts.sql. Two pretend players are made in
-- auth.users and the session is switched between them; everything ends by raising
-- 'ALL ACCOUNT TESTS PASSED (rolled back)', so nothing is kept.
do $$
declare
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); d date := (now() at time zone 'utc')::date;
  j json; t text; n int; r record; k text := repeat('d', 32);
begin
  insert into auth.users (id, email, aud, role) values (u1, 'e2e-1@example.invalid', 'authenticated', 'authenticated'), (u2, 'e2e-2@example.invalid', 'authenticated', 'authenticated');
  -- Signed out: account functions refuse.
  perform set_config('request.jwt.claims', '{}', true);
  begin perform public.my_profile(); raise exception 'FAIL profile without sign-in'; exception when others then if sqlerrm not like '%sign in first%' then raise; end if; end;

  -- Player 1: profile made on first use, first name free.
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  j := public.my_profile(d);
  if j->>'username' is not null or (j->>'changesLeft')::int <> 5 or j->>'icon' <> 'ticket' then raise exception 'FAIL new profile %', j; end if;
  if public.check_username('ab') <> 'format' or public.check_username('bad name') <> 'format' then raise exception 'FAIL format'; end if;
  if public.check_username('Admin') <> 'reserved' or public.check_username('PocketFairFan') <> 'reserved' then raise exception 'FAIL reserved'; end if;
  if public.check_username('sh1thead') <> 'rude' then raise exception 'FAIL rude'; end if;
  if public.check_username('Sam_42') is not null then raise exception 'FAIL free name'; end if;
  j := public.set_username('Sam_42');
  if j->>'username' <> 'Sam_42' or (j->>'changesLeft')::int <> 5 then raise exception 'FAIL first pick counted %', j; end if;

  -- Player 2: the name is taken in any letter case.
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  if public.check_username('sam_42') <> 'taken' then raise exception 'FAIL case-insensitive'; end if;
  begin perform public.set_username('SAM_42'); raise exception 'FAIL duplicate accepted'; exception when others then if sqlerrm not like '%taken%' then raise; end if; end;
  perform public.set_username('Robin');

  -- Player 1 renames five times; the sixth is refused; the old name is held from others.
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  perform public.set_username('Sam_43'); perform public.set_username('Sam_44'); perform public.set_username('Sam_45'); perform public.set_username('Sam_46');
  j := public.set_username('Sam_47');
  if (j->>'changesLeft')::int <> 0 then raise exception 'FAIL changes left %', j; end if;
  begin perform public.set_username('Sam_48'); raise exception 'FAIL sixth rename'; exception when others then if sqlerrm not like '%no changes left%' then raise; end if; end;
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  if public.check_username('Sam_42') <> 'held' then raise exception 'FAIL hold'; end if;

  -- Icons: open ones and colours; a locked one is refused until earned.
  j := public.set_icon('fox', 'grape');
  if j->>'icon' <> 'fox' or j->>'colour' <> 'grape' then raise exception 'FAIL icon %', j; end if;
  begin perform public.set_icon('crown', 'grape'); raise exception 'FAIL locked icon'; exception when others then if sqlerrm not like '%locked%' then raise; end if; end;
  begin perform public.set_icon('fox', 'canvas'); raise exception 'FAIL bad colour'; exception when others then if sqlerrm not like '%bad colour%' then raise; end if; end;
  perform public.put_data('{"stats:blind-timer": {"plays": 0, "maxStreak": 31, "daily": {}}}'::jsonb);
  j := public.set_icon('crown', 'honey');
  if j->>'icon' <> 'crown' then raise exception 'FAIL earned icon'; end if;

  -- Saved data: keys checked, read back.
  begin perform public.put_data('{"nick": "x"}'::jsonb); raise exception 'FAIL bad key'; exception when others then if sqlerrm not like '%bad key%' then raise; end if; end;
  select count(*) into n from public.get_data();
  if n <> 1 then raise exception 'FAIL get_data %', n; end if;

  -- A guest result on this device becomes the player's on sign-in; boards show the username and icon.
  perform set_config('request.jwt.claims', '{}', true);
  perform public.submit_score('word-ladder', d, k, 6, '6 steps', 'guestname');
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  n := public.claim_device(k);
  if n <> 1 then raise exception 'FAIL claim %', n; end if;
  select * into r from public.daily_board('word-ladder', d, null) b where b.mine;
  if r.nick <> 'Robin' or r.icon <> 'crown' then raise exception 'FAIL board row %', r; end if;
  update app.scores set updated_at = now() - interval '1 minute' where user_id = u2;
  perform public.submit_score('word-ladder', d, null, 4, '4 steps');
  select count(*) into n from app.scores where game = 'word-ladder' and day = d and user_id = u2;
  if n <> 1 or (select score from app.scores where game = 'word-ladder' and day = d and user_id = u2) <> 4 then raise exception 'FAIL one row per player'; end if;
  if (public.my_profile(d)->>'streak')::int <> 1 then raise exception 'FAIL streak'; end if;

  -- Report, then delete the account: everything goes, the name stays held.
  perform public.report_username('Sam_47');
  if not public.delete_account() then raise exception 'FAIL delete'; end if;
  if exists (select 1 from app.profiles where user_id = u2) or exists (select 1 from app.scores where user_id = u2) or exists (select 1 from app.user_data where user_id = u2) then raise exception 'FAIL leftovers'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  if public.check_username('Robin') <> 'held' then raise exception 'FAIL deleted name not held'; end if;
  raise exception 'ALL ACCOUNT TESTS PASSED (rolled back)';
end $$;
