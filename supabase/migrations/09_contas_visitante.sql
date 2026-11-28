-- 09: Contas de visitante — favoritos e roteiros salvos por usuário.
-- Cada pessoa só lê e grava as próprias linhas (RLS por auth.uid()). Apagar a conta apaga tudo (cascade).

create table if not exists public.favoritos (
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo      text not null check (tipo in ('lugar', 'evento')),
  item_id   uuid not null,
  criado_em timestamptz not null default now(),
  primary key (user_id, tipo, item_id)
);

create table if not exists public.roteiros_salvos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo        text not null check (char_length(titulo) between 1 and 120),
  dados         jsonb not null check (pg_column_size(dados) <= 64000),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists roteiros_salvos_user_idx on public.roteiros_salvos (user_id, atualizado_em desc);

alter table public.favoritos enable row level security;
alter table public.roteiros_salvos enable row level security;

revoke all on public.favoritos, public.roteiros_salvos from anon, authenticated;
grant select, insert, delete on public.favoritos to authenticated;
grant select, insert, update, delete on public.roteiros_salvos to authenticated;

drop policy if exists favoritos_meus on public.favoritos;
create policy favoritos_meus on public.favoritos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists roteiros_meus on public.roteiros_salvos;
create policy roteiros_meus on public.roteiros_salvos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Teto por conta (evita abuso): 1.000 favoritos e 50 roteiros.
create or replace function private.limita_conta()
returns trigger language plpgsql security definer set search_path to '' as $$
declare n integer;
begin
  if tg_table_name = 'favoritos' then
    select count(*) into n from public.favoritos where user_id = new.user_id;
    if n >= 1000 then raise exception 'limite de favoritos atingido' using errcode = 'P0001'; end if;
  else
    select count(*) into n from public.roteiros_salvos where user_id = new.user_id;
    if n >= 50 then raise exception 'limite de roteiros salvos atingido' using errcode = 'P0001'; end if;
  end if;
  return new;
end $$;
revoke all on function private.limita_conta() from public, anon, authenticated;

drop trigger if exists limita_favoritos on public.favoritos;
create trigger limita_favoritos before insert on public.favoritos for each row execute function private.limita_conta();
drop trigger if exists limita_roteiros on public.roteiros_salvos;
create trigger limita_roteiros before insert on public.roteiros_salvos for each row execute function private.limita_conta();

-- Roteiro: atualiza a data a cada edição e impede trocar o dono.
create or replace function private.roteiro_touch()
returns trigger language plpgsql set search_path to '' as $$
begin
  new.user_id := old.user_id;
  new.criado_em := old.criado_em;
  new.atualizado_em := now();
  return new;
end $$;
revoke all on function private.roteiro_touch() from public, anon, authenticated;
drop trigger if exists roteiro_touch on public.roteiros_salvos;
create trigger roteiro_touch before update on public.roteiros_salvos for each row execute function private.roteiro_touch();
