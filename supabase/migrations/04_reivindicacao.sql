-- F02 · Trilha de auditoria da decisão de reivindicação. A lógica atômica (status pendente,
-- não autoaprovar, registrar quem decidiu) fica na Edge Function aprovar-reivindicacao, que roda
-- com service_role; aqui só criamos as colunas que ela grava.

alter table public.reivindicacoes add column if not exists decidido_por uuid references auth.users(id) on delete set null;
alter table public.reivindicacoes add column if not exists metodo_verificacao text;
alter table public.reivindicacoes add column if not exists contato_conferido text;
alter table public.reivindicacoes add column if not exists evidencia text;
