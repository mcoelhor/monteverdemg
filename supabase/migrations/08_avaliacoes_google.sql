-- 08: Avaliações do Google (Places API New) na página do lugar.
-- Termos da Plataforma Google Maps: só o place_id pode ser guardado sem prazo.
-- Nota, total e comentários ficam num cache TEMPORÁRIO (máx. 30 dias), apagado por rotina diária.

alter table public.businesses add column if not exists google_place_id text;
comment on column public.businesses.google_place_id is 'ID do lugar no Google (Places API). Pode ser guardado sem prazo pelos termos do Google.';

create table if not exists public.google_avaliacoes (
  business_id   uuid primary key references public.businesses(id) on delete cascade,
  nota          numeric(2,1),
  total         integer,
  avaliacoes    jsonb not null default '[]'::jsonb,
  link          text,
  atualizado_em timestamptz not null default now()
);
comment on table public.google_avaliacoes is 'Cache temporário (até 30 dias) do Google Places. Só a função avaliacoes-google lê e grava.';

-- Só o servidor (service_role) acessa: RLS ligada e nenhuma política para anon/authenticated.
alter table public.google_avaliacoes enable row level security;
revoke all on public.google_avaliacoes from anon, authenticated;

-- Rotina diária: apaga o que passou de 30 dias (exigência dos termos do Google).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'limpa-google-avaliacoes';
    perform cron.schedule('limpa-google-avaliacoes', '17 4 * * *',
      $q$delete from public.google_avaliacoes where atualizado_em < now() - interval '30 days'$q$);
  end if;
end $$;

-- Casamento inicial: usa as sugestões já buscadas no Google (localizacao_sugestoes),
-- só quando o nome bate (confiança >= 0,5) e o ponto do Google fica a até 150 m do lugar.
update public.businesses b
   set google_place_id = s.place_id
  from public.localizacao_sugestoes s
 where s.business_id = b.id
   and b.google_place_id is null
   and s.place_id is not null
   and s.confianca >= 0.5
   and (b.latitude is null
        or 6371000 * 2 * asin(sqrt(power(sin(radians(s.lat - b.latitude) / 2), 2)
             + cos(radians(b.latitude)) * cos(radians(s.lat)) * power(sin(radians(s.lng - b.longitude) / 2), 2))) <= 150);

-- Conferidos à mão: nome diferente, mas é o mesmo lugar.
update public.businesses b
   set google_place_id = s.place_id
  from public.localizacao_sugestoes s
 where s.business_id = b.id
   and b.google_place_id is null
   and b.name in ('BBQ Road', 'Galeria Cristina Botallo', 'Correios — Monte Verde');
