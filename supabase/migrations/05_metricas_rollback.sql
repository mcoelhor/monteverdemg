-- Rollback F06/F07
drop trigger if exists leads_limita on public.leads;
drop function if exists private.limita_leads();
drop trigger if exists interactions_limita on public.interactions;
drop function if exists private.limita_interactions();
drop trigger if exists ofertas_protege_usos on public.ofertas;
drop function if exists private.protege_usos();
drop function if exists private.ip_req();
-- restaura usar_oferta sem deduplicação (versão de produção)
create or replace function public.usar_oferta(p_oferta uuid, p_visitor text default null::text)
returns integer language plpgsql security definer set search_path to '' as $function$
declare o public.ofertas; n int;
begin
  select * into o from public.ofertas where id = p_oferta and ativo and inicio <= now() and (fim is null or fim > now());
  if o.id is null then return null; end if;
  update public.ofertas set usos = usos + 1 where id = p_oferta returning usos into n;
  insert into public.interactions (kind, business_id, term, visitor) values ('cupom', o.business_id, left(o.titulo, 120), left(coalesce(p_visitor, 'anon'), 40));
  return n;
end $function$;
drop table if exists public.oferta_usos;
