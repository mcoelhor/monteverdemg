// Recebe avisos do Mercado Pago. Nunca confia no corpo do aviso:
// busca o pagamento na API do Mercado Pago com a nossa chave e só então ativa o plano.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  const ok = () => new Response('ok', { status: 200 })
  const token = Deno.env.get('MP_ACCESS_TOKEN')
  if (!token) return ok()

  const url = new URL(req.url)
  let corpo: Record<string, any> = {}
  try { corpo = await req.json() } catch { /* aviso por query string */ }
  const tipo = corpo.type || corpo.topic || url.searchParams.get('type') || url.searchParams.get('topic')
  const pid = String(corpo?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id') || '')
  if (tipo !== 'payment' || !/^\d+$/.test(pid)) return ok()

  // Valida a assinatura do Mercado Pago quando o segredo está configurado (impede aviso forjado).
  const segredoWebhook = Deno.env.get('MP_WEBHOOK_SECRET')
  if (segredoWebhook) {
    const partes = Object.fromEntries((req.headers.get('x-signature') || '').split(',').map(s => s.split('=').map(x => x.trim())))
    const manifesto = `id:${pid};request-id:${req.headers.get('x-request-id') || ''};ts:${partes.ts || ''};`
    const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredoWebhook), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const mac = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(manifesto))
    const hex = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')
    if (!partes.v1 || hex !== partes.v1) { console.error('mp assinatura invalida', pid); return new Response('bad signature', { status: 401 }) }
  }

  const r = await fetch(`https://api.mercadopago.com/v1/payments/${pid}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) { console.error('mp get', r.status); return new Response('retry', { status: 500 }) }
  const p = await r.json()
  const ref = String(p.external_reference || p.metadata?.pagamento_id || '')
  if (!UUID.test(ref)) return ok()

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: pg } = await db.from('pagamentos').select('id, status, valor, business_id').eq('id', ref).maybeSingle()
  if (!pg) return ok()

  await db.from('pagamentos').update({ mp_payment_id: pid, metodo: p.payment_type_id || p.payment_method_id || null }).eq('id', pg.id)

  if (p.status === 'approved') {
    if (Number(p.transaction_amount) + 0.01 < Number(pg.valor) || p.currency_id !== 'BRL') { console.error('valor divergente', pid); return ok() }
    const { error } = await db.rpc('ativar_plano_srv', { p_pagamento: pg.id })
    if (error) { console.error('ativar', error.message); return new Response('retry', { status: 500 }) }
  } else if ((p.status === 'rejected' || p.status === 'cancelled') && pg.status === 'pendente') {
    await db.from('pagamentos').update({ status: p.status === 'rejected' ? 'recusado' : 'cancelado' }).eq('id', pg.id)
  } else if ((p.status === 'refunded' || p.status === 'charged_back') && pg.status === 'aprovado') {
    await db.from('pagamentos').update({ status: 'estornado' }).eq('id', pg.id)
    if (pg.business_id) await db.from('businesses').update({ plan_expires_at: new Date().toISOString() }).eq('id', pg.business_id)
  }
  return ok()
})
