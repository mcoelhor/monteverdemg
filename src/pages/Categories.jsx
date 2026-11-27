import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ArrowRight } from 'lucide-react'
import { Layout } from '../components/Layout/Layout'
import { Icon } from '../components/UI/Icon'
import { CATEGORIES } from '../data/categories'
import { FOTO_CATEGORIA, FOTOS } from '../data/fotos'
import { useBusinesses } from '../hooks/useBusinesses'

const ORDEM = ['alimentacao', 'hospedagem', 'turismo', 'compras', 'saude', 'transporte', 'servicos', 'construcao', 'imobiliarias']

export function Categories() {
  const [aberta, setAberta] = useState(null)
  const { businesses } = useBusinesses()
  const conta = (cat, sub) => businesses.filter(b => b.category === cat && (!sub || b.subcategory === sub)).length
  const cats = ORDEM.map(id => CATEGORIES.find(c => c.id === id)).filter(Boolean)

  return (
    <Layout largura="largo" title="Explorar" subtitle="Tudo o que tem na vila" showSearch>
      <div className="px-5 pt-2">
        <Link to="/trilhas" className="pressiona mb-3 flex items-center gap-4 rounded-[18px] border border-[var(--borda)] bg-[var(--papel)] p-2.5 pr-4">
          <img src={FOTOS.serra.p} alt="" className="h-16 w-20 shrink-0 rounded-[12px] object-cover" />
          <span className="min-w-0 flex-1"><span className="serifa block text-[18px] font-semibold">Trilhas</span><span className="block text-[13px] text-[var(--leve)]">Pedra Redonda, Chapéu do Bispo, Pico do Selado e mais</span></span>
          <span aria-hidden="true" className="text-[var(--musgo)]">→</span>
        </Link>
      </div>
      <div className="grade-cards tres space-y-3 px-5 pt-2">
        {cats.map((c, i) => {
          const on = aberta === c.id
          const f = FOTO_CATEGORIA[c.id]
          return (
            <div key={c.id} className="entra overflow-hidden rounded-[18px] border border-[var(--borda)] bg-[var(--papel)]" style={{ '--i': i }}>
              <button className="pressiona relative block w-full text-left" onClick={() => setAberta(on ? null : c.id)} aria-expanded={on}>
                <span className="card-foto block aspect-[16/7] rounded-none">
                  <img src={f.p} alt="" loading={i < 3 ? 'eager' : 'lazy'} />
                  <span className="rotulo flex items-end justify-between gap-3">
                    <span className="min-w-0">
                      <span className="serifa block text-[24px] font-semibold leading-tight">{c.name} <span className="num font-sans text-[14px] font-semibold text-white/80">{conta(c.id) || ''}</span></span>
                      <span className="block truncate text-[14px] text-white/85">{c.description}</span>
                    </span>
                    <ChevronDown size={20} className="shrink-0 transition-transform duration-200" style={{ transform: on ? 'rotate(180deg)' : 'none' }} />
                  </span>
                </span>
              </button>
              <div className={`abre ${on ? 'aberto' : ''}`}><div>
                <div className="px-4 pb-3 pt-3">
                  <Link to={`/categoria/${c.slug}`} className="botao botao-pri h-11 min-h-0 w-full">Ver todos <ArrowRight size={17} /></Link>
                  {c.subcategories.filter(s => conta(c.id, s.id)).map(s => (
                    <Link key={s.id} to={`/categoria/${c.slug}/${s.slug}`} className="flex items-center gap-3 py-3 text-[16px] font-semibold">
                      <Icon name={s.icon} size={19} className="text-[var(--musgo)]" /><span className="flex-1">{s.name}</span>
                      <span className="num text-[14px] text-[var(--leve)]">{conta(c.id, s.id)}</span>
                    </Link>
                  ))}
                </div>
              </div></div>
            </div>
          )
        })}
        <Link to="/mapa" className="mt-4 flex min-h-12 items-center gap-2 text-[16px] font-bold text-[var(--musgo)]">Ver tudo no mapa <ArrowRight size={17} /></Link>
      </div>
    </Layout>
  )
}
