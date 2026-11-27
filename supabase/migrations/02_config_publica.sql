-- F08 · Leitura pública de config restrita a chaves marcadas como públicas.
-- Antes: anon lia TODAS as linhas. Depois: anon lê só as marcadas publica=true; uma chave
-- nova sensível deixa de vazar por padrão. As Edge Functions usam service_role e ignoram a RLS.

alter table public.config add column if not exists publica boolean not null default false;

-- Chaves que o front realmente lê sem login (pixel/tag de marketing) ficam públicas.
update public.config set publica = true where chave in ('meta_pixel_id', 'google_tag_id');

drop policy if exists config_leitura on public.config;

-- anon: só chaves públicas.
create policy config_leitura_anon on public.config as permissive for select to anon
  using (publica);

-- autenticado: chaves públicas + o WhatsApp do guia (a área do dono precisa dele); admin vê tudo.
create policy config_leitura_auth on public.config as permissive for select to authenticated
  using (publica or chave = 'whatsapp_guia' or private.is_admin());
