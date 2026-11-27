-- F06/F07 · Integridade de métricas e contadores, e limites de spam.
-- Objetivos: 1 uso de cupom por visitante/dia; cliques e leads com teto por janela; dono não
-- consegue alterar o contador de usos direto. Limites generosos, para não atrapalhar uso legítimo.

-- IP da requisição (quando o PostgREST o repassa); vazio no teste local. Só compõe a chave de limite.
create or replace function private.ip_req()
returns text language sql stable set search_path to '' as $function$
  select coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', '')
$function$;

-- ---------- usar_oferta: deduplicação (1 por visitante/dia), sem inflar o contador ----------
create table if not exists public.oferta_usos (
  oferta_id uuid not null references public.ofertas(id) on delete cascade,
  visitor text not null,
  dia date not null default (now() at time zone 'America/Sao_Paulo')::date,
  constraint oferta_usos_pkey primary key (oferta_id, visitor, dia)
);
alter table public.oferta_usos enable row level security;
-- sem políticas e sem grant para anon/authenticated: só as funções SECURITY DEFINER e o service_role gravam aqui.
revoke all on public.oferta_usos from anon, authenticated;

create or replace function public.usar_oferta(p_oferta uuid, p_visitor text default null::text)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare o public.ofertas; vis text := left(coalesce(nullif(p_visitor, ''), 'anon'), 40); n int; novo boolean;
begin
  select * into o from public.ofertas
    where id = p_oferta and ativo and inicio <= now() and (fim is null or fim > now());
  if o.id is null then return null; end if;

  insert into public.oferta_usos (oferta_id, visitor)
    values (p_oferta, vis)
  on conflict (oferta_id, visitor, dia) do nothing;
  get diagnostics n = row_count; novo := n > 0;

  if not novo then
    return o.usos;  -- já usou hoje: devolve o total sem incrementar
  end if;

  perform set_config('mv.oferta_uso', '1', true);  -- libera a escrita de usos só para o update abaixo
  update public.ofertas set usos = usos + 1 where id = p_oferta returning usos into n;
  perform set_config('mv.oferta_uso', '0', true);  -- fecha a janela logo em seguida
  insert into public.interactions (kind, business_id, term, visitor)
    values ('cupom', o.business_id, left(o.titulo, 120), vis);
  return n;
end $function$;

-- O dono pode editar a oferta, mas não o contador de usos (só usar_oferta mexe nele).
create or replace function private.protege_usos()
returns trigger language plpgsql set search_path to '' as $function$
begin
  if new.usos <> old.usos and coalesce(current_setting('mv.oferta_uso', true), '') <> '1' then
    new.usos := old.usos;
  end if;
  return new;
end $function$;
drop trigger if exists ofertas_protege_usos on public.ofertas;
create trigger ofertas_protege_usos before update on public.ofertas
  for each row execute function private.protege_usos();

-- ---------- cliques (interactions): teto por visitante+lugar+tipo/dia e teto global/hora ----------
create or replace function private.limita_interactions()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  -- admin e service_role não passam por trigger de anon; este caminho é o insert público.
  if not private.consumir('int:all', 20000, interval '1 hour') then
    raise exception 'Muitas interações agora. Tente de novo em instantes.' using errcode = 'check_violation';
  end if;
  if new.business_id is not null and new.kind in ('view','tel','whatsapp','rota','site','instagram','cupom') then
    if not private.consumir('int:' || new.business_id || ':' || new.kind || ':' || left(coalesce(nullif(new.visitor,''), private.ip_req(), 'anon'), 40), 40, interval '1 day') then
      -- estourou o teto por visitante/lugar/tipo: descarta silenciosamente (não quebra a navegação)
      return null;
    end if;
  end if;
  return new;
end $function$;
drop trigger if exists interactions_limita on public.interactions;
create trigger interactions_limita before insert on public.interactions
  for each row execute function private.limita_interactions();

-- ---------- leads: teto por telefone/hora e global/hora ----------
create or replace function private.limita_leads()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare ip text := private.ip_req();
begin
  if not private.consumir('lead:all', 200, interval '1 hour')
     or not private.consumir('lead:tel:' || regexp_replace(coalesce(new.phone,''), '\D', '', 'g'), 5, interval '1 hour')
     or (ip <> '' and not private.consumir('lead:ip:' || ip, 20, interval '1 hour')) then
    raise exception 'Muitos envios agora. Tente de novo mais tarde.' using errcode = 'check_violation';
  end if;
  return new;
end $function$;
drop trigger if exists leads_limita on public.leads;
create trigger leads_limita before insert on public.leads
  for each row execute function private.limita_leads();
