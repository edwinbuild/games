-- One call for what every page reads when its copy is stale: the site settings and the numbers
-- (plays, likes, who's online). Saves a round trip to the database on a first visit.
create or replace function public.page_data()
returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object('config', public.site_config(), 'stats', public.game_stats())
$$;
revoke all on function public.page_data() from public;
grant execute on function public.page_data() to anon, authenticated;
