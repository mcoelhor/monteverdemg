// Notificações push do guia: assinatura, "avise quando abrir", envios agendados (pg_cron a cada 5 min)
// e as notificações dos anunciantes, que saem em fila: uma por vez, com 5 minutos entre elas.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'
import webpush from 'npm:web-push@3.6.7'

const SITES = ['https://monteverdemg.com.br', 'https://www.monteverdemg.com.br', 'http://localhost:5173', 'http://localhost:4173']
const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && (SITES.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) ? origin : SITES[0],
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info, x-cron-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Vary': 'Origin',
})
const json = (body: unknown, status: number, h: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json' } })
// Enquanto monteverdemg.com.br não aponta para a Vercel, os links das notificações usam o endereço atual do app
const SITE = Deno.env.get('SITE_URL') || 'https://multivid-mg-qmwd.vercel.app'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const INTERVALO_CAMPANHAS = 5 * 60e3
const MAX_CAMPANHAS_POR_DIA = 2 // por aparelho, para ninguém ser incomodado
// Endpoints de push só podem apontar para os provedores oficiais (não um destino arbitrário).
const PUSH_HOSTS = /(^|\.)(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com)$/
function endpointOk(u: string): boolean {
  try { const x = new URL(u); return x.protocol === 'https:' && PUSH_HOSTS.test(x.hostname) } catch { return false }
}

const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']
function parseDia(txt: unknown): number[][] | null {
  const t = String(txt ?? '').trim().toLowerCase()
  if (!t) return null
  if (['fechado', 'closed'].includes(t)) return []
  if (['24h', '24 horas', '00:00-24:00', '00:00-00:00'].includes(t)) return [[0, 1440]]
  const out: number[][] = []
  for (const parte of t.split(/[,;/]+/)) {
    const m = parte.match(/(\d{1,2})[:h](\d{2})?\s*[-–a]+\s*(\d{1,2})[:h]?(\d{2})?/)
    if (!m) continue
    const ini = Number(m[1]) * 60 + Number(m[2] || 0)
    let fim = Number(m[3]) * 60 + Number(m[4] || 0)
    if (fim <= ini) fim += 1440
    out.push([ini, fim])
  }
  return out.length ? out : null
}
function agoraMV() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(x => [x.type, x.value]))
  const dia = ({ Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 } as Record<string, number>)[p.weekday]
  return { dia, min: Number(p.hour) * 60 + Number(p.minute), hora: Number(p.hour), data: `${p.year}-${p.month}-${p.day}` }
}
function abertoAgora(b: any, a: { dia: number; min: number }) {
  if (String(b.open_24h || '').toLowerCase() === 'sim') return true
  const hoje = parseDia(b.hours?.[DIAS[a.dia]]) || []
  if (hoje.some(([i, f]) => a.min >= i && a.min < f)) return true
  const ontem = parseDia(b.hours?.[DIAS[(a.dia + 6) % 7]]) || []
  return ontem.some(([, f]) => f > 1440 && a.min < f - 1440)
}
function abreEmBreve(b: any, a: { dia: number; min: number }, janela = 20) {
  const hoje = parseDia(b.hours?.[DIAS[a.dia]]) || []
  const prox = hoje.find(([i]) => i > a.min && i <= a.min + janela)
  return prox ? prox[0] : null
}
const hhmm = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`
const dataMais = (iso: string, dias: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10) }

const TEMPO: Record<number, string> = { 0: 'céu limpo', 1: 'poucas nuvens', 2: 'parcialmente nublado', 3: 'nublado', 45: 'neblina', 48: 'neblina', 51: 'garoa', 53: 'garoa', 55: 'garoa', 61: 'chuva fraca', 63: 'chuva', 65: 'chuva forte', 80: 'pancadas de chuva', 81: 'pancadas de chuva', 82: 'pancadas fortes', 95: 'trovoada' }
async function clima() {
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-22.86&longitude=-46.03&elevation=1554&timezone=America%2FSao_Paulo&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&forecast_days=2', { signal: AbortSignal.timeout(5000) })
    const d = await r.json()
    return { temp: Math.round(d.current.temperature_2m), texto: TEMPO[d.current.weather_code] || 'tempo estável', amanha: { max: Math.round(d.daily.temperature_2m_max[1]), min: Math.round(d.daily.temperature_2m_min[1]), prob: d.daily.precipitation_probability_max[1], texto: TEMPO[d.daily.weather_code[1]] || 'tempo estável' } }
  } catch { return null }
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get('origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h })
  const url = new URL(req.url)
  const acao = url.searchParams.get('acao') || ''
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const segredo = async (n: string) => (await db.rpc('segredo', { nome: n })).data as string | null

  if (acao === 'chave') return json({ chave: await segredo('vapid_public') }, 200, h)

  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405, h)
  let b: any = {}
  try { b = await req.json() } catch { /* corpo vazio */ }

  if (acao === 'assinar') {
    const s = b.subscription
    if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth || !endpointOk(s.endpoint)) return json({ erro: 'assinatura inválida' }, 400, h)
    // Cota: no máximo 10 (re)assinaturas por endpoint/hora e um teto global.
    const { data: okEp } = await db.rpc('consumir_limite', { p_chave: 'push:assinar:' + String(s.endpoint).slice(0, 180), p_limite: 10, p_janela_seg: 3600 })
    const { data: okTot } = await db.rpc('consumir_limite', { p_chave: 'push:assinar:all', p_limite: 2000, p_janela_seg: 3600 })
    if (okEp === false || okTot === false) return json({ erro: 'muitas tentativas, tente mais tarde' }, 429, h)
    const chegada = typeof b.chegada === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.chegada) ? b.chegada : null
    const dias = Number.isInteger(b.dias) && b.dias >= 1 && b.dias <= 10 ? b.dias : null
    const { error } = await db.from('push_assinaturas').upsert({ endpoint: String(s.endpoint).slice(0, 1000), p256dh: String(s.keys.p256dh).slice(0, 200), auth: String(s.keys.auth).slice(0, 100), visitor: String(b.visitor || '').slice(0, 40) || null, ativo: true, ultimo_erro: null, ...(chegada ? { chegada, dias } : {}) }, { onConflict: 'endpoint' })
    if (error) return json({ erro: 'não foi possível guardar' }, 500, h)
    return json({ ok: true }, 200, h)
  }
  if (acao === 'abrir') {
    // Exige o segredo "auth" da assinatura: conhecer só o endpoint não basta para mexer na assinatura.
    if (!b.endpoint || !b.auth || !UUID.test(String(b.business_id))) return json({ erro: 'dados' }, 400, h)
    const { data: sub } = await db.from('push_assinaturas').select('auth').eq('endpoint', b.endpoint).maybeSingle()
    if (!sub || sub.auth !== b.auth) return json({ erro: 'assine as notificações primeiro' }, 400, h)
    const { error } = await db.from('push_abertura').upsert({ endpoint: b.endpoint, business_id: b.business_id })
    return error ? json({ erro: 'assine as notificações primeiro' }, 400, h) : json({ ok: true }, 200, h)
  }
  if (acao === 'cancelar') {
    // Só desativa a assinatura quem apresenta o segredo "auth" dela.
    if (b.endpoint && b.auth) await db.from('push_assinaturas').update({ ativo: false }).eq('endpoint', b.endpoint).eq('auth', b.auth)
    return json({ ok: true }, 200, h)
  }

  const pub = await segredo('vapid_public'), priv = await segredo('vapid_private')
  if (!pub || !priv) return json({ erro: 'sem chaves' }, 500, h)
  webpush.setVapidDetails('mailto:monteverdeapp@gmail.com', pub, priv)
  const enviar = async (sub: any, payload: Record<string, unknown>, chave?: string) => {
    try {
      if (!endpointOk(sub.endpoint)) { await db.from('push_assinaturas').update({ ativo: false, ultimo_erro: 'endpoint fora dos provedores' }).eq('endpoint', sub.endpoint); return false }
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 3 * 3600 })
      if (chave) await db.from('push_envios').insert({ endpoint: sub.endpoint, chave })
      return true
    } catch (e: any) {
      const st = e?.statusCode
      if (st === 404 || st === 410) await db.from('push_assinaturas').update({ ativo: false, ultimo_erro: String(st) }).eq('endpoint', sub.endpoint)
      else await db.from('push_assinaturas').update({ ultimo_erro: String(e?.message || st).slice(0, 200) }).eq('endpoint', sub.endpoint)
      return false
    }
  }

  if (acao === 'teste') {
    const comoUsuario = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('authorization') || '' } }, auth: { persistSession: false } })
    const { data: admin } = await comoUsuario.rpc('sou_admin')
    if (!admin) return json({ erro: 'sem permissão' }, 403, h)
    const { data: sub } = await db.from('push_assinaturas').select('*').eq('endpoint', b.endpoint || '').maybeSingle()
    if (!sub) return json({ erro: 'assinatura não encontrada' }, 404, h)
    const c = await clima()
    const ok = await enviar(sub, { title: 'Monte Verde MG', body: `Teste: ${c ? `${c.temp} °C, ${c.texto}` : 'tudo certo'}. As notificações estão funcionando.`, url: `${SITE}/?utm_source=push&utm_medium=teste` })
    return json({ ok }, 200, h)
  }

  if (acao === 'enviar') {
    if (req.headers.get('x-cron-secret') !== await segredo('cron_secret')) return json({ erro: 'sem permissão' }, 403, h)
    const a = agoraMV()
    const { data: subsDb } = await db.from('push_assinaturas').select('*').eq('ativo', true)
    const subs = subsDb || []

    // ---- Notificações dos anunciantes: uma por rodada, com no mínimo 5 minutos desde a anterior ----
    let campanha: Record<string, unknown> | null = null
    {
      const agoraIso = new Date().toISOString()
      // Ficou velha na fila (mais de 3 horas de atraso, ou caiu fora do horário): não envia mais
      await db.from('push_campanhas').update({ status: 'cancelada' }).eq('status', 'agendada').lt('agendado_para', new Date(Date.now() - 3 * 3600e3).toISOString())
      const { data: ultima } = await db.from('push_campanhas').select('enviada_em').eq('status', 'enviada').order('enviada_em', { ascending: false }).limit(1).maybeSingle()
      const livre = !ultima?.enviada_em || Date.now() - new Date(ultima.enviada_em).getTime() >= INTERVALO_CAMPANHAS - 30e3
      if (livre && a.hora >= 8 && a.hora < 21) {
        const { data: prox } = await db.from('push_campanhas').select('id, texto, businesses(name, slug, status)').eq('status', 'agendada').lte('agendado_para', agoraIso).order('agendado_para').limit(1).maybeSingle()
        if (prox) {
          // Marca antes de enviar, para nunca sair duas vezes
          const { data: marcada } = await db.from('push_campanhas').update({ status: 'enviada', enviada_em: agoraIso }).eq('id', prox.id).eq('status', 'agendada').select('id').maybeSingle()
          const neg: any = prox.businesses
          if (marcada && neg?.status === 'active') {
            const { data: recentes } = await db.from('push_envios').select('endpoint').like('chave', 'camp:%').gte('enviado_em', new Date(Date.now() - 20 * 3600e3).toISOString())
            const conta = new Map<string, number>()
            for (const r of recentes || []) conta.set(r.endpoint, (conta.get(r.endpoint) || 0) + 1)
            const alvo = subs.filter(s => (conta.get(s.endpoint) || 0) < MAX_CAMPANHAS_POR_DIA)
            let k = 0
            for (const s of alvo) k += +await enviar(s, { title: neg.name, body: prox.texto, tag: 'camp-' + prox.id, url: `${SITE}/estabelecimento/${neg.slug}?utm_source=push&utm_medium=anunciante&utm_campaign=${prox.id}` }, 'camp:' + prox.id)
            await db.from('push_campanhas').update({ enviados: k, alcance: alvo.length }).eq('id', prox.id)
            campanha = { id: prox.id, enviados: k, alcance: alvo.length }
          }
        }
      }
    }

    if (!subs.length) return json({ ok: true, enviados: 0, campanha }, 200, h)
    const { data: lugares } = await db.from('businesses').select('id,name,slug,hours,open_24h').eq('status', 'active')
    const abertos = (lugares || []).filter(x => abertoAgora(x, a)).length
    let c: Awaited<ReturnType<typeof clima>> = null
    const climaLazy = async () => (c ??= await clima())
    const { data: feitos } = await db.from('push_envios').select('endpoint,chave').gte('enviado_em', new Date(Date.now() - 3 * 86400e3).toISOString())
    const ja = new Set((feitos || []).map(x => x.endpoint + '|' + x.chave))
    let n = 0

    for (const s of subs) {
      if (!s.chegada) continue
      const dias = s.dias || 1
      if (a.hora >= 18 && a.hora < 22 && dataMais(a.data, 1) === s.chegada && !ja.has(s.endpoint + '|vespera:' + s.chegada)) {
        const cl = await climaLazy()
        n += +await enviar(s, { title: 'Amanhã você chega em Monte Verde', body: cl ? `Previsão: ${cl.amanha.texto}, ${cl.amanha.min} a ${cl.amanha.max} °C${cl.amanha.prob >= 50 ? ', chance de chuva' : ''}. Seu roteiro está pronto.` : 'Seu roteiro está pronto. Boa viagem!', url: `${SITE}/roteiro?utm_source=push&utm_medium=vespera` }, 'vespera:' + s.chegada)
      }
      for (let k = 0; k < dias; k++) {
        const d = dataMais(s.chegada, k)
        if (d !== a.data || a.hora < 9 || a.hora >= 12 || ja.has(s.endpoint + '|dia:' + d)) continue
        const cl = await climaLazy()
        const tempo = cl ? `${cl.temp} °C, ${cl.texto}` : ''
        const payload = k === 0
          ? { title: 'Bem-vindo a Monte Verde!', body: `${tempo ? tempo + '. ' : ''}${abertos} lugares abertos agora. Toque para ver o que fazer hoje.`, url: `${SITE}/?utm_source=push&utm_medium=chegada` }
          : { title: `Dia ${k + 1} em Monte Verde`, body: `${tempo ? tempo + '. ' : ''}Seu roteiro de hoje está pronto; ${abertos} lugares abertos agora.`, url: `${SITE}/roteiro?utm_source=push&utm_medium=dia${k + 1}` }
        n += +await enviar(s, payload, 'dia:' + d)
      }
    }

    const { data: avisos } = await db.from('push_abertura').select('endpoint,business_id')
    if (avisos?.length) {
      const porId = new Map((lugares || []).map(x => [x.id, x]))
      const porEndpoint = new Map(subs.map(x => [x.endpoint, x]))
      for (const av of avisos) {
        const lg = porId.get(av.business_id), s = porEndpoint.get(av.endpoint)
        if (!lg || !s) continue
        const abre = abreEmBreve(lg, a)
        const chave = `abre:${lg.id}:${a.data}`
        if (abre == null || ja.has(s.endpoint + '|' + chave)) continue
        n += +await enviar(s, { title: `${lg.name} abre às ${hhmm(abre)}`, body: 'Você pediu para avisar quando abrisse. Toque para ligar ou ver a rota.', url: `${SITE}/estabelecimento/${lg.slug}?utm_source=push&utm_medium=abertura` }, chave)
      }
    }
    return json({ ok: true, enviados: n, abertos, hora: a.hora, campanha }, 200, h)
  }
  return json({ erro: 'acao' }, 400, h)
})
