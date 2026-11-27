// Concierge Monte Verde MG: conversa com o turista e monta roteiros só com lugares do guia.
// Usa o Gemini no servidor. A chave fica no segredo GEMINI_API_KEY (nunca no app).
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const SITES = ['https://monteverdemg.com.br', 'https://www.monteverdemg.com.br', 'http://localhost:5173', 'http://localhost:4173']
const permitido = (o: string | null) => !!o && (SITES.includes(o) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(o))
const cors = (o: string | null) => ({
  'Access-Control-Allow-Origin': permitido(o) ? o! : SITES[0],
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Vary': 'Origin',
})
const json = (b: unknown, s: number, h: Record<string, string>) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...h, 'Content-Type': 'application/json' } })

const MODELOS = (Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite,gemini-2.5-flash').split(',').map(s => s.trim()).filter(Boolean)

// Guia em cache por 10 minutos (evita ler o banco a cada mensagem)
let cache: { em: number; texto: string; slugs: Set<string>; nomes: Map<string, string> } | null = null
async function guia() {
  if (cache && Date.now() - cache.em < 600_000) return cache
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data } = await db.from('businesses')
    .select('slug,name,category,subcategory,tags,hours,open_24h,description,plan,featured')
    .eq('status', 'active').not('slug', 'ilike', '%teste%').limit(600)
  const linhas = (data || []).map(b => {
    const h = b.open_24h ? '24h' : b.hours ? Object.entries(b.hours).map(([d, v]) => `${d} ${v}`).join('; ') : 'horário não informado'
    const destaque = b.featured || (b.plan && b.plan !== 'free') ? ' [parceiro]' : ''
    const desc = (b.description || '').replace(/\s+/g, ' ').slice(0, 110)
    return `${b.slug} | ${b.name}${destaque} | ${b.category}/${b.subcategory} | ${(b.tags || []).slice(0, 6).join(', ')} | ${h}${desc ? ' | ' + desc : ''}`
  })
  cache = { em: Date.now(), texto: linhas.join('\n'), slugs: new Set((data || []).map(b => b.slug)), nomes: new Map((data || []).map(b => [b.slug, b.name])) }
  return cache
}

function agora() {
  const f = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })
  return f.format(new Date())
}

const REGRAS = `Você é o Concierge do Monte Verde MG, o guia independente e curado de Monte Verde (distrito de Camanducaia, MG, 1.555 m, Serra da Mantiqueira).
Fale como um anfitrião local: acolhedor, direto e prático, em português do Brasil. Sem exageros ("imperdível", "incrível", "o melhor!!!").
Regras:
- Recomende SOMENTE lugares da lista GUIA abaixo. Nunca invente lugar, preço, telefone, horário ou característica.
- No campo "texto", escreva sempre o NOME do lugar, nunca o slug. Os slugs vão só nos campos "slug".
- O "porque" de cada lugar deve vir só do que o GUIA diz (categoria, etiquetas, descrição). Não acrescente adjetivos ou fatos que não estejam lá (ex.: não diga "vista panorâmica" se o guia não diz).
- Respeite o horário de cada lugar no dia e período sugeridos. Se o horário não for informado, avise "confirme o horário".
- Quando houver empate, prefira os marcados [parceiro], sem deixar de ser honesto.
- Pode sugerir paradas livres da vila (passeio pela Avenida Monte Verde, procurar o mar de nuvens cedo, fim de tarde entre araucárias) sem slug.
- Leve em conta frio e chuva: sugira casaco e alternativas cobertas quando fizer sentido.
- Só fale de emergência se o turista relatar uma: então oriente ligar 192 (SAMU), 193 (Bombeiros) ou 190 (Polícia) e indique o pronto-socorro do GUIA.
- Se faltar informação essencial (quantos dias, com quem), pergunte UMA coisa curta e já adiante uma sugestão.
- Respostas curtas: no máximo 90 palavras no campo "texto".
Responda APENAS em JSON válido neste formato:
{"texto": "resposta ao turista", "lugares": [{"slug": "slug", "porque": "1 frase"}], "dias": [{"titulo": "Sábado", "paradas": [{"periodo": "manha|almoco|tarde|cafe|jantar", "slug": "slug-ou-vazio", "nome": "nome", "porque": "1 frase"}]}], "sugestoes": ["próxima pergunta curta", "outra"]}
Use "dias" para roteiros de um ou mais dias. Use "lugares" (até 4) para respostas rápidas que citam lugares sem montar roteiro. Os dois podem ser [].`

async function gemini(chave: string, sistema: string, conversa: { role: string; text: string }[]) {
  const corpo = {
    systemInstruction: { parts: [{ text: sistema }] },
    contents: conversa.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] })),
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1400 },
  }
  let ultimoErro = ''
  for (const modelo of MODELOS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave }, body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(25_000),
    }).catch(e => ({ ok: false, status: 0, json: async () => ({ erro: String(e) }) } as Response))
    const d = await r.json().catch(() => ({}))
    if (r.ok) {
      const txt = d?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || ''
      return txt
    }
    ultimoErro = `${modelo} ${r.status} ${JSON.stringify(d).slice(0, 300)}`
  }
  throw new Error(ultimoErro)
}

// Limite simples por instância: 20 mensagens por 10 min por visitante
const uso = new Map<string, number[]>()
function excedeu(id: string) {
  const agora = Date.now(), janela = 600_000
  const l = (uso.get(id) || []).filter(t => agora - t < janela)
  l.push(agora); uso.set(id, l)
  return l.length > 20
}

Deno.serve(async (req) => {
  const o = req.headers.get('origin'); const h = cors(o)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h })
  // GET: só diz se o concierge está ligado (o site decide se mostra a caixa de conversa)
  if (req.method === 'GET') return json({ ativo: !!Deno.env.get('GEMINI_API_KEY') }, 200, { ...h, 'Cache-Control': 'public, max-age=300' })
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405, h)

  let b: { mensagens?: { role: string; text: string }[]; visitante?: string }
  try { b = await req.json() } catch { return json({ erro: 'json' }, 400, h) }
  const conversa = (Array.isArray(b.mensagens) ? b.mensagens : [])
    .filter(m => m && typeof m.text === 'string' && m.text.trim())
    .slice(-12).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', text: m.text.trim().slice(0, 1200) }))
  if (!conversa.length || conversa[conversa.length - 1].role !== 'user') return json({ erro: 'Escreva sua pergunta.' }, 400, h)

  const visitante = String(b.visitante || req.headers.get('x-forwarded-for') || 'anon').slice(0, 64)
  if (excedeu(visitante)) return json({ erro: 'Muitas mensagens seguidas. Espere alguns minutos.' }, 429, h)

  const chave = Deno.env.get('GEMINI_API_KEY')
  if (!chave) return json({ indisponivel: true, texto: 'O concierge entra no ar em breve. Enquanto isso, monte seu roteiro logo abaixo.' }, 200, h)

  const g = await guia()
  const sistema = `${REGRAS}\n\nAgora em Monte Verde: ${agora()}.\n\nGUIA (slug | nome | categoria | etiquetas | horário | descrição):\n${g.texto}`
  try {
    const bruto = await gemini(chave, sistema, conversa)
    let r: { texto?: string; lugares?: { slug?: string; porque?: string }[]; dias?: { titulo?: string; paradas?: { periodo?: string; slug?: string; nome?: string; porque?: string }[] }[]; sugestoes?: string[] }
    try { r = JSON.parse(bruto.replace(/^```json\s*|```$/g, '')) } catch { r = { texto: bruto.slice(0, 800), dias: [] } }
    // Descarta qualquer slug que não exista no guia
    const dias = (r.dias || []).slice(0, 7).map(d => ({
      titulo: String(d.titulo || '').slice(0, 40),
      paradas: (d.paradas || []).slice(0, 8).map(p => ({
        periodo: String(p.periodo || '').slice(0, 10),
        slug: p.slug && g.slugs.has(p.slug) ? p.slug : '',
        nome: String(p.nome || '').slice(0, 80),
        porque: String(p.porque || '').slice(0, 160),
      })).filter(p => p.nome),
    }))
    const lugares = (r.lugares || []).filter(l => l.slug && g.slugs.has(l.slug)).slice(0, 4).map(l => ({ slug: l.slug!, nome: g.nomes.get(l.slug!) || '', porque: String(l.porque || '').slice(0, 160) }))
    // Se algum slug escapar para o texto, troca pelo nome do lugar
    let texto = String(r.texto || '').slice(0, 1500)
    for (const [slug, nome] of [...g.nomes].sort((a, z) => z[0].length - a[0].length)) if (texto.includes(slug)) texto = texto.split(slug).join(nome)
    return json({ texto, lugares, dias, sugestoes: (r.sugestoes || []).slice(0, 3).map(s => String(s).slice(0, 60)) }, 200, h)
  } catch (e) {
    console.error('gemini', String(e).slice(0, 500))
    return json({ erro: 'O concierge não respondeu agora. Tente de novo em instantes.' }, 502, h)
  }
})
