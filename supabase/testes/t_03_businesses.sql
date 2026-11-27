-- F05: conta comum não lê colunas internas; admin lê tudo via admin_lugares; comum não vê nada por lá.
begin;
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000a003', 'adm3@exemplo.test', now()),
  ('00000000-0000-0000-0000-00000000c003', 'com3@exemplo.test', now());
insert into public.admins (user_id) values ('00000000-0000-0000-0000-00000000a003');
insert into public.businesses (id, slug, name, category, status, internal_notes)
  values ('00000000-0000-0000-0000-0000000000b3', 'l3', 'L3', 'alimentacao', 'active', 'segredo interno');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000c003","role":"authenticated"}';
do $$ begin
  -- lê coluna pública
  if not exists (select name from public.businesses where id = '00000000-0000-0000-0000-0000000000b3') then
    raise exception 'comum deveria ler coluna publica'; end if;
  -- não lê coluna interna
  begin
    perform internal_notes from public.businesses where id = '00000000-0000-0000-0000-0000000000b3';
    raise exception 'comum NAO deveria ler internal_notes';
  exception when insufficient_privilege then null; end;
  -- admin_lugares não devolve nada para quem não é admin
  if exists (select 1 from public.admin_lugares()) then raise exception 'comum NAO deveria ver admin_lugares'; end if;
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000a003","role":"authenticated"}';
do $$ declare v text; begin
  select internal_notes into v from public.admin_lugares() where id = '00000000-0000-0000-0000-0000000000b3';
  if v is distinct from 'segredo interno' then raise exception 'admin deveria ler internal_notes via admin_lugares'; end if;
end $$;
rollback;
