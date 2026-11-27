# Lançamento Monte Verde MG — sábado, 28/11/2026

## O que já está pronto
- Identidade Névoa Editorial: paleta, Playfair Display + Inter, logo araucária, ícones do app.
- Arquivos da marca em `public/marca/` (logo horizontal claro e escuro, monocromático, símbolo, selo Recomendado).
- Concierge com IA em `/concierge` (função `concierge` já publicada no Supabase).
- Totem de mesa em `/totem?local=<slug-do-estabelecimento>`.
- Pagamento dos planos (funções `checkout` e `mp-webhook` já publicadas no Supabase).

## O que o Mateus precisa fazer (em ordem)
1. **Publicar o código**: aplicar este pacote no repositório `mcoelhor/monteverde-mg` (renomeado; o antigo era multivid-mg) (ou liberar o acesso do Claude no GitHub). A Vercel publica sozinha.
2. **Chave do Gemini** (liga o concierge): Supabase → projeto monteverdemg → Edge Functions → Secrets → `GEMINI_API_KEY` = sua chave do Google AI Studio.
3. **Chave do Mercado Pago** (liga o pagamento): mesmo lugar → `MP_ACCESS_TOKEN` = Access Token de produção do Mercado Pago.
4. **Totem**: no celular do totem, abrir `monteverdemg.com.br/totem?local=<slug>`, tocar na tela (tela cheia) e deixar na tomada. Android: ativar "manter tela ligada" nas opções do desenvolvedor.

## Teste rápido depois de publicar
- Abrir `/concierge` e perguntar "fim de semana a dois".
- Abrir `/totem` e conferir se gira as telas e se o QR abre o site.
- Abrir `/anuncie`, escolher o Destaque e ver se abre o Mercado Pago.
