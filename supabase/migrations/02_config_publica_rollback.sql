-- Rollback F08
drop policy if exists config_leitura_anon on public.config;
drop policy if exists config_leitura_auth on public.config;
create policy config_leitura on public.config as permissive for select to anon, authenticated using (true);
alter table public.config drop column if exists publica;
