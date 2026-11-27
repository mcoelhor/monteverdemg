-- Simulação mínima do ambiente Supabase para testar o banco localmente (Postgres 16).
-- NÃO aplicar em produção. Cria papéis, schema auth, storage e vault com o comportamento
-- usado pelas políticas do projeto: auth.uid(), auth.jwt() e request.jwt.claims.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
end $$;

create schema if not exists extensions; create extension if not exists pgcrypto schema extensions;
create schema if not exists auth;
create schema if not exists private;
create schema if not exists storage;
create schema if not exists vault;
create schema if not exists extensions;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  email_confirmed_at timestamptz,
  confirmed_at timestamptz
);
create table if not exists auth.mfa_factors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  status text
);

create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select auth.jwt() ->> 'role'
$$;

create table if not exists storage.buckets (id text primary key, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;

create table if not exists vault.secrets (name text primary key, secret text);
create or replace view vault.decrypted_secrets as select name, secret as decrypted_secret from vault.secrets;

grant usage on schema public, auth, storage, private to anon, authenticated, service_role;
grant usage on schema vault to service_role;
grant select on vault.decrypted_secrets to service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant select on auth.users, auth.mfa_factors to service_role;

-- Privilégios padrão do Supabase no schema public (tudo para os papéis da API; a RLS protege)
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

-- Sequências usadas pelas tabelas do baseline
create sequence if not exists public.concierge_uso_id_seq;
create sequence if not exists public.donos_historico_id_seq;
create sequence if not exists public.edicoes_id_seq;
