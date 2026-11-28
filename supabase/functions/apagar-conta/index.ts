// Apaga a conta de quem está logado (exigência das lojas e da LGPD).
// Favoritos, roteiros e vínculos de dono saem junto (cascade). Admin não se apaga por aqui.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const SITES = ['https://monteverdemg.com.br', 'https://www.monteverdemg.com.br', 'http://localhost:5173', 'http://localhost:4173', 'capacitor://localhost', 'https://localhost']
const permitido = (o: string | null) => !!o && (SITES.includes(o) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(o))
const cors = (o: string | null) => ({
  'Access-Control-Allow-Origin': permitido(o) ? o! : SITES[0],
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
})
const json = (b: unknown, s: number, h: Record<string, string>) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...h, 'Content-Type': 'application/json' } })

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

Deno.serve(async (req) => {
  const h = cors(req.headers.get('origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h })
  if (req.method !== 'POST') return json({ ok: false }, 405, h)

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: u, error } = await admin.auth.getUser(token)
  if (error || !u?.user) return json({ ok: false, erro: 'sessão inválida' }, 401, h)

  const { data: ehAdmin } = await admin.from('admins').select('user_id').eq('user_id', u.user.id).maybeSingle()
  if (ehAdmin) return json({ ok: false, erro: 'Conta de administrador não pode ser apagada por aqui.' }, 403, h)

  const { error: e2 } = await admin.auth.admin.deleteUser(u.user.id)
  if (e2) return json({ ok: false, erro: 'não foi possível apagar agora' }, 500, h)
  return json({ ok: true }, 200, h)
})
