// Cria o pedido de plano e o checkout do Mercado Pago (Pix ou cartão).
// GET ?status=<id> devolve só o status do pedido (para a tela de retorno).
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const SITES = ['https://monteverdemg.com.br', 'https://www.monteverdemg.com.br', 'http://localhost:5173', 'http://localhost:4173']
const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && (SITES.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) ? origin : SITES[0],
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Vary': 'Origin',
})
const json = (body: unknown, status: number, h: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json' } })

const limpa = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const h = cors(origin)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const id = url.searchParams.get('status') || ''
    if (!UUID.test(id)) return json({ erro: 'id' }, 400, h)
    const { data } = await db.from('pagamentos').select('status, plano, vigente_ate, nome_negocio').eq('id', id).maybeSingle()
    return data ? json(data, 200, h) : json({ erro: 'nao_encontrado' }, 404, h)
  }
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405, h)

  let b: Record<string, unknown>
  try { b = await req.json() } catch { return json({ erro: 'json' }, 400, h) }
  if (limpa(b.site_url)) return json({ ok: true }, 200, h) // armadilha para robôs

  const plano = limpa(b.plano, 20)
  const nome = limpa(b.nome_negocio)
  const contato = limpa(b.contato_nome)
  const whats = limpa(b.contato_whatsapp, 30).replace(/\D/g, '')
  const email = limpa(b.contato_email, 160).toLowerCase()
  const businessId = UUID.test(limpa(b.business_id, 40)) ? limpa(b.business_id, 40) : null
  if (!nome || nome.length < 2) return json({ erro: 'Informe o nome do negócio.' }, 400, h)
  if (whats.length < 10) return json({ erro: 'Informe um WhatsApp com DDD.' }, 400, h)
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ erro: 'E-mail inválido.' }, 400, h)

  const { data: pl } = await db.from('planos').select('id, nome, preco, dias').eq('id', plano).eq('ativo', true).maybeSingle()
  if (!pl) return json({ erro: 'Plano inválido.' }, 400, h)
  if (businessId) {
    const { data: neg } = await db.from('businesses').select('id').eq('id', businessId).maybeSingle()
    if (!neg) return json({ erro: 'Negócio não encontrado.' }, 400, h)
  }

  const umaHora = new Date(Date.now() - 3600_000).toISOString()
  const { count } = await db.from('pagamentos').select('id', { count: 'exact', head: true }).eq('contato_whatsapp', whats).gte('criado_em', umaHora)
  if ((count ?? 0) >= 5) return json({ erro: 'Muitos pedidos seguidos. Tente de novo mais tarde.' }, 429, h)

  const { data: pg, error } = await db.from('pagamentos').insert({
    business_id: businessId, nome_negocio: nome, contato_nome: contato || null, contato_whatsapp: whats,
    contato_email: email || null, plano: pl.id, valor: pl.preco,
  }).select('id').single()
  if (error) return json({ erro: 'Não foi possível registrar o pedido.' }, 500, h)

  const token = Deno.env.get('MP_ACCESS_TOKEN')
  if (!token) return json({ ok: true, id: pg.id, checkout: null, motivo: 'pagamento_em_breve' }, 200, h)

  const site = origin && (SITES.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) ? origin : SITES[0]
  const volta = `${site}/anuncie/obrigado?id=${pg.id}`
  const pref = {
    items: [{ id: pl.id, title: `Plano ${pl.nome} · Monte Verde MG (${pl.dias} dias)`, description: nome, quantity: 1, currency_id: 'BRL', unit_price: Number(pl.preco) }],
    external_reference: pg.id,
    notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`,
    back_urls: { success: volta, pending: volta, failure: volta },
    auto_return: 'approved',
    statement_descriptor: 'MONTEVERDEMG',
    payment_methods: { installments: 1, excluded_payment_types: [{ id: 'ticket' }] },
    payer: email ? { email, name: contato || undefined } : undefined,
    metadata: { pagamento_id: pg.id },
  }
  const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': pg.id },
    body: JSON.stringify(pref),
  })
  const mp = await r.json().catch(() => ({}))
  if (!r.ok || !mp.init_point) {
    console.error('mercadopago', r.status, JSON.stringify(mp).slice(0, 400))
    return json({ ok: true, id: pg.id, checkout: null, motivo: 'falha_mercadopago' }, 200, h)
  }
  await db.from('pagamentos').update({ mp_preference_id: mp.id }).eq('id', pg.id)
  return json({ ok: true, id: pg.id, checkout: mp.init_point }, 200, h)
})
