-- Evidências da Fase 1, rodadas no banco LOCAL com a estrutura de produção (sem migrações novas)
-- e dados fictícios. Cada bloco imprime o resultado observado. Nada aqui toca produção.
\set ON_ERROR_STOP 0
\pset footer off
begin;
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@exemplo.test', now()),
  ('00000000-0000-0000-0000-0000000000b1', 'dono@exemplo.test', now()),
  ('00000000-0000-0000-0000-0000000000c1', 'comum@exemplo.test', now());
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000a1');
insert into public.businesses (id, slug, name, category, status, internal_notes, source, email)
values ('10000000-0000-0000-0000-000000000001', 'lugar-ficticio', 'Lugar Fictício', 'alimentacao', 'active',
        'Autocadastro por Fulano (fulano@exemplo.test)', 'autocadastro', 'contato@exemplo.test');
insert into public.business_owners (business_id, user_id, email) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'dono@exemplo.test');
insert into public.businesses (id, slug, name, category) values ('10000000-0000-0000-0000-000000000002','sem-dono','Sem dono','alimentacao');
insert into public.ofertas (id, business_id, titulo) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Oferta fictícia');
insert into public.config (chave, valor) values ('concierge_teto_diario', '800'), ('concierge_limite_10min', '20'), ('whatsapp_guia', '');

\echo '--- E1: usuário autenticado comum lê notas internas de lugar ativo'
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select name, internal_notes, source, validation from public.businesses;
reset role;

\echo '--- E2: anônimo tenta o mesmo (esperado: erro de permissão por coluna)'
set local role anon; set local request.jwt.claims = '{"role":"anon"}';
savepoint s1;
select internal_notes from public.businesses;
rollback to savepoint s1;
\echo '--- E3: anônimo lê toda a tabela config'
select chave, valor from public.config;
\echo '--- E4: anônimo chama usar_oferta 50 vezes com o mesmo visitante'
select max(public.usar_oferta('20000000-0000-0000-0000-000000000001', 'v1')) as usos_depois_de_50 from generate_series(1,50);
\echo '--- E5: anônimo insere 200 cliques falsos para o lugar (métricas do dono)'
insert into public.interactions (kind, business_id, visitor) select 'whatsapp', '10000000-0000-0000-0000-000000000001', 'x' from generate_series(1,200);
reset role;
select count(*) as cliques_inseridos from public.interactions where kind = 'whatsapp';
\echo '--- E6: anônimo insere 100 leads em sequência'
set local role anon; set local request.jwt.claims = '{"role":"anon"}';
insert into public.leads (name, phone) select 'Spam ' || g, '11999999999' from generate_series(1,100) g;
reset role;
select count(*) as leads from public.leads;
\echo '--- E7: dono vê meu_relatorio inflado pelos cliques falsos'
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select * from public.meu_relatorio('10000000-0000-0000-0000-000000000001');
\echo '--- E8: usuário comum NÃO consegue editar lugar alheio pela RPC (controle esperado)'
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
savepoint s2;
select public.editar_meu_negocio('10000000-0000-0000-0000-000000000001', '{"description":"x"}');
rollback to savepoint s2;
\echo '--- E9: usuário comum NÃO consegue virar dono por insert direto (controle esperado)'
savepoint s3;
insert into public.business_owners (business_id, user_id, email) values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c1', 'x');
rollback to savepoint s3;
\echo '--- E10: usuário comum NÃO consegue se inserir em admins (controle esperado)'
savepoint s4;
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000c1');
rollback to savepoint s4;
\echo '--- E11: dono consegue escrever HTML na descrição pela RPC (vai para o api/og.js)'
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select public.editar_meu_negocio('10000000-0000-0000-0000-000000000001', '{"description":"</script><script>alert(1)</script>"}');
reset role;
select description from public.businesses where id = '10000000-0000-0000-0000-000000000001';
\echo '--- E12: dono incrementa o contador da própria oferta direto pela tabela'
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
update public.ofertas set usos = 99999 where id = '20000000-0000-0000-0000-000000000001';
reset role;
select usos from public.ofertas;
rollback;
