-- Rollback F02 (colunas de auditoria)
alter table public.reivindicacoes drop column if exists decidido_por;
alter table public.reivindicacoes drop column if exists metodo_verificacao;
alter table public.reivindicacoes drop column if exists contato_conferido;
alter table public.reivindicacoes drop column if exists evidencia;
