-- Pocket Fair has no sign-in: only the anonymous role needs the vote functions.
revoke execute on function public.vote(date, integer, integer) from authenticated;
revoke execute on function public.split(date, integer) from authenticated;
