-- Tests for supabase/migrations/20261120130000_community.sql. Ends by raising
-- 'ALL COMMUNITY TESTS PASSED (rolled back)', so nothing is kept.
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); d uuid := gen_random_uuid();
  j json; n int; id1 bigint; i int; r record; as_ text; bs text;
begin
  insert into auth.users (id, email, aud, role) values (a, 'c-a@example.invalid', 'authenticated', 'authenticated'), (b, 'c-b@example.invalid', 'authenticated', 'authenticated'),
    (c, 'c-c@example.invalid', 'authenticated', 'authenticated'), (d, 'c-d@example.invalid', 'authenticated', 'authenticated');
  insert into app.profiles (user_id, username) values (a, 'Ann_c'), (b, 'Bo_c'), (c, 'Cid_c'), (d, 'Dee_c');
  as_ := json_build_object('sub', a, 'role', 'authenticated')::text; bs := json_build_object('sub', b, 'role', 'authenticated')::text;

  -- Votes: one per player per game, changeable; likes % only from 20 votes.
  perform set_config('request.jwt.claims', '{}', true);
  perform public.vote_game('word-ladder', repeat('1', 32), 1);
  if public.my_game_vote('word-ladder', repeat('1', 32)) <> 1 then raise exception 'FAIL my vote'; end if;
  begin perform public.vote_game('word-ladder', repeat('1', 32), -1); raise exception 'FAIL too fast'; exception when others then if sqlerrm not like '%too fast%' then raise; end if; end;
  update app.game_votes set at = now() - interval '1 minute';
  perform public.vote_game('word-ladder', repeat('1', 32), -1);
  if (select count(*) from app.game_votes where game = 'word-ladder' and voter = encode(extensions.digest(repeat('1', 32), 'sha256'), 'hex')) <> 1 then raise exception 'FAIL one vote'; end if;
  if (public.game_stats()->'likes') ? 'word-ladder' then raise exception 'FAIL likes shown under 20'; end if;
  for i in 1..19 loop perform public.vote_game('word-ladder', lpad(to_hex(i), 32, 'a'), 1); end loop;
  j := public.game_stats()->'likes'->'word-ladder';
  if (j->>'n')::int <> 20 or (j->>'pct')::int <> 95 then raise exception 'FAIL likes %', j; end if;

  -- Online: a heartbeat counts; a game is counted too.
  perform public.heartbeat('tab0000000001', 'rule-stack');
  perform public.heartbeat('tab0000000002', null);
  perform public.heartbeat('bad tab!', null);
  if (public.game_stats()->>'online')::int < 2 or (public.game_stats()->'onlineByGame'->>'rule-stack')::int < 1 then raise exception 'FAIL online'; end if;

  -- Comments in review mode: wait for approval; links and rude words refused; rate limit.
  update app.site_config set value = value || '{"comments": "review"}';
  begin perform public.post_comment('word-ladder', 'hi'); raise exception 'FAIL guest comment'; exception when others then if sqlerrm not like '%sign in first%' then raise; end if; end;
  perform set_config('request.jwt.claims', as_, true);
  j := public.post_comment('word-ladder', 'Loved today''s ladder!');
  id1 := (j->>'id')::bigint;
  if j->>'status' <> 'pending' then raise exception 'FAIL review mode %', j; end if;
  begin perform public.post_comment('word-ladder', 'again'); raise exception 'FAIL rate'; exception when others then if sqlerrm not like '%too fast%' then raise; end if; end;
  update app.comments set created_at = now() - interval '2 minutes' where user_id = a;
  begin perform public.post_comment('word-ladder', 'see www.spam.com'); raise exception 'FAIL link'; exception when others then if sqlerrm not like '%link%' then raise; end if; end;
  begin perform public.post_comment('word-ladder', 'go to example.io now'); raise exception 'FAIL bare link'; exception when others then if sqlerrm not like '%link%' then raise; end if; end;
  begin perform public.post_comment('word-ladder', 'you sh1thead'); raise exception 'FAIL rude'; exception when others then if sqlerrm not like '%rude%' then raise; end if; end;
  select count(*) into n from public.game_comments('word-ladder') where mine and pending;
  if n <> 1 then raise exception 'FAIL own pending shown'; end if;
  perform set_config('request.jwt.claims', bs, true);
  select count(*) into n from public.game_comments('word-ladder');
  if n <> 0 then raise exception 'FAIL pending shown to others'; end if;

  -- Approved by the admin: visible, likeable; three reports don't hide an approved comment.
  update app.comments set status = 'visible', approved = true where id = id1;
  if public.like_comment(id1, true) <> 1 or public.like_comment(id1, true) <> 1 then raise exception 'FAIL like once'; end if;
  if public.like_comment(id1, false) <> 0 then raise exception 'FAIL unlike'; end if;
  -- An unapproved visible comment (comments "on") is hidden by three reports.
  update app.site_config set value = value || '{"comments": "on"}';
  j := public.post_comment('word-ladder', 'Too easy today');
  if j->>'status' <> 'visible' then raise exception 'FAIL on mode'; end if;
  for r in select x from unnest(array[a, c, d]) x loop
    perform set_config('request.jwt.claims', json_build_object('sub', r.x, 'role', 'authenticated')::text, true);
    perform public.report_comment((j->>'id')::bigint);
  end loop;
  if (select status from app.comments where id = (j->>'id')::bigint) <> 'hidden' then raise exception 'FAIL three reports'; end if;
  perform public.report_comment(id1); perform set_config('request.jwt.claims', bs, true); perform public.report_comment(id1);
  if (select status from app.comments where id = id1) <> 'visible' then raise exception 'FAIL approved hidden'; end if;

  -- Banned players and "off" mode can't post; removing your own comment.
  insert into app.bans (user_id) values (b);
  update app.comments set created_at = now() - interval '2 minutes' where user_id = b;
  begin perform public.post_comment('word-ladder', 'hello'); raise exception 'FAIL banned'; exception when others then if sqlerrm not like '%banned%' then raise; end if; end;
  perform set_config('request.jwt.claims', as_, true);
  perform public.remove_my_comment(id1);
  if (select status from app.comments where id = id1) <> 'removed' then raise exception 'FAIL remove own'; end if;
  update app.site_config set value = value || '{"comments": "off"}';
  update app.comments set created_at = now() - interval '2 minutes' where user_id = a;
  begin perform public.post_comment('word-ladder', 'hello'); raise exception 'FAIL off'; exception when others then if sqlerrm not like '%comments off%' then raise; end if; end;
  raise exception 'ALL COMMUNITY TESTS PASSED (rolled back)';
end $$;
