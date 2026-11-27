// Mapa offline: pacotes regionais (Monte Verde e arredores) com dados do OpenStreetMap,
// gerados no servidor a partir do Protomaps (licença ODbL, distribuição offline permitida com atribuição).
// Nada do Google Maps é baixado ou guardado aqui.
//
// O pacote (.pmtiles) é baixado inteiro, conferido por SHA-256 e guardado no Cache Storage do aparelho.
// O mapa lê pedaços do arquivo direto do aparelho, sem internet. Com conexão, confere o manifesto
// e troca por uma versão nova só depois de baixada e conferida (a antiga continua até lá).
import { SUPABASE_URL } from './supabase'

export const BASE = `${SUPABASE_URL}/storage/v1/object/public/mapas/`
export const ATRIBUICAO = '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> · <a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a>'
const CACHE = 'mv-mapas'          // fora do versionamento do service worker: não é apagado nas atualizações do app
const INDICE = 'mv-mapas-indice'  // o que está instalado: { id: { versao, sha256, bytes, baixado_em } }
const ULTIMA = 'mv-mapas-checado'
const chave = id => `/__mapas/${id}.pmtiles`

const ouvintes = new Set()
export function aoMudar(f) { ouvintes.add(f); return () => ouvintes.delete(f) }
const avisar = () => ouvintes.forEach(f => { try { f() } catch { /* */ } })

export const suportado = () => typeof caches !== 'undefined' && !!globalThis.crypto?.subtle

export function instalados() {
  try { return JSON.parse(localStorage.getItem(INDICE) || '{}') } catch { return {} }
}
function gravarIndice(i) { try { localStorage.setItem(INDICE, JSON.stringify(i)) } catch { /* */ } }

export async function manifesto() {
  const r = await fetch(BASE + 'manifesto.json?t=' + Math.floor(Date.now() / 300000), { cache: 'no-store' })
  if (!r.ok) throw new Error('Não foi possível ver os mapas disponíveis.')
  return r.json()
}

const hex = b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')

/** Baixa e guarda um pacote. onProgresso(fração 0..1). Só substitui o anterior depois de conferido. */
export async function baixar(item, onProgresso) {
  if (!suportado()) throw new Error('Este navegador não consegue guardar o mapa.')
  // garante que o código do mapa também fique no aparelho (o service worker guarda os arquivos do app)
  Promise.all([import('leaflet'), import('react-leaflet'), import('leaflet/dist/leaflet.css'), import('protomaps-leaflet')]).catch(() => {})
  try { await navigator.storage?.persist?.() } catch { /* */ }
  const est = await navigator.storage?.estimate?.().catch(() => null)
  if (est?.quota && est.quota - (est.usage || 0) < item.bytes * 1.5) throw new Error('Pouco espaço livre no aparelho para o mapa.')

  const r = await fetch(BASE + item.caminho, { cache: 'no-store' })
  if (!r.ok) throw new Error('Falha ao baixar o mapa. Tente de novo com internet.')
  const total = Number(r.headers.get('content-length')) || item.bytes
  const partes = []; let lidos = 0
  if (r.body?.getReader) {
    const leitor = r.body.getReader()
    for (;;) {
      const { done, value } = await leitor.read()
      if (done) break
      partes.push(value); lidos += value.length
      onProgresso?.(Math.min(0.99, lidos / total))
    }
  } else partes.push(new Uint8Array(await r.arrayBuffer()))
  const blob = new Blob(partes, { type: 'application/octet-stream' })
  if (blob.size !== item.bytes) throw new Error('O mapa chegou incompleto. Tente de novo.')
  const sha = hex(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))
  if (sha !== item.sha256) throw new Error('O mapa chegou corrompido. Tente de novo.')

  const c = await caches.open(CACHE)
  await c.put(chave(item.id), new Response(blob, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(blob.size), 'X-Versao': item.versao } }))
  const i = instalados()
  i[item.id] = { versao: item.versao, sha256: item.sha256, bytes: item.bytes, bbox: item.bbox, minzoom: item.minzoom, maxzoom: item.maxzoom, nome: item.nome, baixado_em: new Date().toISOString() }
  gravarIndice(i)
  abertos.delete(item.id)
  onProgresso?.(1)
  avisar()
}

export async function remover(id) {
  const c = await caches.open(CACHE)
  await c.delete(chave(id))
  const i = instalados(); delete i[id]; gravarIndice(i)
  abertos.delete(id)
  avisar()
}

/** Fonte do PMTiles que lê do arquivo guardado no aparelho (sem rede). */
class FonteLocal {
  constructor(id, blob) { this.id = id; this.blob = blob }
  getKey() { return 'local:' + this.id }
  async getBytes(offset, length) {
    return { data: await this.blob.slice(offset, offset + length).arrayBuffer() }
  }
}
const abertos = new Map()
/** Abre o pacote instalado. Devolve null se não estiver no aparelho (ex.: o sistema apagou). */
export async function abrir(id) {
  if (abertos.has(id)) return abertos.get(id)
  if (!suportado()) return null
  const c = await caches.open(CACHE)
  const r = await c.match(chave(id))
  if (!r) {
    const i = instalados()
    if (i[id]) { delete i[id]; gravarIndice(i); avisar() }
    return null
  }
  const { PMTiles } = await import('pmtiles')
  const p = new PMTiles(new FonteLocal(id, await r.blob()))
  abertos.set(id, p)
  return p
}

/** Com internet: atualiza os pacotes instalados que tiverem versão nova. No máximo a cada 6 h. */
let checando = null
export function sincronizar({ forcar = false } = {}) {
  if (checando) return checando
  const i = instalados()
  if (!Object.keys(i).length || !navigator.onLine) return Promise.resolve()
  const ultima = Number(localStorage.getItem(ULTIMA) || 0)
  if (!forcar && Date.now() - ultima < 6 * 3600 * 1000) return Promise.resolve()
  checando = (async () => {
    try {
      const m = await manifesto()
      for (const item of m.pacotes || []) {
        if (i[item.id] && i[item.id].versao !== item.versao) await baixar(item).catch(() => {})
      }
      localStorage.setItem(ULTIMA, String(Date.now()))
    } catch { /* sem rede: tenta depois */ } finally { checando = null }
  })()
  return checando
}

export const mb = b => (b / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' MB'
