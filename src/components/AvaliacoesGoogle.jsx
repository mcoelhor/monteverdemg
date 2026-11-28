import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'

const FUNCAO = 'https://isotmggdbtqlyvddxmpe.supabase.co/functions/v1/avaliacoes-google'
const CATEGORIAS = new Set(['alimentacao', 'hospedagem', 'turismo', 'compras'])
const memoria = new Map() // evita buscar de novo ao voltar para a mesma página

function Estrelas({ nota, tamanho = 16 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${String(nota).replace('.', ',')} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map(i => {
        const cheio = Math.max(0, Math.min(1, nota - (i - 1)))
        return (
          <span key={i} className="relative inline-block" style={{ width: tamanho, height: tamanho }}>
            <Star size={tamanho} className="absolute inset-0 text-[#d8d3c7]" fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${cheio * 100}%` }}>
              <Star size={tamanho} className="text-[#e3a008]" fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        )
      })}
    </span>
  )
}

function Comentario({ a }) {
  const [aberto, setAberto] = useState(false)
  const longo = (a.texto || '').length > 220
  const Autor = a.autor_url ? 'a' : 'span'
  return (
    <li className="rounded-[var(--raio)] bg-white p-4">
      <div className="flex items-center gap-3">
        {a.foto
          ? <img src={a.foto} alt="" width="32" height="32" loading="lazy" referrerPolicy="no-referrer" className="h-8 w-8 shrink-0 rounded-full object-cover" />
          : <span className="h-8 w-8 shrink-0 rounded-full bg-[var(--nevoa)]" aria-hidden="true" />}
        <div className="min-w-0 flex-1">
          <Autor {...(a.autor_url ? { href: a.autor_url, target: '_blank', rel: 'noopener noreferrer' } : {})} className="block truncate text-[15px] font-bold">{a.autor}</Autor>
          <span className="flex items-center gap-2 text-[13px] text-[var(--leve)]">{a.nota != null && <Estrelas nota={a.nota} tamanho={13} />}{a.quando}</span>
        </div>
      </div>
      {a.texto && (
        <>
          <p className={`mt-2 whitespace-pre-line text-[15px] leading-relaxed ${!aberto && longo ? 'line-clamp-4' : ''}`}>{a.texto}</p>
          {longo && <button onClick={() => setAberto(v => !v)} className="mt-1 min-h-11 text-[14px] font-semibold text-[var(--musgo)]">{aberto ? 'Mostrar menos' : 'Ler mais'}</button>}
        </>
      )}
    </li>
  )
}

/** Nota e comentários do Google Maps, buscados pelo servidor (com atribuição, como pedem os termos do Google). */
export function AvaliacoesGoogle({ b }) {
  const pode = !!b?.id && CATEGORIAS.has(b.category)
  const [d, setD] = useState(() => (pode ? memoria.get(b.id) : null) || null)

  useEffect(() => {
    if (!pode || memoria.has(b.id)) { setD(memoria.get(b.id) || null); return }
    let vivo = true
    fetch(FUNCAO, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id }) })
      .then(r => r.json()).catch(() => ({ ok: false }))
      .then(x => { const v = x?.ok && x.nota != null ? x : null; memoria.set(b.id, v); if (vivo) setD(v) })
    return () => { vivo = false }
  }, [b?.id, pode])

  if (!d) return null
  return (
    <section className="sobe mt-5" style={{ '--i': 2 }} aria-labelledby="avaliacoes-google">
      <div className="rounded-[18px] border border-[var(--borda)] bg-[var(--papel)] p-4">
        <h2 id="avaliacoes-google" className="text-[17px] font-bold">Avaliações</h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="num text-[34px] font-bold leading-none">{d.nota.toFixed(1).replace('.', ',')}</span>
          <span className="flex flex-col gap-1">
            <Estrelas nota={d.nota} tamanho={18} />
            {d.total != null && <span className="num text-[13px] text-[var(--leve)]">{d.total.toLocaleString('pt-BR')} {d.total === 1 ? 'avaliação' : 'avaliações'}</span>}
          </span>
        </div>
        {d.avaliacoes?.length > 0 && (
          <ul className="mt-4 space-y-2">
            {d.avaliacoes.map((a, i) => <Comentario key={i} a={a} />)}
          </ul>
        )}
        <p className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-[var(--leve)]">
          <span>Fonte: <span translate="no" className="font-semibold text-[#5f6368]">Google Maps</span></span>
          {d.link && <a href={d.link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-[var(--musgo)] underline underline-offset-4">Ver todas no Google</a>}
        </p>
      </div>
    </section>
  )
}
