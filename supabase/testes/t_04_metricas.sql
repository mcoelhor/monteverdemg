-- F06/F07: cupom conta 1 por visitante/dia; dono não altera o contador; cliques têm teto.
begin;
insert into auth.users (id, email, email_confirmed_at) values ('00000000-0000-0000-0000-000000004004', 'dono4@exemplo.test', now());
insert into public.businesses (id, slug, name, category, status) values ('00000000-0000-0000-0000-0000000000b4', 'l4', 'L4', 'alimentacao', 'active');
insert into public.business_owners (business_id, user_id, email) values ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-000000004004', 'dono4@exemplo.test');
insert into public.ofertas (id, business_id, titulo, ativo, inicio) values ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000b4', 'Oferta 4', true, now());

-- 50 chamadas, mesmo visitante: 1 uso
do $$ declare r int; begin
  for i in 1..50 loop perform public.usar_oferta('00000000-0000-0000-0000-0000000000f4', 'vis4'); end loop;
  select usos into r from public.ofertas where id = '00000000-0000-0000-0000-0000000000f4';
  if r <> 1 then raise exception 'usar_oferta deveria somar 1, somou %', r; end if;
end $$;

-- dono tenta cravar o contador: trigger reverte
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000004004","role":"authenticated"}';
update public.ofertas set usos = 99999 where id = '00000000-0000-0000-0000-0000000000f4';
reset role;
do $$ declare r int; begin
  select usos into r from public.ofertas where id = '00000000-0000-0000-0000-0000000000f4';
  if r <> 1 then raise exception 'dono conseguiu alterar usos para %', r; end if;
end $$;

-- 100 cliques do mesmo visitante/lugar/tipo: teto diário de 40 descarta o excesso
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  for i in 1..100 loop
    insert into public.interactions (kind, business_id, visitor) values ('whatsapp', '00000000-0000-0000-0000-0000000000b4', 'visX');
  end loop;
end $$;
reset role;
do $$ declare c int; begin
  select count(*) into c from public.interactions where business_id = '00000000-0000-0000-0000-0000000000b4' and kind = 'whatsapp' and visitor = 'visX';
  if c = 0 then raise exception 'nenhum clique gravado'; end if;
  if c > 41 then raise exception 'teto de cliques nao aplicado: % gravados', c; end if;
end $$;
rollback;
