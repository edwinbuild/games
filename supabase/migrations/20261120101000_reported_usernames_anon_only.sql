-- Like the other stats functions: only the stats page (anon, with the private key) calls it.
revoke execute on function public.reported_usernames(text) from authenticated;
