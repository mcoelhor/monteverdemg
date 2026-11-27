import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Search, ArrowRight, Route, Menu, X } from 'lucide-react'
import { Icon } from '../components/UI/Icon'
import { Layout } from '../components/Layout/Layout'
import { EventCard } from '../components/UI/EventCard'
import { Parceiros } from '../components/Parceiros'
import { useBusinesses } from '../hooks/useBusinesses'
import { useEvents } from '../hooks/useEvents'
import { CATEGORIES } from '../data/categories'
import { FOTOS, FOTO_CATEGORIA } from '../data/fotos'
import { agoraMV, DIAS_NOME, DIAS, hhmm } from '../lib/horario'
import { useClima } from '../hooks/useClima'
import { useOfertas } from '../hooks/useOfertas'
import { Avisos } from '../components/Avisos'
import { BotaoVoz } from '../components/BotaoVoz'
import { CartaoOferta } from '../components/Oferta'
import { useInstalar } from '../hooks/useInstalar'
import { epocasDoMes, NOME_MES } from '../data/epoca'
import { registrar } from '../lib/track'

const POSTER = [FOTOS.marDeNuvens, FOTOS.porDoSol, FOTOS.enxaimel, FOTOS.serra, FOTOS.ruaAraucaria]
const SO_AQUI = [
  [FOTOS.serelepe, 'Serelepes que descem das araucárias atrás de pinhão'],
  [FOTOS.samambaia, 'Samambaiaçus, as samambaias gigantes da Mata Atlântica'],
  [FOTOS.capela, 'Capelas de madeira e torres brancas'],
  [FOTOS.chale, 'Chalés de telhado alto, feitos para o frio'],
  [FOTOS.nuvensVale, 'Manhãs em que o vale vira um mar de nuvens'],
]
const MOMENTOS = [
  ['Dia de chuva', 'chuva'], ['Com crianças', 'criancas'], ['A dois', 'a-dois'],
  ['Aventura', 'aventura'], ['Depois que escurece', 'noite'], ['Com o cachorro', 'pet'],
]

function saudacao(min) {
  if (min < 300) return 'Boa madrugada'
  if (min < 720) return 'Bom dia'
  if (min < 1080) return 'Boa tarde'
  return 'Boa noite'
}

/** Topo do celular: menu à esquerda, marca no centro, busca à direita (como na referência aprovada). */
function Topo() {
  return (
    <header className="grid grid-cols-[44px_1fr_44px] items-center bg-[var(--papel)] px-3 pb-2 lg:hidden" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
      <Link to="/mais" aria-label="Menu" className="pressiona flex h-11 w-11 items-center justify-center rounded-full"><Menu size={22} /></Link>
      <Link to="/" className="flex flex-col items-center leading-none" aria-label="Monte Verde MG, início">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="26" height="26" className="mb-0.5" />
        <span className="serifa text-[18px] font-semibold">Monte Verde MG</span>
      </Link>
      <Link to="/busca" aria-label="Buscar" className="pressiona flex h-11 w-11 items-center justify-center rounded-full"><Search size={21} /></Link>
    </header>
  )
}

/* Banner cinematográfico (referência Visit Norway): quando houver vídeo real e autorizado de Monte Verde,
   basta preencher HERO_VIDEO. Até lá, as fotos reais da vila se sucedem devagar, com movimento suave.
   Quem pede movimento reduzido vê só a foto parada. */
const HERO_VIDEO = { mp4: '', webm: '', creditos: '' }

function Hero() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const [prontas, setProntas] = useState(() => new Set([0]))
  const reduzido = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const conexaoLeve = typeof navigator !== 'undefined' && (navigator.connection?.saveData || /2g/.test(navigator.connection?.effectiveType || ''))
  const comVideo = !!(HERO_VIDEO.mp4 || HERO_VIDEO.webm) && !reduzido && !conexaoLeve
  useEffect(() => {
    if (reduzido || comVideo) return
    const pre = setTimeout(() => setProntas(p => new Set(p).add((i + 1) % POSTER.length)), 5500)
    const t = setTimeout(() => setI((i + 1) % POSTER.length), 7500)
    return () => { clearTimeout(pre); clearTimeout(t) }
  }, [i, reduzido, comVideo])
  return (
    <section className="relative" aria-labelledby="h-hero">
      <div className="relative h-[62svh] min-h-[420px] max-h-[640px] overflow-hidden bg-[var(--nevoa-2)] lg:h-[86svh] lg:max-h-[860px]">
        {comVideo ? (
          <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline preload="metadata" poster={POSTER[0].g} aria-hidden="true">
            {HERO_VIDEO.webm && <source src={HERO_VIDEO.webm} type="video/webm" />}
            {HERO_VIDEO.mp4 && <source src={HERO_VIDEO.mp4} type="video/mp4" />}
          </video>
        ) : POSTER.map((f, k) => prontas.has(k) && (
          <div key={f.id} className={`slide lenta ${k === i ? 'on' : ''}`} aria-hidden={k !== i}>
            <img src={f.g} srcSet={`${f.p} 700w, ${f.g} 1600w`} sizes="100vw" alt={k === i ? f.legenda : ''}
              className={`h-full w-full object-cover ${reduzido ? '' : 'deriva'}`} fetchPriority={k === 0 ? 'high' : 'auto'} />
          </div>
        ))}
        <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, rgb(20 22 20 / .18) 0%, rgb(20 22 20 / 0) 30%, rgb(20 22 20 / .1) 55%, rgb(20 22 20 / .6) 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 px-5 pb-6 text-white lg:pb-28">
          <div className="lg:mx-auto lg:max-w-[1180px] lg:px-3">
            <h1 id="h-hero" className="sobe serifa font-semibold leading-[1.02]" style={{ '--i': 0 }}>
              <span className="block text-[30px] font-medium italic lg:text-[46px]">Descubra</span>
              <span className="block text-[48px] lg:text-[96px]">Monte Verde</span>
            </h1>
            <p className="sobe mt-2 max-w-[38ch] text-[16px] leading-snug text-white/90 lg:text-[19px]" style={{ '--i': 1 }}>
              Experiências autênticas, boa gastronomia e o charme da serra em um só lugar.
            </p>
            <form onSubmit={e => { e.preventDefault(); if (q.trim()) navigate(`/busca?q=${encodeURIComponent(q.trim())}`) }} role="search"
              className="sobe mt-4 flex h-[52px] items-center gap-2 rounded-full bg-[var(--papel)] pl-4 pr-1.5 text-[var(--araucaria)] lg:h-[58px] lg:max-w-[560px]" style={{ '--i': 2 }}>
              <Search size={19} className="shrink-0 text-[var(--leve)]" />
              <input type="search" enterKeyHint="search" value={q} onChange={e => setQ(e.target.value)} aria-label="O que você procura hoje?"
                placeholder="O que você procura hoje?" className="min-w-0 flex-1 bg-transparent text-[16px] placeholder:text-[var(--leve)]" />
              {q && <button type="button" onClick={() => setQ('')} aria-label="Limpar busca" className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--leve)]"><X size={17} /></button>}
              <BotaoVoz onTexto={t => navigate(`/busca?q=${encodeURIComponent(t)}`)} />
            </form>
          </div>
        </div>
        {!comVideo && <p className="absolute right-4 top-4 hidden rounded-full bg-black/30 px-2.5 py-1 text-[11px] text-white/90 lg:block">{POSTER[i].legenda} · foto {POSTER[i].autor}</p>}
      </div>
    </section>
  )
}

// Chips de intenção mudam com a hora: de manhã café, à noite fondue e pizza.
function chipsDaHora(min, chuva = false) {
  if (chuva) return [['Dia de chuva', 'chuva'], ['Café e chocolate', 'chocolate quente'], ['Fondue', 'fondue'], ['Lojinhas', 'lembranca']]
  if (min < 660) return [['Café da manhã', 'cafe da manha'], ['Trilha', 'trilha'], ['Mar de nuvens', 'mirante'], ['Farmácia', 'farmacia']]
  if (min < 900) return [['Almoço', 'almoco'], ['Comida mineira', 'mineira'], ['Aventura', 'aventura'], ['Com crianças', 'criancas']]
  if (min < 1080) return [['Café e chocolate', 'chocolate quente'], ['Lojinhas', 'lembranca'], ['Aventura', 'aventura'], ['Dia de chuva', 'chuva']]
  return [['Fondue', 'fondue'], ['Pizza', 'pizza'], ['Cervejaria', 'cervejaria'], ['A dois', 'a-dois']]
}

const MV = { lat: -22.86, lon: -46.03 }
function distanciaKm(a, b) {
  const r = Math.PI / 180, R = 6371
  const x = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lon - a.lon) * r / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

/** Quem já liberou a localização e está na vila ganha as boas-vindas (uma vez por dia). */
function useChegou() {
  const [chegou, setChegou] = useState(false)
  useEffect(() => {
    if (!navigator.geolocation || !navigator.permissions?.query) return
    const hoje = new Date().toISOString().slice(0, 10)
    try { if (localStorage.getItem('mv_chegou') === hoje) return } catch { /* */ }
    navigator.permissions.query({ name: 'geolocation' }).then(p => {
      if (p.state !== 'granted') return
      navigator.geolocation.getCurrentPosition(pos => {
        const d = distanciaKm({ lat: pos.coords.latitude, lon: pos.coords.longitude }, MV)
        if (d <= 12) { setChegou(true); registrar('visita', { term: 'na-vila' }); try { localStorage.setItem('mv_chegou', hoje) } catch { /* */ } }
      }, () => {}, { maximumAge: 10 * 60 * 1000, timeout: 8000 })
    }).catch(() => {})
  }, [])
  return chegou
}

function BoasVindas() {
  const { podeInstalar, instalar, ios, instalado } = useInstalar()
  return (
    <div className="sobe mt-4 rounded-[var(--raio)] bg-[var(--broto)] p-4 text-[var(--araucaria)]" style={{ '--i': 2 }}>
      <p className="text-[18px] font-semibold leading-tight">Você está em Monte Verde. Bem-vindo!</p>
      <p className="mt-1 text-[14px] leading-snug">Este guia mostra quem está aberto agora, monta seu roteiro e tem os contatos de emergência da vila.</p>
      {!instalado && podeInstalar && <button onClick={instalar} className="botao botao-escuro mt-3 h-11 min-h-0 w-full text-[15px]">Instalar o app no celular</button>}
      {!instalado && !podeInstalar && ios && <p className="mt-2 text-[13px]">No iPhone: Compartilhar → Adicionar à Tela de Início.</p>}
    </div>
  )
}

/** Atalhos e o agora: as quatro decisões da viagem, o clima e o concierge. */
function Agora() {
  const navigate = useNavigate()
  const a = agoraMV()
  const clima = useClima()
  const { businesses } = useBusinesses({})
  const abertos = businesses.filter(b => b.st.estado === 'aberto' || b.st.estado === 'plantao')
  const frio = clima && clima.minNoite != null && clima.minNoite <= 10 && a.min >= 840
  const chegou = useChegou()
  const ACOES = [
    ['Comer agora', '/categoria/alimentacao?aberto=1', 'Utensils'],
    ['Ficar', '/categoria/hospedagem', 'BedDouble'],
    ['Fazer hoje', '/categoria/turismo', 'Mountain'],
    ['Serviços úteis', '/uteis', 'MapPin'],
  ]

  return (
    <section className="relative px-5 pt-5 lg:mx-auto lg:max-w-[1180px] lg:px-3 lg:pt-0" aria-label="Atalhos">
      <nav className="sobe grid grid-cols-4 gap-2.5 lg:-mt-16 lg:gap-4" style={{ '--i': 2 }} aria-label="Atalhos principais">
        {ACOES.map(([t, to, ic]) => (
          <Link key={to} to={to} className="pressiona superficie flex min-h-[88px] flex-col items-center justify-center gap-2 px-1 text-center shadow-[var(--sombra)] lg:min-h-[120px] lg:flex-row lg:gap-3">
            <Icon name={ic} size={26} strokeWidth={1.6} className="text-[var(--araucaria)]" />
            <span className="text-[13px] font-semibold leading-tight lg:text-[17px]">{t}</span>
          </Link>
        ))}
      </nav>

      <div className="lg:mt-8 lg:grid lg:grid-cols-2 lg:gap-x-8"><div>
      <p className="sobe mt-5 flex flex-wrap items-center gap-x-1.5 text-[15px] text-[var(--leve)] lg:mt-0" style={{ '--i': 3 }}>
        <span>{saudacao(a.min)}. {DIAS_NOME[DIAS[a.dia]]}, <span className="num">{hhmm(a.min)}</span>.</span>
        {clima && <span className="inline-flex items-center gap-1 text-[var(--araucaria)]"><Icon name={clima.icone} size={16} className="text-[var(--salvia)]" /><span><span className="num">{clima.temp} °C</span>, {clima.texto}</span></span>}
        {abertos.length > 0 && <Link to="/categoria/alimentacao?aberto=1" className="font-semibold text-[var(--musgo)]"><span className="num">{abertos.length}</span> lugares abertos agora</Link>}
      </p>

      {chegou && <BoasVindas />}

      {clima && (clima.chuvaProx || clima.chuvaHoje || frio) && (
        <Link to={clima.chuvaProx || clima.chuvaHoje ? '/busca?q=chuva' : '/busca?q=fondue'} className="sobe pressiona superficie mt-3 flex items-center gap-3 p-4" style={{ '--i': 3 }}>
          <Icon name={clima.chuvaProx || clima.chuvaHoje ? 'CloudRain' : 'Snowflake'} size={24} className="shrink-0 text-[var(--salvia)]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold leading-tight">
              {clima.chuvaProx ? 'Chuva nas próximas horas' : clima.chuvaHoje ? 'Chove hoje' : `Esfria à noite: ${clima.minNoite} °C`}
            </span>
            <span className="block text-[14px] text-[var(--leve)]">{clima.chuvaProx || clima.chuvaHoje ? 'Plano B: chocolaterias, cervejarias, galerias e lugares cobertos' : 'Leve casaco. Fondue, lareira e vinho são a pedida'}</span>
          </span>
          <ArrowRight size={18} className="shrink-0 text-[var(--musgo)]" />
        </Link>
      )}

      <div className="sobe -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide lg:mx-0 lg:flex-wrap lg:px-0" style={{ '--i': 4 }}>
        {chipsDaHora(a.min, clima?.chuvaHoje).map(([t, termo]) => (
          <Link key={termo} to={`/busca?q=${encodeURIComponent(termo)}`} className="chip">{t}</Link>
        ))}
      </div>

      </div><div>
      <Link to="/concierge" className="sobe pressiona superficie mt-4 flex items-center gap-3 p-4 lg:mt-0" style={{ '--i': 5 }}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--broto)]"><Icon name="Sparkles" size={20} className="text-[var(--musgo)]" /></span>
        <span className="min-w-0 flex-1">
          <span className="serifa block text-[18px] font-semibold leading-tight">Concierge: seu roteiro em 1 minuto</span>
          <span className="block text-[14px] text-[var(--leve)]">Diga com quem veio e do que gosta.</span>
        </span>
        <ArrowRight size={18} className="shrink-0 text-[var(--musgo)]" />
      </Link>
      <button type="button" onClick={() => navigate('/roteiro')} className="sobe botao botao-pri mt-3 h-[52px] w-full" style={{ '--i': 5 }}>
        <Route size={19} />Montar meu roteiro
      </button>
      </div></div>
    </section>
  )
}

/** Paisagens e programas da vila: cards fotográficos (fotos da cidade, não de estabelecimentos). */
const DESTAQUES = [
  [FOTOS.marDeNuvens, 'Mar de nuvens', 'Manhãs no mirante', 'mirante'],
  [FOTOS.avenida, 'A Avenida', 'Lojinhas, cafés e chocolate', 'avenida'],
  [FOTOS.chalesMata, 'Chalés na mata', 'Onde dormir no frio', 'chale'],
  [FOTOS.serra, 'Trilhas e serra', 'Natureza e aventura', 'trilha'],
  [FOTOS.enxaimel, 'Arquitetura', 'Casas enxaimel e capelas', 'passeio'],
]
function Destaques() {
  return (
    <section className="mt-12 lg:mt-16" aria-labelledby="h-destaques">
      <div className="flex items-end justify-between px-5 lg:px-0">
        <h2 id="h-destaques" className="titulo revela">Destaques da Serra</h2>
        <Link to="/categorias" className="shrink-0 whitespace-nowrap text-[15px] font-semibold text-[var(--musgo)]">Ver todos <ArrowRight size={15} className="inline" /></Link>
      </div>
      <div className="mt-5 flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0" style={{ scrollSnapType: 'x mandatory', scrollPaddingInline: 20 }}>
        {DESTAQUES.map(([f, t, sub, q]) => (
          <Link key={q} to={`/busca?q=${q}`} className="card-foto aspect-[4/5] w-[62%] shrink-0 lg:w-auto" style={{ scrollSnapAlign: 'start' }}>
            <img src={f.p} alt={f.legenda} loading="lazy" />
            <span className="rotulo"><span className="serifa block text-[21px] font-semibold leading-tight">{t}</span><span className="block text-[13px] text-white/85">{sub}</span></span>
          </Link>
        ))}
      </div>
    </section>
  )
}

/** O que está na época neste mês: uma linha com foto, leva à página completa. */
function NaEpoca() {
  const mes = new Date().getMonth()
  const lista = epocasDoMes(mes)
  if (!lista.length) return null
  const e = lista[0]
  return (
    <section className="mt-16 px-5" aria-labelledby="h-epoca">
      <h2 id="h-epoca" className="titulo revela">Na época: {e.nome.toLowerCase()}</h2>
      <Link to="/epoca" className="revela pressiona mt-5 flex items-center gap-4 rounded-[var(--raio)] bg-[var(--papel)] p-2.5 pr-4" style={{ '--i': 1 }}>
        <img src={e.foto.p} alt={e.foto.legenda} loading="lazy" className="h-[88px] w-[88px] shrink-0 rounded-[14px] object-cover" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-snug">{e.resumo}</span>
          <span className="mt-1 block text-[14px] font-bold text-[var(--musgo)]">O que {NOME_MES[mes]} tem de melhor{lista.length > 1 ? ` (+${lista.length - 1})` : ''}</span>
        </span>
        <ArrowRight size={19} className="shrink-0 text-[var(--musgo)]" />
      </Link>
    </section>
  )
}

/** Ofertas dos lugares verificados, quando existem. */
function Ofertas() {
  const { ofertas } = useOfertas()
  const { businesses } = useBusinesses({})
  if (!ofertas.length) return null
  const porId = new Map(businesses.map(b => [b.id, b]))
  const lista = ofertas.filter(o => porId.has(o.business_id)).slice(0, 4)
  if (!lista.length) return null
  return (
    <section className="mt-16 px-5" aria-labelledby="h-ofertas">
      <div className="flex items-end justify-between">
        <h2 id="h-ofertas" className="titulo revela">Ofertas da semana</h2>
        <Link to="/ofertas" className="text-[15px] font-bold text-[var(--musgo)]">Todas</Link>
      </div>
      <p className="revela mt-2 text-[15px] text-[var(--leve)]">Dos próprios estabelecimentos. Mostre a tela e pronto.</p>
      <div className="mt-5 space-y-3">
        {lista.map((o, k) => <div key={o.id} className="revela" style={{ '--i': k }}><CartaoOferta oferta={o} lugar={porId.get(o.business_id)} mostrarLugar compacto /></div>)}
      </div>
    </section>
  )
}

/** Convite ao roteiro: foto grande, cartão encostado embaixo. */
function ConviteRoteiro() {
  return (
    <section className="relative mt-16 lg:grid lg:grid-cols-[1.3fr_1fr] lg:items-center" aria-labelledby="h-roteiro">
      <div className="revela-foto relative aspect-[4/3] overflow-hidden lg:rounded-[var(--raio)]">
        <img src={FOTOS.porDoSol.g} srcSet={`${FOTOS.porDoSol.p} 700w, ${FOTOS.porDoSol.g} 1600w`} sizes="480px" alt={FOTOS.porDoSol.legenda} loading="lazy" className="deriva h-full w-full object-cover" />
      </div>
      <div className="revela relative -mt-16 mx-5 rounded-[var(--raio)] bg-[var(--papel)] p-6 lg:-ml-24 lg:mr-0 lg:mt-0 lg:p-10">
        <h2 id="h-roteiro" className="titulo">Seu fim de semana, já montado</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-[var(--leve)]">
          Diga quantos dias fica, com quem vem e do que gosta. Montamos manhã, almoço, tarde e jantar, priorizando quem tem horário confirmado para o dia. Depois é só trocar o que quiser.
        </p>
        <Link to="/roteiro" className="botao botao-pri mt-5 w-full">Montar em 30 segundos <ArrowRight size={18} /></Link>
      </div>
    </section>
  )
}

/** A vila em duas frases e três fotos, num bloco só (sem rolagem longa). */
function Historia() {
  return (
    <section className="mt-16 px-5" aria-labelledby="h-historia">
      <h2 id="h-historia" className="titulo revela max-w-[14ch]">Um pedaço da Europa a 1.554 metros</h2>
      <p className="revela mt-3 max-w-[36ch] text-[17px] leading-relaxed text-[var(--leve)]" style={{ '--i': 1 }}>
        Um imigrante europeu, com saudade do frio, fundou aqui uma vila de montanha. Ficaram os chalés de telhado alto, as casas enxaimel e o costume de acender a lareira.
      </p>
      <div className="revela mt-6 grid grid-cols-5 grid-rows-2 gap-2" style={{ '--i': 2, height: 'min(64vw, 300px)' }}>
        <img src={FOTOS.enxaimel.p} alt={FOTOS.enxaimel.legenda} loading="lazy" className="col-span-3 row-span-2 h-full w-full rounded-[var(--raio)] object-cover" />
        <img src={FOTOS.ruaAraucaria.p} alt={FOTOS.ruaAraucaria.legenda} loading="lazy" className="col-span-2 h-full w-full rounded-[var(--raio)] object-cover" />
        <img src={FOTOS.capela.p} alt={FOTOS.capela.legenda} loading="lazy" className="col-span-2 h-full w-full rounded-[var(--raio)] object-cover" />
      </div>
    </section>
  )
}

/** Momentos: lista em um tamanho só, como um programa. */
function Momentos() {
  return (
    <section className="px-5 pt-14" aria-labelledby="h-momentos">
      <h2 id="h-momentos" className="titulo revela">Para cada momento da viagem</h2>
      <p className="revela mt-2 text-[15px] text-[var(--leve)]">Escolhas do guia, não anúncios.</p>
      <ul className="mt-6">
        {MOMENTOS.map(([t, q], k) => (
          <li key={q} className="revela" style={{ '--i': k % 4 }}>
            <Link to={`/busca?q=${q}`} className="group flex min-h-12 items-center justify-between gap-3 py-2">
              <span className="text-[26px] font-bold leading-tight tracking-[-0.02em] transition-colors duration-150 group-active:text-[var(--musgo)]">{t}</span>
              <ArrowRight size={22} className="shrink-0 text-[var(--musgo)] transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Uma moldura só, o conteúdo troca: o que só existe aqui. Toque avança. */
function SoAqui() {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI(v => (v + 1) % SO_AQUI.length), 3400)
    return () => clearInterval(t)
  }, [i])
  return (
    <section className="mt-16 bg-[var(--ceu)] px-5 py-12" aria-labelledby="h-soaqui">
      <h2 id="h-soaqui" className="titulo revela">O que só tem aqui</h2>
      <button onClick={() => setI(v => (v + 1) % SO_AQUI.length)} className="revela relative mx-auto mt-6 block aspect-[4/3] w-full overflow-hidden rounded-[var(--raio)]" aria-label="Próxima foto">
        {SO_AQUI.map(([f], k) => (
          <img key={f.id} src={f.p} alt={k === i ? f.legenda : ''} loading="lazy" className={`slide h-full w-full object-cover ${k === i ? 'on' : ''}`} style={{ transitionDuration: '700ms' }} />
        ))}
      </button>
      <p key={i} className="entra mx-auto mt-4 max-w-[30ch] text-center text-[16px] leading-snug">{SO_AQUI[i][1]}</p>
    </section>
  )
}

/** Explore por categoria: cards fotográficos, como uma revista de viagem. */
function Explorar() {
  const ITENS = [
    ['alimentacao', 'Gastronomia', 'Restaurantes, cafés e sabores da serra'],
    ['hospedagem', 'Hospedagem', 'Pousadas, chalés e hotéis'],
    ['turismo', 'Natureza e passeios', 'Trilhas, mirantes e atrações'],
    ['compras', 'Compras', 'Lojas, artesanato e produtos locais'],
  ]
  return (
    <section className="mt-12 px-5 lg:mt-16 lg:px-0" aria-labelledby="h-explorar">
      <h2 id="h-explorar" className="titulo revela">Explore Monte Verde</h2>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ITENS.map(([id, t, sub], k) => {
          const c = CATEGORIES.find(x => x.id === id)
          if (!c) return null
          const f = FOTO_CATEGORIA[id]
          return (
            <Link key={id} to={`/categoria/${c.slug}`} className="revela card-foto aspect-[16/7]" style={{ '--i': k % 2 }}>
              <img src={f.p} alt="" loading="lazy" />
              <span className="rotulo flex items-end justify-between gap-3">
                <span><span className="serifa block text-[24px] font-semibold leading-tight">{t}</span><span className="block text-[14px] text-white/85">{sub}</span></span>
                <ArrowRight size={20} className="shrink-0" />
              </span>
            </Link>
          )
        })}
        <Link to="/uteis" className="revela superficie flex items-center gap-4 p-4 sm:col-span-2">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--broto)]"><Icon name="LifeBuoy" size={24} className="text-[var(--musgo)]" /></span>
          <span className="min-w-0 flex-1">
            <span className="serifa block text-[20px] font-semibold">Serviços úteis</span>
            <span className="block truncate text-[14px] text-[var(--leve)]">Farmácia, posto, caixa, táxi, saúde e emergência</span>
          </span>
          <ArrowRight size={19} className="shrink-0 text-[var(--musgo)]" />
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6">
        <Link to="/categorias" className="inline-flex min-h-12 items-center gap-2 text-[16px] font-semibold text-[var(--musgo)]">Todas as categorias <ArrowRight size={17} /></Link>
        <Link to="/como-chegar" className="inline-flex min-h-12 items-center gap-2 text-[16px] font-semibold text-[var(--musgo)]">Como chegar <ArrowRight size={17} /></Link>
      </div>
    </section>
  )
}

/** Chamada para quem tem negócio na vila. */
function ParaNegocios() {
  return (
    <section className="mt-16 lg:grid lg:grid-cols-2 lg:overflow-hidden lg:rounded-[var(--raio)]" aria-labelledby="h-negocio">
      <div className="revela-foto overflow-hidden">
        <img src={FOTOS.vilaAerea.g} alt={FOTOS.vilaAerea.legenda} loading="lazy" className="aspect-[4/3] w-full object-cover lg:h-full" />
      </div>
      <div className="bg-[var(--nevoa-2)] px-5 pb-10 pt-8 lg:flex lg:flex-col lg:justify-center lg:p-12">
        <h2 id="h-negocio" className="titulo revela">Tem um negócio em Monte Verde?</h2>
        <p className="revela mt-3 max-w-[34ch] text-[17px] leading-relaxed text-[var(--leve)]" style={{ '--i': 1 }}>
          Apareça para o turista na hora em que ele decide onde comer, dormir e passear. Cadastro grátis; destaque a partir de R$ 49 por mês.
        </p>
        <Link to="/anuncie" className="revela botao botao-pri mt-6 w-full" style={{ '--i': 2 }}>Ver planos e anunciar <ArrowRight size={18} /></Link>
      </div>
    </section>
  )
}

export function Home() {
  const { events } = useEvents({ filter: '30days' })
  return (
    <Layout hideHeader titulo="" largura="cheio">
      <Avisos />
      <Topo />
      <Hero />
      <Agora />
      <div className="lg:mx-auto lg:max-w-[1180px] lg:px-3">
        <Destaques />
        <Explorar />
      </div>
      <div className="lg:mx-auto lg:max-w-[1180px] lg:px-3">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-16">
          <div><Momentos /><NaEpoca /></div>
          <div><Ofertas /></div>
        </div>
        <ConviteRoteiro />
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-16">
          <Historia />
          <SoAqui />
        </div>
      </div>
      <div className="lg:mx-auto lg:max-w-[1180px] lg:px-3">
      {events.length > 0 && (
        <section className="mt-16" aria-labelledby="h-eventos">
          <div className="flex items-end justify-between px-5">
            <h2 id="h-eventos" className="titulo revela">Acontece na vila</h2>
            <Link to="/eventos" className="text-[15px] font-bold text-[var(--musgo)]">Todos</Link>
          </div>
          <div className="mt-5 flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
            {events.slice(0, 5).map(ev => <div key={ev.id} className="w-[78%] shrink-0 lg:w-[calc((100%-24px)/3)]" style={{ scrollSnapAlign: 'start' }}><EventCard event={ev} /></div>)}
          </div>
        </section>
      )}
      <div className="mt-12"><Parceiros contexto="home" /></div>
      <ParaNegocios />
      </div>
    </Layout>
  )
}
