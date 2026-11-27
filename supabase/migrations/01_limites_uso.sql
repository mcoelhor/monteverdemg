-- B3 · Limitador de uso atômico, resistente a concorrência (F03, F06, F07).
-- Vale para todas as instâncias porque o estado fica no banco. Chamado pelas Edge Functions
-- (service_role) e por triggers/RPCs. Janela fixa: a chave inclui o início da janela.

create table if not exists private.limites_uso (
  chave text not null,
  janela_inicio timestamptz not null,
  contador integer not null default 0,
  constraint limites_uso_pkey primary key (chave, janela_inicio)
);

-- Consome 1 do balde (chave, janela) e diz se AINDA está dentro do limite.
-- Atômico: o insert..on conflict incrementa e devolve o novo valor numa só operação.
create or replace function private.consumir(p_chave text, p_limite integer, p_janela interval)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare ini timestamptz; atual integer;
begin
  if p_limite <= 0 then return false; end if;
  -- início da janela corrente (baldes alinhados ao tamanho da janela, a partir da epoch)
  ini := to_timestamp(floor(extract(epoch from now()) / extract(epoch from p_janela)) * extract(epoch from p_janela));
  insert into private.limites_uso (chave, janela_inicio, contador)
    values (p_chave, ini, 1)
  on conflict (chave, janela_inicio)
    do update set contador = private.limites_uso.contador + 1
  returning contador into atual;
  -- limpeza barata e ocasional das janelas velhas
  if random() < 0.005 then
    delete from private.limites_uso where janela_inicio < now() - interval '2 days';
  end if;
  return atual <= p_limite;
end $function$;

revoke all on function private.consumir(text, integer, interval) from public;

-- Wrapper chamável pelas Edge Functions (service_role) via PostgREST. Janela em segundos.
create or replace function public.consumir_limite(p_chave text, p_limite integer, p_janela_seg integer)
returns boolean
language sql
security definer
set search_path to ''
as $function$
  select private.consumir(p_chave, p_limite, make_interval(secs => greatest(p_janela_seg, 1)))
$function$;

revoke all on function public.consumir_limite(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consumir_limite(text, integer, integer) to service_role;
