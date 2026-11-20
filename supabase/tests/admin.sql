-- Tests for supabase/migrations/20261120120000_admin.sql, with a test PIN (never the real one).
-- Ends by raising 'ALL ADMIN TESTS PASSED (rolled back)', so nothing is kept.
do $$
declare
  boss uuid := gen_random_uuid(); other uuid := gen_random_uuid(); d date := (now() at time zone 'utc')::date;
  j json; t text; tok text; cfg jsonb; n int; bs text; os text;
begin
  insert into auth.users (id, email, aud, role) values (boss, 'boss@example.invalid', 'authenticated', 'authenticated'), (other, 'other@example.invalid', 'authenticated', 'authenticated');
  delete from app.settings where key in ('admin_user', 'admin_pin_hash');
  insert into app.settings (key, value) values ('admin_pin_hash', extensions.crypt('24680', extensions.gen_salt('bf', 6)));
  bs := json_build_object('sub', boss, 'role', 'authenticated')::text; os := json_build_object('sub', other, 'role', 'authenticated')::text;
  perform set_config('request.jwt.claims', os, true); perform public.set_username('Other_t');
  perform set_config('request.jwt.claims', bs, true); perform public.set_username('Boss_t');

  -- A wrong PIN is recorded; the right PIN claims admin for the first account to enter it.
  j := public.admin_unlock('11111');
  if j->>'error' <> 'wrong' then raise exception 'FAIL wrong pin %', j; end if;
  j := public.admin_unlock('24680');
  tok := j->>'token';
  if tok is null or app.setting('admin_user') <> boss::text then raise exception 'FAIL unlock %', j; end if;
  if not public.admin_check(tok) then raise exception 'FAIL check'; end if;
  begin perform public.admin_check('nope'); raise exception 'FAIL bad token'; exception when others then if sqlerrm not like '%not allowed%' then raise; end if; end;

  -- Another account, even with the right PIN, gets nothing; nor can it use the admin's token.
  perform set_config('request.jwt.claims', os, true);
  if public.admin_unlock('24680')->>'error' <> 'wrong' then raise exception 'FAIL other account unlocked'; end if;
  begin perform public.admin_dashboard(tok); raise exception 'FAIL token from another account'; exception when others then if sqlerrm not like '%not allowed%' then raise; end if; end;
  -- Five wrong tries lock that account out.
  for n in 1..4 loop perform public.admin_unlock('00000'); end loop;
  if public.admin_unlock('24680')->>'error' <> 'locked' then raise exception 'FAIL lockout'; end if;

  -- Dashboard and settings.
  perform set_config('request.jwt.claims', bs, true);
  j := public.admin_dashboard(tok, 7);
  if j->'today' is null or j->>'accounts' is null then raise exception 'FAIL dashboard %', j; end if;
  cfg := public.admin_set_config(tok, '{"disabled": ["rule-stack"], "banner": {"text": "New: Dots & Boxes", "link": "/dots-and-boxes/"}, "rooms": false}');
  if not (public.site_config()->'disabled') ? 'rule-stack' or (public.site_config()->>'rooms')::boolean then raise exception 'FAIL settings %', cfg; end if;
  begin perform public.admin_set_config(tok, '{"hack": 1}'); raise exception 'FAIL unknown setting'; exception when others then if sqlerrm not like '%unknown setting%' then raise; end if; end;
  begin perform public.admin_set_config(tok, '{"banner": {"text": "x", "link": "javascript:alert(1)"}}'); raise exception 'FAIL bad link'; exception when others then if sqlerrm not like '%bad banner%' then raise; end if; end;
  perform public.admin_reroll(tok, 'garden-path', d); perform public.admin_reroll(tok, 'garden-path', d);
  if (public.site_config()->'rerolls'->>('garden-path:' || d))::int <> 2 then raise exception 'FAIL reroll'; end if;

  -- Moderation: player, email masked then revealed (logged), ban hides from boards, forced rename.
  perform set_config('request.jwt.claims', os, true);
  perform public.submit_score('word-ladder', d, null, 3, '3 steps');
  perform set_config('request.jwt.claims', bs, true);
  perform public.report_username('Other_t');
  j := public.admin_player(tok, 'other_t');
  if j->>'email' <> 'o***@example.invalid' or (j->>'reports')::int <> 1 then raise exception 'FAIL player %', j; end if;
  if public.admin_reveal_email(tok, 'Other_t') <> 'other@example.invalid' then raise exception 'FAIL reveal'; end if;
  perform public.admin_ban(tok, 'Other_t', true, 'test');
  if exists (select 1 from public.daily_board('word-ladder', d, null) where nick = 'Other_t') then raise exception 'FAIL banned on board'; end if;
  perform public.admin_force_rename(tok, 'Other_t');
  if (select username from app.profiles where user_id = other) is not null then raise exception 'FAIL rename'; end if;
  perform set_config('request.jwt.claims', os, true);
  if public.check_username('Other_t') <> 'held' then raise exception 'FAIL renamed name not held'; end if;
  perform set_config('request.jwt.claims', bs, true);
  select count(*) into n from public.admin_board(tok, 'word-ladder', d);
  if n < 1 then raise exception 'FAIL admin board'; end if;
  select handle into t from public.admin_board(tok, 'word-ladder', d) where who = 'player' limit 1;
  perform public.admin_remove_score(tok, 'word-ladder', d, t);
  if exists (select 1 from app.scores where device = t and game = 'word-ladder' and day = d) then raise exception 'FAIL remove score'; end if;

  -- Word lists, reserved names.
  perform public.admin_set_word(tok, 'reserved', 'pocketboss', true);
  if public.check_username('PocketBoss') <> 'reserved' then raise exception 'FAIL reserved add'; end if;
  perform public.admin_set_word(tok, 'reserved', 'pocketboss', false);
  if public.check_username('PocketBoss') is not null then raise exception 'FAIL reserved remove'; end if;

  -- PIN change: the old one is needed; afterwards it's the new one.
  begin perform public.admin_set_pin(tok, '99999', '13572'); raise exception 'FAIL old pin'; exception when others then if sqlerrm not like '%wrong pin%' then raise; end if; end;
  perform public.admin_set_pin(tok, '24680', '13572');
  if (public.admin_unlock('13572')->>'token') is null then raise exception 'FAIL new pin'; end if;
  if json_array_length(public.admin_security(tok)->'log') < 5 then raise exception 'FAIL log'; end if;
  perform public.admin_end_sessions(tok);
  begin perform public.admin_check(tok); raise exception 'FAIL session ended'; exception when others then if sqlerrm not like '%not allowed%' then raise; end if; end;
  raise exception 'ALL ADMIN TESTS PASSED (rolled back)';
end $$;
