// Tarefa interna: busca no Google Places uma lista de nomes e devolve nome, endereço e coordenadas.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'
Deno.serve(async (req) => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: tok } = await db.rpc('token_tarefa', { p_nome: 'localizar' })
  if (!tok || req.headers.get('x-tarefa') !== tok) return new Response('sem permissão', { status: 403 })
  const { consultas = [] } = await req.json()
  const out = []
  for (const q of consultas.slice(0, 30)) {
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': Deno.env.get('GOOGLE_MAPS_KEY')!, 'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location' },
      body: JSON.stringify({ textQuery: q, languageCode: 'pt-BR', maxResultCount: 1, locationRestriction: { rectangle: { low: { latitude: -22.95, longitude: -46.15 }, high: { latitude: -22.80, longitude: -45.95 } } } }) })
    const p = r.ok ? (await r.json()).places?.[0] : null
    out.push({ q, nome: p?.displayName?.text, end: p?.formattedAddress, lat: p?.location?.latitude, lng: p?.location?.longitude })
  }
  return Response.json(out)
})
