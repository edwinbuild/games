-- Pocket Fair has no sign-in: only the anonymous role needs these functions.
revoke execute on function public.log_event(text, text) from authenticated;
revoke execute on function public.recent_plays() from authenticated;
revoke execute on function public.stats(text, integer) from authenticated;
-- Clear the test count made while checking the migration.
delete from app.event_counts;
