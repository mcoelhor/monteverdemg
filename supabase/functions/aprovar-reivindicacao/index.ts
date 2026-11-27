// Administrador aprova ou recusa um pedido "este negócio é meu".
// O dono já tem conta com e-mail confirmado: aprovar só liga a conta ao negócio. Sem senha passando por WhatsApp.
// Pedido antigo sem conta: manda um convite por e-mail para ele criar a senha.
// Um dono por vez: se o lugar já tem dono, a aprovação é recusada e o caso vira disputa (Trocar dono no painel).
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const SITES = ['https://monteverdemg.com.br', 'https://www.monteverdemg.com.br', 'http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:4173']
const permitido = (o: string | null) => !!o && (SITES.includes(o) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(o))
const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': permitido(origin) ? origin! : SITES[0],
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
})
const json = (body: unknown, status: number, h: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const h = cors(origin)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h })
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405, h)
  const auth = req.headers.get('authorization') || ''
  const url = Deno.env.get('SUPABASE_URL')!
  const comoUsuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: admin } = await comoUsuario.rpc('sou_admin')
  if (!admin) return json({ erro: 'sem permissão' }, 403, h)
  const { data: quemAdmin } = await comoUsuario.auth.getUser()
  const adminId = quemAdmin?.user?.id || null

  let b: Record<string, unknown>
  try { b = await req.json() } catch { return json({ erro: 'json' }, 400, h) }
  const acao = String(b.acao || '')
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const id = String(b.id || '')
  const { data: p } = await db.from('reivindicacoes').select('*').eq('id', id).maybeSingle()
  if (!p) return json({ erro: 'pedido não encontrado' }, 404, h)

  // Só decide pedido que ainda está pendente (evita dupla decisão e corrida entre dois admins)
  if (p.status !== 'pendente') return json({ erro: 'Este pedido já foi decidido.' }, 409, h)

  if (acao === 'recusar') {
    await db.from('reivindicacoes').update({ status: 'recusada', decidido_em: new Date().toISOString(), decidido_por: adminId, observacao: String(b.observacao || '').slice(0, 300) }).eq('id', id).eq('status', 'pendente')
    return json({ ok: true }, 200, h)
  }
  if (acao !== 'aprovar') return json({ erro: 'acao' }, 400, h)

  // Aprovar exige o admin registrar de qual contato conferiu a prova (número cadastrado, CNPJ, etc.)
  const contatoConferido = String(b.contato_conferido || '').trim().slice(0, 200)
  const evidencia = String(b.evidencia || '').trim().slice(0, 300)
  if (contatoConferido.length < 3) return json({ erro: 'Informe de qual contato você conferiu a prova antes de aprovar.' }, 400, h)

  // Ninguém aprova o próprio pedido
  if (p.user_id && adminId && p.user_id === adminId) return json({ erro: 'Você não pode aprovar o seu próprio pedido.' }, 403, h)

  const email = String(p.email || '').toLowerCase()
  let userId: string | null = p.user_id || null
  let convite = false
  if (!userId) {
    const { data: lista } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
    userId = lista?.users?.find(x => (x.email || '').toLowerCase() === email)?.id || null
  }

  // Disputa: o lugar já tem outro dono
  const { data: atuais } = await db.from('business_owners').select('user_id, email').eq('business_id', p.business_id)
  const outro = (atuais || []).find(o => o.user_id !== userId)
  if (outro) {
    await db.from('reivindicacoes').update({ observacao: `Disputa: já tem dono (${outro.email || 'conta sem e-mail'})` }).eq('id', id)
    return json({ erro: `Este lugar já tem dono (${outro.email || 'outra conta'}). Confira os dois lados e, se for o caso, use "Trocar dono".`, disputa: true }, 409, h)
  }

  // Trava atômica: só um fluxo consegue tirar o pedido de "pendente"
  const { data: travado } = await db.from('reivindicacoes')
    .update({ status: 'verificada', decidido_em: new Date().toISOString(), decidido_por: adminId, metodo_verificacao: 'manual', contato_conferido: contatoConferido, evidencia: evidencia || null })
    .eq('id', id).eq('status', 'pendente').select('id').maybeSingle()
  if (!travado) return json({ erro: 'Este pedido já foi decidido.' }, 409, h)

  if (!userId) {
    const site = permitido(origin) && !origin!.startsWith('http://') ? origin! : SITES[0]
    const { data: conv, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: `${site}/meu-negocio?nova=1`, data: { papel: 'dono' } })
    if (error || !conv?.user) return json({ erro: 'Não foi possível enviar o convite: ' + (error?.message || '') }, 500, h)
    userId = conv.user.id; convite = true
  }
  const agora = new Date().toISOString()
  const { error: e1 } = await db.from('business_owners').upsert({ business_id: p.business_id, user_id: userId, email, verificado_em: agora }, { onConflict: 'business_id,user_id' })
  if (e1) {
    // Falha ao ligar o dono: desfaz a aprovação para não deixar o pedido "verificado" sem dono.
    await db.from('reivindicacoes').update({ status: 'pendente', decidido_em: null, decidido_por: null, metodo_verificacao: null }).eq('id', id)
    return json({ erro: e1.message }, 409, h)
  }
  await db.from('businesses').update({ verified_at: agora }).eq('id', p.business_id)
  await db.from('reivindicacoes').update({ user_id: userId }).eq('id', id)
  return json({ ok: true, email, convite }, 200, h)
})
