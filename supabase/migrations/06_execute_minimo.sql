-- F14 · Privilégio mínimo de EXECUTE. As funções já checam o papel por dentro, mas não há motivo
-- para anon poder chamá-las. usar_oferta e touch_updated_at seguem públicas (uso legítimo).

revoke execute on function public.admin_audiencia(integer) from anon;
revoke execute on function public.sou_admin() from anon;
revoke execute on function public.is_admin() from anon;
