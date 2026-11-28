-- Desfaz 09_contas_visitante.sql (apaga os favoritos e roteiros salvos das contas)
drop table if exists public.favoritos;
drop table if exists public.roteiros_salvos;
drop function if exists private.limita_conta();
drop function if exists private.roteiro_touch();
