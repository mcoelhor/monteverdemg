-- Rollback F14
grant execute on function public.admin_audiencia(integer) to anon;
grant execute on function public.sou_admin() to anon;
grant execute on function public.is_admin() to anon;
