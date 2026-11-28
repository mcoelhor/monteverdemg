// Avaliações do Google (Places API New) para a página do lugar.
// A chave fica no segredo GOOGLE_MAPS_KEY (nunca no app). Cache temporário de 7 dias
// em google_avaliacoes (os termos do Google permitem até 30; uma rotina apaga o que passar disso).
// Teto próprio de consultas por dia, abaixo da cota configurada no Google Cloud.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const SITES = ['https://monteverdemg.com.br', 'https://www.monteverdemg.com.br', 'http://localhost:5173', 'http://localhost:4173']
const permitido = (o: string | null) => !!o && (SITES.includes(o) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(o))
const cors = (o: string | null) => ({
  'Access-Control-Allow-Origin': permitido(o) ? o! : SITES[0],
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
})
const json = (b: unknown, s: number, h: Record<string, string>) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...h, 'Content-Type': 'application/json' } })

const CATEGORIAS = new Set(['alimentacao', 'hospedagem', 'turismo', 'compras'])
const VALIDADE_MS = 7 * 86400e3
const TETO_DIA = Number(Deno.env.get('GOOGLE_AVALIACOES_TETO_DIA') || 35) // cota do Google: 40/dia
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

type Cache = { nota: number | null; total: number | null; avaliacoes: unknown[]; link: string | null; atualizado_em: string }
const saida = (c: Cache) => ({ ok: true, nota: c.nota, total: c.total, avaliacoes: c.avaliacoes, link: c.link, atualizado_em: c.atualizado_em })

Deno.serve(async (req) => {
  const h = cors(req.headers.get('origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h })
  if (req.method !== 'POST') return json({ ok: false }, 405, h)

  const { id } = await req.json().catch(() => ({}))
  if (typeof id !== 'string' || !UUID.test(id)) return json({ ok: false }, 400, h)

  const { data: b } = await db.from('businesses').select('id,category,status,google_place_id').eq('id', id).maybeSingle()
  if (!b || b.status !== 'active' || !CATEGORIAS.has(b.category) || !b.google_place_id) return json({ ok: false }, 200, h)

  const { data: cache } = await db.from('google_avaliacoes').select('nota,total,avaliacoes,link,atualizado_em').eq('business_id', id).maybeSingle()
  if (cache && Date.now() - new Date(cache.atualizado_em).getTime() < VALIDADE_MS) return json(saida(cache), 200, h)

  // Teto diário próprio (atômico). Estourou: devolve o cache antigo, se houver.
  const { data: liberado, error: eLim } = await db.rpc('consumir_limite', { p_chave: 'google-avaliacoes:dia', p_limite: TETO_DIA, p_janela_seg: 86400 })
  if (eLim || !liberado) return json(cache ? saida(cache) : { ok: false }, 200, h)

  const KEY = Deno.env.get('GOOGLE_MAPS_KEY')
  if (!KEY) return json(cache ? saida(cache) : { ok: false }, 200, h)

  const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(b.google_place_id)}?languageCode=pt-BR&regionCode=BR`, {
    headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri' },
  }).catch(() => null)
  if (!r || !r.ok) return json(cache ? saida(cache) : { ok: false }, 200, h)

  const p = await r.json()
  // Texto do comentário vai como o Google mandou (sem editar), com autor, foto e link de atribuição.
  const avaliacoes = (p.reviews || []).slice(0, 5).map((v: any) => ({
    autor: v.authorAttribution?.displayName || 'Usuário do Google',
    autor_url: v.authorAttribution?.uri || null,
    foto: v.authorAttribution?.photoUri || null,
    nota: v.rating ?? null,
    texto: v.text?.text || v.originalText?.text || '',
    quando: v.relativePublishTimeDescription || '',
    link: v.googleMapsUri || null,
  }))
  const novo: Cache = {
    nota: typeof p.rating === 'number' ? p.rating : null,
    total: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
    avaliacoes, link: p.googleMapsUri || null, atualizado_em: new Date().toISOString(),
  }
  await db.from('google_avaliacoes').upsert({ business_id: id, ...novo })
  return json(saida(novo), 200, h)
})
