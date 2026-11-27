// "Este negócio é meu": pedido feito por uma conta com e-mail já confirmado.
// Registra o pedido, consulta o CNPJ na BrasilAPI e gera o código para o WhatsApp do negócio.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const SITES = ['https://monteverdemg.com.br', 'https://www.monteverdemg.com.br', 'http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:4173']
const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && (SITES.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) ? origin : SITES[0],
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
})
const json = (body: unknown, status: number, h: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json' } })
const limpa = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const PARA = new Set(['ltda', 'me', 'eireli', 'epp', 'sa', 's/a', 'restaurante', 'pousada', 'hotel', 'bar', 'cafe', 'comercio', 'servicos', 'monte', 'verde', 'camanducaia', 'de', 'do', 'da', 'dos', 'das', 'e', 'em', 'the'])
const tokens = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(t => t.length >= 3 && !PARA.has(t))

function cnpjValido(c: string) {
  if (!/^\d{14}$/.test(c) || /^(\d)\1+$/.test(c)) return false
  const calc = (n: number) => { let s = 0, p = n - 7; for (let i = n; i >= 1; i--) { s += Number(c[n - i]) * p--; if (p < 2) p = 9 } const r = s % 11; return r < 2 ? 0 : 11 - r }
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13])
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get('origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h })
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405, h)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: quem } = token ? await db.auth.getUser(token) : { data: { user: null } }
  const user = quem?.user
  if (!user?.email || !(user.email_confirmed_at || user.confirmed_at)) return json({ erro: 'Entre com seu e-mail primeiro.' }, 401, h)
  const email = user.email.toLowerCase()

  let b: Record<string, unknown>
  try { b = await req.json() } catch { return json({ erro: 'json' }, 400, h) }
  if (limpa(b.site_url)) return json({ ok: true }, 200, h)

  const businessId = limpa(b.business_id, 40)
  const nome = limpa(b.nome_contato)
  const whats = limpa(b.whatsapp, 30).replace(/\D/g, '')
  const cnpj = limpa(b.cnpj, 30).replace(/\D/g, '')
  if (!UUID.test(businessId)) return json({ erro: 'Escolha o negócio na lista.' }, 400, h)
  if (nome.length < 2) return json({ erro: 'Informe seu nome.' }, 400, h)
  if (whats.length < 10) return json({ erro: 'Informe o WhatsApp com DDD.' }, 400, h)
  if (cnpj && !cnpjValido(cnpj)) return json({ erro: 'CNPJ inválido. Confira os 14 números.' }, 400, h)

  const { data: neg } = await db.from('businesses').select('id, name, verified_at').eq('id', businessId).maybeSingle()
  if (!neg) return json({ erro: 'Negócio não encontrado.' }, 400, h)
  const { data: jaDono } = await db.from('business_owners').select('business_id').eq('business_id', businessId).eq('user_id', user.id).maybeSingle()
  if (jaDono) return json({ erro: 'Este negócio já está ligado à sua conta.' }, 409, h)

  const umaHora = new Date(Date.now() - 3600_000).toISOString()
  const { count } = await db.from('reivindicacoes').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('criado_em', umaHora)
  if ((count ?? 0) >= 5) return json({ erro: 'Muitos pedidos seguidos. Tente mais tarde.' }, 429, h)
  const { data: pendente } = await db.from('reivindicacoes').select('id, codigo').eq('business_id', businessId).eq('user_id', user.id).eq('status', 'pendente').maybeSingle()

  let cnpjNome = '', cnpjSituacao = '', cnpjMunicipio = '', confere: boolean | null = null
  if (cnpj) {
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { signal: AbortSignal.timeout(6000) })
      if (r.ok) {
        const d = await r.json()
        cnpjNome = [d.nome_fantasia, d.razao_social].filter(Boolean).join(' / ').slice(0, 200)
        cnpjSituacao = String(d.descricao_situacao_cadastral || '').slice(0, 40)
        cnpjMunicipio = String(d.municipio || '').slice(0, 60)
        const alvo = new Set(tokens(neg.name))
        confere = tokens(cnpjNome).some(t => alvo.has(t))
      } else if (r.status === 404) { cnpjSituacao = 'não encontrado'; confere = false }
    } catch { /* fora do ar */ }
  }

  const codigo = pendente?.codigo || String(Math.floor(100000 + Math.random() * 900000))
  const dados = { nome_contato: nome, whatsapp: whats, email, user_id: user.id, cnpj: cnpj || null, cnpj_nome: cnpjNome || null, cnpj_situacao: cnpjSituacao || null, cnpj_municipio: cnpjMunicipio || null, cnpj_confere: confere }
  if (pendente) await db.from('reivindicacoes').update(dados).eq('id', pendente.id)
  else {
    const { error } = await db.from('reivindicacoes').insert({ ...dados, business_id: businessId, codigo })
    if (error) return json({ erro: 'Não foi possível registrar.' }, 500, h)
  }
  const { data: cfg } = await db.from('config').select('valor').eq('chave', 'whatsapp_guia').maybeSingle()
  return json({ ok: true, codigo, negocio: neg.name, cnpj: cnpj ? { nome: cnpjNome, situacao: cnpjSituacao, municipio: cnpjMunicipio, confere } : null, whatsapp_guia: (cfg?.valor || '').replace(/\D/g, '') }, 200, h)
})
