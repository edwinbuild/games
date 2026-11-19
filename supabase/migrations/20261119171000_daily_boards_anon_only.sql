-- Like the other public functions: callable by the anonymous site only (default privileges also granted signed-in users).
revoke execute on function public.submit_score(text, date, text, double precision, text, text) from authenticated;
revoke execute on function public.my_rank(text, date, text) from authenticated;
revoke execute on function public.daily_board(text, date, text, integer) from authenticated;
