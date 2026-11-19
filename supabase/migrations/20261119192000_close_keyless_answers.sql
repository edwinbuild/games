-- The site now sends a device key with every answer, so the old keyless answer functions (no
-- per-device limit) are closed to the public. Nothing is removed; the next migration drops them
-- once that's approved. Errors on the privacy page are accepted too.
revoke execute on function public.vote(date, integer, integer) from anon, authenticated, public;
revoke execute on function public.crowd_answer(text, date, integer, double precision) from anon, authenticated, public;
revoke execute on function public.crowd_pick(text, date, integer, integer) from anon, authenticated, public;

create or replace function public.log_error(p_page text, p_message text)
returns void
language plpgsql security definer set search_path = '' as $$
declare h timestamptz := date_trunc('hour', now()); m text;
begin
  if p_page is null or (p_page not in ('home', 'about', 'privacy', 'category') and not exists (select 1 from app.games g where g.slug = p_page)) then return; end if;
  m := left(btrim(split_part(coalesce(p_message, ''), E'\n', 1)), 160);
  if m = '' then return; end if;
  if not exists (select 1 from app.error_counts e where e.hour = h and e.page = p_page and e.message = m)
     and (select count(*) from app.error_counts e where e.hour = h) >= 200 then return; end if;
  insert into app.error_counts (hour, page, message, count) values (h, p_page, m, 1)
  on conflict (hour, page, message) do update set count = app.error_counts.count + 1
  where app.error_counts.count < 10000;
end;
$$;
