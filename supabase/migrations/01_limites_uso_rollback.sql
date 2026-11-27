-- Rollback B3
drop function if exists public.consumir_limite(text, integer, integer);
drop function if exists private.consumir(text, integer, interval);
drop table if exists private.limites_uso;
