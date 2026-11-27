// Tarefa interna: baixa do OpenStreetMap (Overpass) os caminhos e picos da serra de Monte Verde.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'
Deno.serve(async (req) => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: tok } = await db.rpc('token_tarefa', { p_nome: 'localizar' })
  if (!tok || req.headers.get('x-tarefa') !== tok) return new Response('sem permissão', { status: 403 })
  const q = '[out:json][timeout:50];(way["highway"~"path|footway|track"](-22.91,-46.08,-22.85,-46.015);node["natural"="peak"](-22.92,-46.10,-22.84,-46.0););out geom tags;'
  for (const h of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try {
      const r = await fetch(h, { method: 'POST', body: new URLSearchParams({ data: q }), headers: { 'User-Agent': 'monteverdemg.com.br (portal de turismo)' } })
      if (r.ok) { const j = await r.json(); return Response.json({ host: h, elements: j.elements.map((e: any) => e.type === 'node' ? { t: 'n', name: e.tags?.name, ele: e.tags?.ele, lat: e.lat, lon: e.lon } : { t: 'w', id: e.id, name: e.tags?.name, hw: e.tags?.highway, g: e.geometry.map((p: any) => [+p.lat.toFixed(5), +p.lon.toFixed(5)]) }) }) }
    } catch (_) { /* tenta o próximo */ }
  }
  return Response.json({ erro: 'overpass indisponível' }, { status: 502 })
})
