-- Approved by Edwin (2026-11-19): the old keyless answer functions, already closed to the public
-- by 20261119192000, are removed. Only the versions that take a device key remain.
drop function if exists public.vote(date, integer, integer);
drop function if exists public.crowd_answer(text, date, integer, double precision);
drop function if exists public.crowd_pick(text, date, integer, integer);
