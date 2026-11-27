-- F08: anon lê só chaves públicas; autenticado comum lê públicas + whatsapp_guia; admin lê tudo.
begin;
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000a002', 'adm2@exemplo.test', now()),
  ('00000000-0000-0000-0000-00000000c002', 'com2@exemplo.test', now());
insert into public.admins (user_id) values ('00000000-0000-0000-0000-00000000a002');
insert into public.config (chave, valor, publica) values
  ('meta_pixel_id', '123', true), ('whatsapp_guia', '5535999999999', false), ('seg_interna', 'top', false);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  if not exists (select 1 from public.config where chave = 'meta_pixel_id') then raise exception 'anon deveria ver chave publica'; end if;
  if exists (select 1 from public.config where chave = 'seg_interna') then raise exception 'anon NAO deveria ver chave interna'; end if;
  if exists (select 1 from public.config where chave = 'whatsapp_guia') then raise exception 'anon NAO deveria ver whatsapp_guia'; end if;
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000c002","role":"authenticated"}';
do $$ begin
  if not exists (select 1 from public.config where chave = 'whatsapp_guia') then raise exception 'comum deveria ver whatsapp_guia'; end if;
  if exists (select 1 from public.config where chave = 'seg_interna') then raise exception 'comum NAO deveria ver chave interna'; end if;
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000a002","role":"authenticated"}';
do $$ begin
  if not exists (select 1 from public.config where chave = 'seg_interna') then raise exception 'admin deveria ver tudo'; end if;
end $$;
rollback;
