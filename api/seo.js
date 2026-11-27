// sitemap.xml e robots.txt gerados do banco, para o Google achar cada lugar e categoria.
const SUPA = 'https://isotmggdbtqlyvddxmpe.supabase.co'
const KEY = 'sb_publishable_hCZZt7bF9DBiPFQnijrgmA_UF8PcrM5'
const CATS = ['alimentacao', 'hospedagem', 'turismo', 'compras', 'saude', 'transporte', 'servicos', 'construcao', 'imobiliarias']

export default async function handler(req, res) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
  const origem = `https://${host}`
  if (String(req.query.tipo) === 'robots') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=86400')
    // prévias da Vercel (um endereço por versão) ficam fora do Google
    if (/-[a-z0-9]{8,10}-tocaerp\.vercel\.app$/.test(host)) return res.end('User-agent: *\nDisallow: /\n')
    return res.end(`User-agent: *\nAllow: /\nDisallow: /meu-negocio\nDisallow: /api/\nSitemap: ${origem}/sitemap.xml\n`)
  }
  let lista = []
  try { const r = await fetch(`${SUPA}/rest/v1/businesses?status=eq.active&select=slug,category,subcategory,updated_at&order=name`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, signal: AbortSignal.timeout(5000) }); lista = r.ok ? await r.json() : [] } catch { /* sem banco: sitemap só com as páginas fixas */ }
  const subs = [...new Set(lista.map(b => `${b.category}/${b.subcategory}`))]
  const u = (loc, prio, mod) => `<url><loc>${origem}${loc}</loc>${mod ? `<lastmod>${mod.slice(0, 10)}</lastmod>` : ''}<priority>${prio}</priority></url>`
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + [u('/', '1.0'), u('/roteiro', '0.9'), u('/concierge', '0.9'), u('/trilhas', '0.8'), ['pedra-redonda','chapeu-do-bispo','plato','pedra-partida','pico-do-selado','pinheiro-velho'].map(s => u('/trilhas/' + s, '0.7')).join('\n'), u('/uteis', '0.8'), u('/sobre', '0.8'), u('/mapa', '0.7'), u('/como-chegar', '0.7'), u('/epoca', '0.6'), u('/app', '0.5'), u('/termos', '0.2'), u('/termos-anunciante', '0.2'), u('/ofertas', '0.7'), u('/categorias', '0.6'), u('/eventos', '0.5'), u('/anuncie', '0.4')].join('\n') + '\n'
    + CATS.map(c => u(`/categoria/${c}`, '0.8')).join('\n') + '\n'
    + subs.map(s => u(`/categoria/${s}`, '0.7')).join('\n') + '\n'
    + lista.map(b => u(`/estabelecimento/${b.slug}`, '0.6', b.updated_at)).join('\n')
    + '\n</urlset>\n'
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.end(xml)
}
