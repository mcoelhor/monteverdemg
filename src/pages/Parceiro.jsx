import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Search, Bell, BarChart3, Monitor, Star, MapPin, MessageCircle, Phone, Navigation, ArrowRight, Check } from 'lucide-react'
import { Layout } from '../components/Layout/Layout'
import { BusinessCard } from '../components/UI/BusinessCard'
import { LeadForm } from '../components/LeadForm'
import { useBusinesses, useBusinessBySlug } from '../hooks/useBusinesses'
import { nomeSub } from '../data/categories'

// Apresentação para um estabelecimento: /parceiro/<slug>. Não aparece em menus nem no Google.
// Mostra, com os dados reais do lugar, como ele aparece no guia, no totem e para o turista.

const Passo = ({ n, icone: I, titulo, children }) => (
  <section className="px-5 pt-10">
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--araucaria)] text-[15px] font-bold text-white">{n}</span>
      <I size={22} className="text-[var(--musgo)]" />
    </div>
    <h2 className="serifa mt-3 text-[26px] font-semibold leading-tight">{titulo}</h2>
    <div className="mt-3">{children}</div>
  </section>
)

/** Celular com o totem de verdade rodando dentro (em escala). */
function TotemAoVivo({ slug }) {
  const W = 360, H = 740, ESC = 0.72
  return (
    <div className="mx-auto rounded-[44px] bg-[#0f1814] p-3 shadow-2xl" style={{ width: W * ESC + 24, height: H * ESC + 24 }}>
      <div className="overflow-hidden rounded-[34px]" style={{ width: W * ESC, height: H * ESC }}>
        <iframe title="Totem ao vivo" src={`/totem?local=${encodeURIComponent(slug)}&demo=1`} style={{ width: W, height: H, transform: `scale(${ESC})`, transformOrigin: '0 0', border: 0 }} />
      </div>
    </div>
  )
}

export function Parceiro() {
  const { slug } = useParams()
  const { business: b, loading } = useBusinessBySlug(slug)
  const { businesses } = useBusinesses({ category: b?.category, subcategory: b?.subcategory })
  const [hora, setHora] = useState('')
  useEffect(() => {
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex'; document.head.appendChild(m)
    setHora(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    return () => m.remove()
  }, [])
  // Como ele apareceria com o plano Parceiro: no topo da categoria, com selo
  const comoParceiro = useMemo(() => b ? { ...b, plan: 'premium', plan_expires_at: null, featured: true } : null, [b])
  const outros = businesses.filter(x => x.id !== b?.id).slice(0, 2)

  if (loading) return <Layout title="Apresentação"><div className="esqueleto m-5 h-60 rounded-2xl" /></Layout>
  if (!b) return <Layout title="Apresentação"><p className="p-5">Estabelecimento não encontrado.</p></Layout>

  const faltando = [!b.images?.length && 'fotos', !b.whatsapp && 'WhatsApp', !b.instagram && 'Instagram', !b.hours && 'horários', !b.description && 'descrição'].filter(Boolean)

  return (
    <Layout title={`Monte Verde MG para ${b.name}`} showBack>
      <section className="mx-5 mt-2 rounded-[var(--raio)] bg-[var(--araucaria)] p-6 text-white">
        <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#d8c3a5]">Apresentação para</p>
        <h1 className="serifa mt-2 text-[30px] font-semibold leading-tight">{b.name}</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-white/85">Como o {b.name.split(' ')[0]} aparece para o turista no guia Monte Verde MG, no totem da mesa e no celular de quem está na vila.</p>
      </section>

      <Passo n={1} icone={Search} titulo="O turista procura “pizza” ou “onde jantar”">
        <p className="text-[15px] leading-relaxed text-[var(--leve)]">Com o plano Parceiro, o {b.name.split(' ')[0]} aparece primeiro, com selo e foto. Assim fica a lista de {nomeSub(b).toLowerCase()}:</p>
        <div className="mt-4 space-y-3">
          <div className="relative">
            <span className="absolute -top-3 left-4 z-10 rounded-full bg-[var(--madeira,#B08D6B)] px-3 py-1 text-[12px] font-bold text-[var(--araucaria)]">Com o plano Parceiro</span>
            <BusinessCard business={comoParceiro} />
          </div>
          {outros.map((x, i) => <div key={x.id} className="opacity-60"><BusinessCard business={x} compacto index={i + 1} /></div>)}
        </div>
      </Passo>

      <Passo n={2} icone={MapPin} titulo="A página do restaurante, com tudo à mão">
        <p className="text-[15px] leading-relaxed text-[var(--leve)]">Endereço no mapa (também sem internet), “aberto agora”, ligar, WhatsApp e rota em um toque.</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[13px] font-semibold">
          <span className="flex flex-col items-center gap-1 rounded-2xl border border-[var(--borda)] bg-white p-3"><Phone size={20} />Ligar</span>
          <span className="flex flex-col items-center gap-1 rounded-2xl border border-[var(--borda)] bg-white p-3"><MessageCircle size={20} />WhatsApp</span>
          <span className="flex flex-col items-center gap-1 rounded-2xl border border-[var(--borda)] bg-white p-3"><Navigation size={20} />Rota</span>
        </div>
        <Link to={`/estabelecimento/${b.slug}`} className="botao botao-sec mt-3 flex items-center justify-center gap-2">Abrir a página do {b.name.split(' ')[0]} <ArrowRight size={18} /></Link>
        {faltando.length > 0 && <p className="mt-3 rounded-2xl bg-[var(--nevoa-2)] p-3 text-[14px]">Hoje faltam: <b>{faltando.join(', ')}</b>. Completamos juntos, sem custo.</p>}
      </Passo>

      <Passo n={3} icone={Monitor} titulo="O totem na mesa, rodando agora">
        <p className="mb-4 text-[15px] leading-relaxed text-[var(--leve)]">É exatamente o que aparece no celular da mesa: a tela de boas-vindas do {b.name.split(' ')[0]}, o guia da vila, o concierge e a emergência, com QR code. Nunca aparece outro restaurante.</p>
        <TotemAoVivo slug={b.slug} />
      </Passo>

      <Passo n={4} icone={Bell} titulo="Aviso no celular de quem está na vila">
        <p className="text-[15px] leading-relaxed text-[var(--leve)]">Até 3 por semana, entre 8h e 21h, só para quem aceitou receber ofertas.</p>
        <div className="mt-4 rounded-[22px] bg-[#1f2a25] p-4 text-white shadow-xl">
          <div className="flex items-center gap-2 text-[12px] text-white/70"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#2f443a] text-[10px]">MV</span>Monte Verde MG · {hora || 'agora'}</div>
          <p className="mt-2 text-[15px] font-semibold">{b.name}</p>
          <p className="text-[14px] text-white/85">[Hoje tem rodízio a partir das 19h. Toque e veja como chegar.]</p>
        </div>
        <p className="mt-2 text-[13px] text-[var(--leve)]">O texto é vocês que escrevem.</p>
      </Passo>

      <Passo n={5} icone={BarChart3} titulo="Resultado na palma da mão">
        <p className="text-[15px] leading-relaxed text-[var(--leve)]">Na área do dono, todo mês: quantos viram a página, ligaram, chamaram no WhatsApp, pediram rota e leram o QR do totem.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[['Visitas', 'página aberta'], ['Contatos', 'ligação e WhatsApp'], ['Rotas', 'pediram o caminho'], ['Mesas', 'leram o QR']].map(([t, s]) => (
            <div key={t} className="rounded-2xl border border-[var(--borda)] bg-white p-4"><p className="serifa text-[22px] font-semibold">{t}</p><p className="text-[13px] text-[var(--leve)]">{s}</p></div>
          ))}
        </div>
      </Passo>

      <Passo n={6} icone={Star} titulo="A proposta">
        <div className="rounded-[var(--raio)] bg-[var(--salvia,#587660)] p-5 text-white">
          <p className="text-[15px] line-through opacity-80">Plano Parceiro R$ 129/mês</p>
          <p className="serifa text-[44px] font-bold leading-none">R$ 0</p>
          <p className="mt-1 text-[16px]">nos 3 primeiros meses + totens nas mesas sem custo</p>
          <ul className="mt-4 space-y-2 text-[15px]">
            {['Topo da categoria e da busca, com selo Parceiro', 'Tela própria no totem, sem concorrentes', 'Até 3 avisos por semana no celular dos turistas', 'Relatório mensal', 'Sem fidelidade: pode parar quando quiser'].map(t => <li key={t} className="flex gap-2"><Check size={18} className="mt-0.5 shrink-0" />{t}</li>)}
          </ul>
        </div>
      </Passo>

      <section className="px-5 pb-6 pt-10">
        <h2 className="serifa text-[24px] font-semibold">Quero participar</h2>
        <p className="mb-4 mt-1 text-[15px] text-[var(--leve)]">Deixe o contato e a gente combina a instalação.</p>
        <LeadForm empresa="portal" interesse="anuncio" botao="Quero participar" inicial={`Parceria totem + plano Parceiro para ${b.name}.`} />
      </section>
    </Layout>
  )
}
