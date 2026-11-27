// Tarefa interna: localiza no Google (Places API New, Text Search) os lugares do guia sem coordenadas
// e grava SUGESTÕES em localizacao_sugestoes (não altera o guia). Protegida por token interno.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const VAZIAS = new Set(['de','da','do','das','dos','e','monte','verde','mg','restaurante','pousada','hotel','loja','the','em','a','o'])
function parecido(a: string, b: string) {
  const A = new Set(norm(a).split(' ').filter(w => w.length > 2 && !VAZIAS.has(w)))
  const B = new Set(norm(b).split(' ').filter(w => w.length > 2 && !VAZIAS.has(w)))
  if (!A.size || !B.size) return norm(a) === norm(b) ? 1 : 0
  let c = 0; for (const w of A) if (B.has(w)) c++
  return c / Math.min(A.size, B.size)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('metodo', { status: 405 })
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: tok } = await db.rpc('token_tarefa', { p_nome: 'localizar' })
  if (!tok || req.headers.get('x-tarefa') !== tok) return new Response('sem permissão', { status: 403 })
  const KEY = Deno.env.get('GOOGLE_MAPS_KEY')
  if (!KEY) return Response.json({ erro: 'GOOGLE_MAPS_KEY não configurada' }, { status: 500 })
  const { limite = 200 } = await req.json().catch(() => ({}))
  const { data: lista } = await db.from('businesses').select('id,name,address,city').eq('status', 'active').is('latitude', null).limit(limite)
  let ok = 0, falha = 0; const erros: string[] = []
  for (const b of lista || []) {
    const cidade = (b.city || 'Monte Verde') === 'Camanducaia' ? 'Camanducaia' : 'Monte Verde, Camanducaia'
    const q = `${b.name}, ${b.address ? b.address + ', ' : ''}${cidade}, MG`
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location' },
      body: JSON.stringify({ textQuery: q, languageCode: 'pt-BR', regionCode: 'BR', maxResultCount: 1,
        locationRestriction: { rectangle: { low: { latitude: -22.95, longitude: -46.30 }, high: { latitude: -22.60, longitude: -45.85 } } } }),
    })
    if (!r.ok) { falha++; if (erros.length < 3) erros.push(`${r.status} ${(await r.text()).slice(0, 200)}`); continue }
    const p = (await r.json()).places?.[0]
    if (!p?.location) { falha++; continue }
    const nomeG = p.displayName?.text || ''
    await db.from('localizacao_sugestoes').upsert({ business_id: b.id, nome_guia: b.name, nome_google: nomeG, endereco_google: p.formattedAddress, place_id: p.id,
      lat: p.location.latitude, lng: p.location.longitude, confianca: parecido(b.name, nomeG), consultado_em: new Date().toISOString() })
    ok++
  }
  return Response.json({ consultados: lista?.length || 0, ok, falha, erros })
})
