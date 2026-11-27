-- F02: a transição de status é atômica (duas decisões simultâneas → só uma afeta a linha) e as
-- colunas de auditoria existem. A lógica completa fica na Edge Function; aqui provamos a trava.
begin;
insert into public.businesses (id, slug, name, category, status) values ('00000000-0000-0000-0000-0000000000b5', 'l5', 'L5', 'alimentacao', 'active');
insert into public.reivindicacoes (id, business_id, nome_contato, whatsapp, email, codigo, status)
  values ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000b5', 'Fulano', '35999999999', 'f@exemplo.test', '123456', 'pendente');

-- primeira decisão "ganha" a linha pendente
do $$ declare n int; begin
  update public.reivindicacoes set status = 'verificada', decidido_em = now()
    where id = '00000000-0000-0000-0000-0000000000a5' and status = 'pendente';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'primeira decisao deveria afetar 1 linha, afetou %', n; end if;
end $$;

-- segunda decisão simultânea não encontra mais linha pendente
do $$ declare n int; begin
  update public.reivindicacoes set status = 'recusada'
    where id = '00000000-0000-0000-0000-0000000000a5' and status = 'pendente';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'segunda decisao deveria afetar 0 linhas, afetou %', n; end if;
end $$;

-- colunas de auditoria presentes
do $$ begin
  perform decidido_por, metodo_verificacao, contato_conferido, evidencia
    from public.reivindicacoes where id = '00000000-0000-0000-0000-0000000000a5';
end $$;
rollback;
