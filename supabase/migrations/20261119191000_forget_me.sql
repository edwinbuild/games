-- "Delete everything" on the privacy page: removes this device's board results and answer marks.
-- The device is known only by the SHA-256 of the key its browser keeps, so only that browser can ask.
create or replace function public.forget_me(p_key text)
returns integer
language plpgsql security definer set search_path = '' as $$
declare dev text; n integer; m integer;
begin
  if p_key is null or p_key !~ '^[0-9a-f]{32}$' then raise exception 'bad key'; end if;
  dev := encode(extensions.digest(p_key, 'sha256'), 'hex');
  delete from app.scores where device = dev;
  get diagnostics n = row_count;
  delete from app.answered where device = dev;
  get diagnostics m = row_count;
  return n + m;
end;
$$;
revoke all on function public.forget_me(text) from public;
grant execute on function public.forget_me(text) to anon;
revoke execute on function public.forget_me(text) from authenticated;
