// Cadastro grátis feito pelo dono já logado (e-mail confirmado). Entra como rascunho, fora do ar,
// e fica ligado à conta de quem cadastrou: ele já pode colocar fotos enquanto o guia confere.
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
const CATS: Record<string, [string, string[]]> = {
  alimentacao: ['Comer', ['restaurantes', 'pizzarias', 'hamburguerias', 'lanchonetes', 'cafeterias', 'padarias', 'chocolaterias', 'bares']],
  hospedagem: ['Ficar', ['pousadas']], turismo: ['Fazer', ['atrativos', 'passeios']], compras: ['Comprar', ['supermercados', 'artesanato', 'pet-shops']],
  saude: ['Emergência', ['pronto-socorro', 'hospitais', 'farmacias', 'dentistas', 'clinicas', 'laboratorios', 'veterinarios']],
  transporte: ['Emergência', ['oficinas', 'borracharias', 'postos', 'taxis']],
  servicos: ['Serviços', ['bancos', 'correios', 'lavanderias', 'tecnologia', 'beleza', 'fotografos', 'contadores', 'orgaos-publicos']],
  construcao: ['Serviços', ['materiais', 'ferragens', 'engenheiros']], imobiliarias: ['Serviços', ['compra-venda']],
}
const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

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

  const name = limpa(b.name, 100), category = limpa(b.category, 30), subcategory = limpa(b.subcategory, 40)
  const whatsapp = limpa(b.whatsapp, 30).replace(/\D/g, ''), phone = limpa(b.phone, 30), address = limpa(b.address, 200)
  const description = limpa(b.description, 600), contato = limpa(b.contato, 100)
  const hours = typeof b.hours === 'object' && b.hours ? Object.fromEntries(Object.entries(b.hours as Record<string, unknown>).filter(([k, v]) => ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].includes(k) && typeof v === 'string' && v.trim()).map(([k, v]) => [k, String(v).trim().toLowerCase().slice(0, 40)])) : {}
  if (name.length < 2) return json({ erro: 'Informe o nome do negócio.' }, 400, h)
  if (!CATS[category] || !CATS[category][1].includes(subcategory)) return json({ erro: 'Escolha a categoria.' }, 400, h)
  if (whatsapp.length < 10 && phone.replace(/\D/g, '').length < 10) return json({ erro: 'Informe um WhatsApp ou telefone com DDD.' }, 400, h)
  if (contato.length < 2) return json({ erro: 'Informe seu nome.' }, 400, h)

  const umaHora = new Date(Date.now() - 3600_000).toISOString()
  const { count } = await db.from('businesses').select('id', { count: 'exact', head: true }).eq('source', 'autocadastro').gte('created_at', umaHora)
  if ((count ?? 0) >= 20) return json({ erro: 'Muitos cadastros agora. Tente mais tarde.' }, 429, h)
  const { count: meus } = await db.from('business_owners').select('business_id', { count: 'exact', head: true }).eq('user_id', user.id)
  if ((meus ?? 0) >= 10) return json({ erro: 'Limite de negócios por conta. Fale com o guia.' }, 429, h)
  const { data: igual } = await db.from('businesses').select('id,name').ilike('name', name).limit(1)
  if (igual?.length) return json({ erro: `“${igual[0].name}” já está no guia. Use “Já está no guia” para assumir a página.` }, 409, h)

  let slug = slugify(name) || 'lugar'
  const { data: slugs } = await db.from('businesses').select('slug').like('slug', `${slug}%`)
  if (slugs?.some(s => s.slug === slug)) slug = `${slug}-${(slugs.length + 1)}`
  const { data: novo, error } = await db.from('businesses').insert({
    name, slug, category, subcategory, urgency_group: CATS[category][0], address, city: 'Monte Verde', phone, whatsapp, email, description,
    hours: Object.keys(hours).length ? hours : null, status: 'draft', validation: 'pendente', source: 'autocadastro',
    internal_notes: `Autocadastro em ${new Date().toISOString().slice(0, 10)} por ${contato} (${email}, conta confirmada por e-mail).`,
  }).select('id,slug').single()
  if (error) return json({ erro: 'Não foi possível cadastrar agora.' }, 500, h)
  await db.from('business_owners').insert({ business_id: novo.id, user_id: user.id, email })
  await db.from('leads').insert({ name: contato, phone: whatsapp || phone, email, company: 'portal', interest: 'anunciar', message: `Autocadastro: ${name} (${category}/${subcategory}). Aprovar no painel → Lugares → Rascunhos.`, page: '/meu-negocio' })
  return json({ ok: true, id: novo.id, slug: novo.slug }, 200, h)
})
