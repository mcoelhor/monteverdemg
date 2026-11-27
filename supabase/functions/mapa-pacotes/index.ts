// @ts-nocheck
// Tarefa interna: gera os pacotes de mapa offline (Monte Verde e arredores).
// Fonte: build diário do Protomaps (dados do OpenStreetMap, licença ODbL, distribuição offline permitida
// com atribuição). NADA do Google Maps entra aqui. Grava no Storage (bucket público "mapas"):
//   pacotes/<id>-<versao>.pmtiles  e  manifesto.json  (versão, tamanho, SHA-256, área, zooms).
// Protegida por token interno (x-tarefa). Chamada à mão ou pelo pg_cron (1x por mês).
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'
import { PMTiles, zxyToTileId } from 'npm:pmtiles@4.5.0'

export const PACOTES = [
  { id: 'monte-verde', nome: 'Monte Verde (vila e trilhas)', bbox: [-46.075, -22.915, -45.995, -22.835], minzoom: 8, maxzoom: 15, centro: 14 },
  { id: 'arredores', nome: 'Arredores (Camanducaia, Gonçalves, Sapucaí-Mirim, estradas)', bbox: [-46.25, -23.0, -45.70, -22.62], minzoom: 8, maxzoom: 14, centro: 11 },
]
const ATRIB = '© OpenStreetMap contributors (ODbL) · Protomaps'
function varint(buf, n) { while (n >= 0x80) { buf.push((n % 0x80) | 0x80); n = Math.floor(n / 0x80) } buf.push(n) }
async function gzip(u8) {
  const s = new Blob([u8]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(s).arrayBuffer())
}
function dirBytes(entries) {
  const b = []
  varint(b, entries.length)
  let last = 0
  for (const e of entries) { varint(b, e.tileId - last); last = e.tileId }
  for (const e of entries) varint(b, e.runLength)
  for (const e of entries) varint(b, e.length)
  entries.forEach((e, i) => {
    if (i > 0 && e.offset === entries[i - 1].offset + entries[i - 1].length) varint(b, 0)
    else varint(b, e.offset + 1)
  })
  return new Uint8Array(b)
}
// tiles: [{z,x,y,data(Uint8Array já gzip)}]
async function montarPmtiles(tiles, meta, info) {
  const lista = tiles.map(t => ({ ...t, tileId: zxyToTileId(t.z, t.x, t.y) })).sort((a, b) => a.tileId - b.tileId)
  // conteúdo repetido (mar, mato) guardado uma vez só
  const porHash = new Map(); const blocos = []; let off = 0; const entries = []
  for (const t of lista) {
    const h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', t.data))).join(',')
    let pos = porHash.get(h)
    if (!pos) { pos = { offset: off, length: t.data.length }; porHash.set(h, pos); blocos.push(t.data); off += t.data.length }
    const prev = entries[entries.length - 1]
    if (prev && prev.offset === pos.offset && prev.tileId + prev.runLength === t.tileId) prev.runLength++
    else entries.push({ tileId: t.tileId, offset: pos.offset, length: pos.length, runLength: 1 })
  }
  const root = await gzip(dirBytes(entries))
  if (root.length > 16384 - 127) throw new Error('diretório grande demais: ' + root.length)
  const metaB = await gzip(new TextEncoder().encode(JSON.stringify(meta)))
  const H = 127, rootOff = H, metaOff = rootOff + root.length, dataOff = metaOff + metaB.length
  const total = dataOff + off
  const out = new Uint8Array(total); const dv = new DataView(out.buffer)
  out.set(new TextEncoder().encode('PMTiles'), 0); out[7] = 3
  const u64 = (p, v) => dv.setBigUint64(p, BigInt(v), true)
  u64(8, rootOff); u64(16, root.length); u64(24, metaOff); u64(32, metaB.length)
  u64(40, dataOff); u64(48, 0); u64(56, dataOff); u64(64, off)
  u64(72, lista.length); u64(80, entries.length); u64(88, blocos.length)
  out[96] = 1; out[97] = 2; out[98] = 2; out[99] = 1   // clustered, gzip dirs, gzip tiles, MVT
  out[100] = info.minzoom; out[101] = info.maxzoom
  const i32 = (p, v) => dv.setInt32(p, Math.round(v * 1e7), true)
  const [w, s, e, n] = info.bbox
  i32(102, w); i32(106, s); i32(110, e); i32(114, n)
  out[118] = info.centerZoom; i32(119, (w + e) / 2); i32(123, (s + n) / 2)
  out.set(root, rootOff); out.set(metaB, metaOff)
  let p = dataOff; for (const b of blocos) { out.set(b, p); p += b.length }
  return out
}
function tilesDaCaixa([w, s, e, n], z) {
  const x = lon => Math.floor((lon + 180) / 360 * 2 ** z)
  const y = lat => { const r = lat * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z) }
  const r = []
  for (let i = x(w); i <= x(e); i++) for (let j = y(n); j <= y(s); j++) r.push({ z, x: i, y: j })
  return r
}

async function buildRecente(): Promise<string> {
  for (let d = 1; d <= 8; d++) {
    const t = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10).replaceAll('-', '')
    const url = `https://build.protomaps.com/${t}.pmtiles`
    const r = await fetch(url, { method: 'HEAD' }).catch(() => null)
    if (r?.ok) return url
  }
  throw new Error('nenhum build recente do Protomaps encontrado')
}

async function emLotes<T, R>(itens: T[], n: number, f: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(itens.length); let i = 0
  await Promise.all(Array.from({ length: n }, async () => { while (i < itens.length) { const k = i++; out[k] = await f(itens[k]) } }))
  return out
}

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('metodo', { status: 405 })
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: tok } = await db.rpc('token_tarefa', { p_nome: 'mapas' })
  if (!tok || req.headers.get('x-tarefa') !== tok) return new Response('sem permissão', { status: 403 })
  const pedido = await req.json().catch(() => ({}))
  const so: string[] | undefined = pedido.pacotes
  // A fonte, quando informada, só pode vir do provedor oficial (evita baixar/servir um arquivo arbitrário).
  if (pedido.fonte && !/^https:\/\/build\.protomaps\.com\//.test(String(pedido.fonte))) {
    return new Response('fonte não permitida', { status: 400 })
  }
  try {
    const fonte = pedido.fonte || await buildRecente()
    const origem = new PMTiles(fonte)
    const metaOrigem: any = await origem.getMetadata()
    const versao = new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + fonte.match(/(\d{8})\.pmtiles/)?.[1]
    const { data: atual } = await db.storage.from('mapas').download('manifesto.json')
    const manifesto = atual ? JSON.parse(await atual.text()) : { pacotes: [] }
    const feitos: any[] = []
    for (const p of PACOTES) {
      if (so && !so.includes(p.id)) continue
      const lista: any[] = []
      for (let z = p.minzoom; z <= p.maxzoom; z++) lista.push(...tilesDaCaixa(p.bbox, z))
      const baixados = await emLotes(lista, 12, async t => {
        const r = await origem.getZxy(t.z, t.x, t.y)
        return r?.data ? { ...t, data: await gzip(new Uint8Array(r.data)) } : null
      })
      const tiles = baixados.filter(Boolean)
      const meta = {
        name: 'Monte Verde MG · ' + p.nome, attribution: ATRIB, version: versao,
        vector_layers: metaOrigem.vector_layers, 'planetiler:osm:osmosistimestamp': metaOrigem['planetiler:osm:osmosistimestamp'],
        fonte: fonte.replace(/^https?:\/\//, ''),
      }
      const buf = await montarPmtiles(tiles, meta, { minzoom: p.minzoom, maxzoom: p.maxzoom, bbox: p.bbox, centerZoom: p.centro })
      const sha256 = hex(await crypto.subtle.digest('SHA-256', buf))
      const caminho = `pacotes/${p.id}-${versao}.pmtiles`
      const up = await db.storage.from('mapas').upload(caminho, buf, { contentType: 'application/octet-stream', cacheControl: '31536000', upsert: true })
      if (up.error) throw up.error
      const anterior = manifesto.pacotes.find((x: any) => x.id === p.id)
      const item = { id: p.id, nome: p.nome, versao, caminho, bytes: buf.length, sha256, bbox: p.bbox, minzoom: p.minzoom, maxzoom: p.maxzoom, tiles: tiles.length, dados_osm: meta['planetiler:osm:osmosistimestamp'] || null, gerado_em: new Date().toISOString() }
      manifesto.pacotes = [...manifesto.pacotes.filter((x: any) => x.id !== p.id), item]
      // guarda a versão anterior por 1 ciclo (quem estiver baixando não quebra); apaga as mais antigas
      const { data: arquivos } = await db.storage.from('mapas').list('pacotes', { limit: 100 })
      const manter = new Set([caminho, anterior?.caminho].filter(Boolean))
      const velhos = (arquivos || []).map(a => `pacotes/${a.name}`).filter(n => n.startsWith(`pacotes/${p.id}-`) && !manter.has(n))
      if (velhos.length) await db.storage.from('mapas').remove(velhos)
      feitos.push({ id: p.id, tiles: tiles.length, bytes: buf.length, versao })
    }
    manifesto.atualizado_em = new Date().toISOString()
    manifesto.atribuicao = ATRIB
    const m = await db.storage.from('mapas').upload('manifesto.json', new TextEncoder().encode(JSON.stringify(manifesto)), { contentType: 'application/json', cacheControl: '300', upsert: true })
    if (m.error) throw m.error
    return Response.json({ ok: true, fonte, feitos })
  } catch (e) {
    return Response.json({ ok: false, erro: String(e?.message || e) }, { status: 500 })
  }
})
