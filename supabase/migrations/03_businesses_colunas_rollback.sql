-- Rollback F05
drop function if exists public.admin_lugares();
grant select on public.businesses to authenticated;
