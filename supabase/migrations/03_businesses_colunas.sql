-- F05 · Esconder colunas internas de contas comuns. Antes: authenticated tinha SELECT em todas
-- as colunas (inclusive internal_notes/source/validation). Depois: só as colunas públicas, as
-- mesmas que anon já lê. O admin passa a ler tudo por uma RPC (admin_lugares).
-- APLICAR JUNTO COM O DEPLOY DO FRONT: o painel de admin troca select('*') por rpc('admin_lugares').

revoke select on public.businesses from authenticated;
grant select (
  id, slug, name, description, category, subcategory, urgency_group, address, city,
  latitude, longitude, phone, phone2, whatsapp, email, instagram, website, hours, open_24h,
  tags, plan, plan_expires_at, featured, status, verified_at, amenities, cardapio_url
) on public.businesses to authenticated;

-- Admin lê a tabela inteira (inclusive colunas internas) por aqui.
create or replace function public.admin_lugares()
returns setof public.businesses
language sql
stable
security definer
set search_path to ''
as $function$
  select b.* from public.businesses b where private.is_admin()
$function$;

revoke all on function public.admin_lugares() from public, anon;
grant execute on function public.admin_lugares() to authenticated;
