-- B3: o limitador deixa passar dentro da cota e barra ao exceder; baldes por chave são separados.
do $$
begin
  if not private.consumir('teste:x', 3, interval '1 hour') then raise exception 'uso 1 deveria passar'; end if;
  perform private.consumir('teste:x', 3, interval '1 hour');
  perform private.consumir('teste:x', 3, interval '1 hour');
  if private.consumir('teste:x', 3, interval '1 hour') then raise exception 'uso 4 deveria barrar'; end if;
  if not private.consumir('teste:y', 3, interval '1 hour') then raise exception 'outra chave deveria ter balde proprio'; end if;
  if private.consumir('teste:z', 0, interval '1 hour') then raise exception 'limite 0 deveria barrar sempre'; end if;
end $$;
