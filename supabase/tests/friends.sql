-- Tests for supabase/migrations/20261120110000_friends.sql. Pretend players in auth.users; ends by
-- raising 'ALL FRIEND TESTS PASSED (rolled back)', so nothing is kept.
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); x uuid;
  d date := (now() at time zone 'utc')::date; j json; t text; n int; r record; code text; i int;
  as_ text; bs text; cs text;
begin
  insert into auth.users (id, email, aud, role) values (a, 'f-a@example.invalid', 'authenticated', 'authenticated'), (b, 'f-b@example.invalid', 'authenticated', 'authenticated'), (c, 'f-c@example.invalid', 'authenticated', 'authenticated');
  as_ := json_build_object('sub', a, 'role', 'authenticated')::text; bs := json_build_object('sub', b, 'role', 'authenticated')::text; cs := json_build_object('sub', c, 'role', 'authenticated')::text;
  perform set_config('request.jwt.claims', as_, true); perform public.set_username('Ana_t');
  perform set_config('request.jwt.claims', bs, true); perform public.set_username('Ben_t');
  perform set_config('request.jwt.claims', cs, true); perform public.set_username('Cy_t');

  -- Ana finds Ben by exact name (any case) and asks; Ben sees it and accepts.
  perform set_config('request.jwt.claims', as_, true);
  if public.find_player('ben_T')->>'relation' <> 'none' then raise exception 'FAIL find'; end if;
  if public.find_player('Be') is not null then raise exception 'FAIL partial match'; end if;
  if public.friend_request('Ben_t') <> 'sent' then raise exception 'FAIL request'; end if;
  begin perform public.friend_request('Ana_t'); raise exception 'FAIL self'; exception when others then if sqlerrm not like '%that is you%' then raise; end if; end;
  perform set_config('request.jwt.claims', bs, true);
  if (public.my_profile(d)->>'incoming')::int <> 1 then raise exception 'FAIL badge'; end if;
  select * into r from public.my_friends(d) limit 1;
  if r.username <> 'Ana_t' or r.status <> 'incoming' then raise exception 'FAIL incoming %', r; end if;
  perform public.friend_respond('Ana_t', true);
  select * into r from public.my_friends(d) limit 1;
  if r.status <> 'friend' then raise exception 'FAIL accepted %', r; end if;

  -- Cy joins Ana by her invite link: friends at once.
  perform set_config('request.jwt.claims', as_, true);
  code := public.my_profile(d)->>'inviteCode';
  perform set_config('request.jwt.claims', cs, true);
  if public.invite_owner(code)->>'username' <> 'Ana_t' then raise exception 'FAIL invite owner'; end if;
  perform public.friend_by_invite(code);
  if public.find_player('Ana_t')->>'relation' <> 'friend' then raise exception 'FAIL invite friends'; end if;

  -- Results and reactions among friends: Ana and Ben played Word Ladder today, Cy didn't.
  perform set_config('request.jwt.claims', as_, true); perform public.submit_score('word-ladder', d, null, 5, '5 steps');
  perform set_config('request.jwt.claims', bs, true); perform public.submit_score('word-ladder', d, null, 4, '4 steps');
  select count(*) into n from public.friends_results('word-ladder', d);
  if n <> 2 then raise exception 'FAIL results count %', n; end if;
  select * into r from public.friends_results('word-ladder', d) where rank = 1;
  if r.username <> 'Ben_t' or not r.mine then raise exception 'FAIL results rank %', r; end if;
  perform public.react('Ana_t', 'word-ladder', d, '👏');
  begin perform public.react('Ana_t', 'word-ladder', d, 'lol'); raise exception 'FAIL free text'; exception when others then if sqlerrm not like '%bad reaction%' then raise; end if; end;
  begin perform public.react('Cy_t', 'word-ladder', d, '🔥'); raise exception 'FAIL react to non-friend'; exception when others then if sqlerrm not like '%not friends%' then raise; end if; end;
  perform set_config('request.jwt.claims', as_, true);
  select * into r from public.friends_results('word-ladder', d) where mine;
  if (r.reactions->>'👏')::int <> 1 then raise exception 'FAIL reaction shown %', r; end if;
  if json_array_length(public.my_inbox()->'reactions') <> 1 or (public.my_profile(d)->>'news')::int <> 1 then raise exception 'FAIL inbox reaction'; end if;
  perform public.mark_seen();
  if json_array_length(public.my_inbox()->'reactions') <> 0 then raise exception 'FAIL seen'; end if;

  -- Play invites: friends only, online games only.
  perform public.invite_to_play('Ben_t', 'dots-and-boxes', 'K7MQ2');
  begin perform public.invite_to_play('Ben_t', 'word-ladder', 'K7MQ2'); raise exception 'FAIL offline game invite'; exception when others then if sqlerrm not like '%not an online game%' then raise; end if; end;
  perform set_config('request.jwt.claims', bs, true);
  if public.my_inbox()->'invites'->0->>'room' <> 'K7MQ2' then raise exception 'FAIL invite inbox'; end if;

  -- Ben blocks Ana: no longer friends, can't find each other, Ana can't see Ben on the board.
  perform public.block_player('Ana_t');
  if public.find_player('Ana_t') is not null then raise exception 'FAIL blocked still found'; end if;
  perform set_config('request.jwt.claims', as_, true);
  if public.find_player('Ben_t') is not null then raise exception 'FAIL blocker visible'; end if;
  begin perform public.friend_request('Ben_t'); raise exception 'FAIL request through block'; exception when others then if sqlerrm not like '%no such player%' then raise; end if; end;
  if exists (select 1 from public.daily_board('word-ladder', d, null) where nick = 'Ben_t') then raise exception 'FAIL blocked on board'; end if;
  if json_array_length(public.my_inbox()->'reactions') <> 0 then raise exception 'FAIL reactions kept'; end if;
  perform set_config('request.jwt.claims', bs, true);
  perform public.unblock_player('Ana_t');
  if public.find_player('Ana_t')->>'relation' <> 'none' then raise exception 'FAIL unblock'; end if;

  -- Limits: 20 new requests a day.
  perform set_config('request.jwt.claims', cs, true);
  for i in 1..21 loop
    x := gen_random_uuid();
    insert into auth.users (id, email, aud, role) values (x, 'f-x' || i || '@example.invalid', 'authenticated', 'authenticated');
    insert into app.profiles (user_id, username) values (x, 'Extra_' || i);
    if i <= 19 then perform public.friend_request('Extra_' || i); end if;
  end loop;
  -- Cy already asked 19 today plus joined Ana by invite (that one counts too): the 21st is refused.
  begin perform public.friend_request('Extra_20'); perform public.friend_request('Extra_21'); raise exception 'FAIL daily limit'; exception when others then if sqlerrm not like '%too many today%' then raise; end if; end;
  raise exception 'ALL FRIEND TESTS PASSED (rolled back)';
end $$;
