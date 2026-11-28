-- 09: cada visitante só vê e grava os próprios favoritos e roteiros; anônimo não acessa nada.
begin;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000aaa1', 'a@exemplo.test'),
  ('00000000-0000-0000-0000-00000000bbb2', 'b@exemplo.test');

-- A grava um favorito e um roteiro
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000aaa1","role":"authenticated"}', true);
insert into public.favoritos (tipo, item_id) values ('lugar', '00000000-0000-0000-0000-0000000000f1');
insert into public.roteiros_salvos (id, titulo, dados) values ('00000000-0000-0000-0000-0000000000d1', 'Fim de semana', '{"dias":2}');

-- A não grava em nome de B
do $$ begin
  begin
    insert into public.favoritos (user_id, tipo, item_id) values ('00000000-0000-0000-0000-00000000bbb2', 'lugar', '00000000-0000-0000-0000-0000000000f2');
    raise exception 'A conseguiu gravar favorito em nome de B';
  exception when insufficient_privilege then null; end;
end $$;

-- A não troca o dono do roteiro (o gatilho mantém o dono original)
update public.roteiros_salvos set user_id = '00000000-0000-0000-0000-00000000bbb2', titulo = 'Editado' where id = '00000000-0000-0000-0000-0000000000d1';

-- B não vê nem apaga nada de A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000bbb2","role":"authenticated"}', true);
do $$ declare n int; begin
  select count(*) into n from public.favoritos; if n <> 0 then raise exception 'B viu % favoritos de A', n; end if;
  select count(*) into n from public.roteiros_salvos; if n <> 0 then raise exception 'B viu % roteiros de A', n; end if;
  delete from public.roteiros_salvos where id = '00000000-0000-0000-0000-0000000000d1';
end $$;

-- anônimo não lê
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.favoritos;
    raise exception 'anon leu favoritos';
  exception when insufficient_privilege then null; end;
end $$;

-- conferência como superusuário: o roteiro continua de A, editado, e não foi apagado por B
reset role;
do $$ declare r record; begin
  select user_id, titulo into r from public.roteiros_salvos where id = '00000000-0000-0000-0000-0000000000d1';
  if r.user_id <> '00000000-0000-0000-0000-00000000aaa1' then raise exception 'dono do roteiro mudou'; end if;
  if r.titulo <> 'Editado' then raise exception 'edição do próprio roteiro não gravou'; end if;
end $$;

-- apagar a conta leva tudo junto
delete from auth.users where id = '00000000-0000-0000-0000-00000000aaa1';
do $$ declare n int; begin
  select count(*) into n from public.favoritos where user_id = '00000000-0000-0000-0000-00000000aaa1';
  if n <> 0 then raise exception 'favoritos sobraram após apagar a conta'; end if;
end $$;
rollback;
