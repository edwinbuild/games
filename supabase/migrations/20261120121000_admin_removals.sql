-- Part G, second half: the admin functions that remove things (a score, a player, a ban, a word,
-- admin sessions) and the PIN change. Kept apart because the database asks for confirmation before
-- applying anything that deletes.

create or replace function public.admin_set_pin(p_token text, p_old text, p_new text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := app.admin(p_token); hash text := app.setting('admin_pin_hash');
begin
  if extensions.crypt(p_old, hash) <> hash then raise exception 'wrong pin'; end if;
  if p_new !~ '^[0-9]{5,12}$' then raise exception 'pin format'; end if;
  update app.settings set value = extensions.crypt(p_new, extensions.gen_salt('bf', 10)) where key = 'admin_pin_hash';
  -- Every other admin session ends.
  delete from app.admin_sessions where user_id = uid and token_hash <> encode(extensions.digest(p_token, 'sha256'), 'hex');
  perform app.log_admin('changed pin');
  return true;
end;
$$;
create or replace function public.admin_end_sessions(p_token text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := app.admin(p_token);
begin
  delete from app.admin_sessions where user_id = uid;
  perform app.log_admin('ended all sessions');
  return true;
end;
$$;
create or replace function public.admin_ban(p_token text, p_name text, p_on boolean, p_reason text default null)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare them uuid;
begin
  perform app.admin(p_token);
  them := app.admin_target(p_name);
  if p_on then insert into app.bans (user_id, reason) values (them, left(p_reason, 200)) on conflict (user_id) do update set reason = excluded.reason;
  else delete from app.bans where user_id = them; end if;
  perform app.log_admin(case when p_on then 'banned' else 'unbanned' end, jsonb_build_object('username', p_name, 'reason', p_reason));
  return p_on;
end;
$$;
create or replace function public.admin_delete_player(p_token text, p_name text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare them uuid;
begin
  if app.admin(p_token) = app.uid_by_name(p_name) then raise exception 'that is you'; end if;
  them := app.admin_target(p_name);
  insert into app.username_holds (name_lower, held_by, until) values (lower(p_name), null, now() + interval '30 days')
    on conflict (name_lower) do update set held_by = null, until = excluded.until;
  delete from app.answered where device = 'u:' || them::text;
  delete from auth.users where id = them;
  perform app.log_admin('deleted player', jsonb_build_object('username', p_name));
  return true;
end;
$$;
create or replace function public.admin_remove_score(p_token text, p_game text, p_day date, p_handle text)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform app.admin(p_token);
  delete from app.scores where game = p_game and day = p_day and device = p_handle;
  perform app.log_admin('removed score', jsonb_build_object('game', p_game, 'day', p_day));
  return true;
end;
$$;
create or replace function public.admin_set_word(p_token text, p_list text, p_word text, p_add boolean)
returns json
language plpgsql security definer set search_path = '' as $$
declare w text := lower(btrim(coalesce(p_word, '')));
begin
  perform app.admin(p_token);
  if w !~ '^[a-z0-9_]{2,30}$' then raise exception 'bad word'; end if;
  if p_list = 'blocked' then
    if p_add then insert into app.blocked_words (word) values (w) on conflict do nothing; else delete from app.blocked_words where word = w; end if;
  elsif p_list = 'reserved' then
    if p_add then insert into app.reserved_names (name) values (w) on conflict do nothing; else delete from app.reserved_names where name = w; end if;
  else raise exception 'bad list'; end if;
  perform app.log_admin(case when p_add then 'added word' else 'removed word' end, jsonb_build_object('list', p_list));
  return public.admin_words(p_token);
end;
$$;
-- ---------- Who may call what ----------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proowner = current_user::regrole and (p.proname like 'admin\_%' or p.proname = 'site_config') loop
    execute format('revoke all on function %s from public', f.sig);
    if f.proname = 'site_config' then execute format('grant execute on function %s to anon, authenticated', f.sig);
    else
      execute format('revoke execute on function %s from anon', f.sig);
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app' and p.proowner = current_user::regrole loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
