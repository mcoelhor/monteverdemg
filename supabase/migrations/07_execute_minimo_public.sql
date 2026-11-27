-- F14 (correção) · O EXECUTE das funções vinha de PUBLIC, não do anon, então o revoke da 06
-- não surtia efeito. Aqui revogamos de PUBLIC nas funções só-admin; authenticated e service_role
-- têm grant explícito e seguem podendo executar. usar_oferta continua pública (uso legítimo).
revoke execute on function public.admin_audiencia(integer) from public;
revoke execute on function public.sou_admin() from public;
