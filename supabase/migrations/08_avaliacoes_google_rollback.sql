-- Desfaz 08_avaliacoes_google.sql
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'limpa-google-avaliacoes';
  end if;
end $$;
drop table if exists public.google_avaliacoes;
alter table public.businesses drop column if exists google_place_id;
