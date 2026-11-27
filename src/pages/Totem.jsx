import { Logo } from '../components/UI/Logo'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { APP_TOTEM, localSalvo } from '../lib/totemApp'
import QRCode from 'qrcode'
import { useBusinesses } from '../hooks/useBusinesses'
import { FOTOS, FOTO_CATEGORIA } from '../data/fotos'
import { registrar } from '../lib/track'
import { useOfertas } from '../hooks/useOfertas'
import { Cardapio } from '../components/Cardapio'
import { TRILHAS } from '../data/trilhas'
import { Utensils, Mountain, LifeBuoy, Sparkles, X as Fechar, ChevronLeft, BookOpen } from 'lucide-react'

// Totem de mesa: um celular num suporte, em cima da mesa do restaurante, café ou pousada.
// Endereço: /totem?local=<slug do estabelecimento onde está o totem>
// Gira sozinho entre o convite do portal, os parceiros e o concierge. Cada QR code leva a origem "totem".

const SITE = 'https://monteverdemg.com.br'
const TEMPO = 9000 // ms por tela

function useQR(url) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let vivo = true
    QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: '#17231e', light: '#f5f3ed' }, errorCorrectionLevel: 'M' })
      .then(s => vivo && setSrc(s)).catch(() => {})
    return () => { vivo = false }
  }, [url])
  return src
}

const link = (caminho, local, peca) => `${SITE}${caminho}${caminho.includes('?') ? '&' : '?'}utm_source=totem&utm_medium=${encodeURIComponent(local || 'mesa')}&utm_content=${peca}`

export function Totem() {
  const [params] = useSearchParams()
  const local = params.get('local') || (APP_TOTEM ? localSalvo() : '')
  const navigate = useNavigate()
  // App do totem: 5 toques rápidos no canto de cima à esquerda abrem a troca de estabelecimento
  const toques = useRef([])
  const cantoSecreto = () => {
    const agora = Date.now()
    toques.current = [...toques.current.filter(t => agora - t < 3000), agora]
    if (toques.current.length >= 5) { toques.current = []; navigate('/totem/configurar') }
  }
  const { businesses } = useBusinesses({})
  const [i, setI] = useState(0)
  const [explorando, setExplorando] = useState(false)

  const anfitriao = businesses.find(b => b.slug === local)
  const parceiros = useMemo(() => businesses
    .filter(b => (b.featured || (b.plan && b.plan !== 'free')) && !/teste/.test(b.slug) && b.slug !== local)
    // no totem de um lugar, nunca aparece concorrente da mesma categoria (ex.: outro restaurante na mesa do restaurante)
    .filter(b => !anfitriao || b.category !== anfitriao.category)
    .sort((a, z) => (z.plan === 'premium') - (a.plan === 'premium')), [businesses, local, anfitriao])

  const telas = useMemo(() => {
    const t = [{ tipo: 'portal' }]
    if (anfitriao) t.push({ tipo: 'casa' })
    parceiros.slice(0, 6).forEach((b, k) => { t.push({ tipo: 'parceiro', b }); if (k === 1) t.push({ tipo: 'concierge' }) })
    if (parceiros.length < 2) t.push({ tipo: 'concierge' })
    t.push({ tipo: 'emergencia' }, { tipo: 'anuncie' })
    return t
  }, [parceiros, anfitriao])

  // Gira as telas, mantém a tela acesa e recarrega a cada 6 horas (pega parceiros novos)
  useEffect(() => { if (explorando) return; const id = setInterval(() => setI(x => x + 1), TEMPO); return () => clearInterval(id) }, [explorando])
  useEffect(() => {
    let trava
    const pedir = () => navigator.wakeLock?.request('screen').then(t => { trava = t }).catch(() => {})
    pedir(); document.addEventListener('visibilitychange', pedir)
    const recarga = setTimeout(() => location.reload(), 6 * 3600e3)
    if (!params.get('demo')) registrar('visita', { term: `totem:${local || 'sem-local'}` })
    return () => { trava?.release?.(); document.removeEventListener('visibilitychange', pedir); clearTimeout(recarga) }
  }, [local])
  useEffect(() => { document.title = 'Monte Verde MG · Totem' }, [])

  const tela = telas[i % telas.length]
  const tocar = () => { document.documentElement.requestFullscreen?.().catch(() => {}); setExplorando(true) }

  return (
    <div onClick={explorando ? undefined : tocar} className="fixed inset-0 z-[100] flex cursor-none select-none flex-col overflow-hidden bg-[var(--araucaria)] text-white">
      <div key={i} className="totem-entra flex min-h-0 flex-1 flex-col">
        {tela.tipo === 'portal' && <TelaPortal local={local} anfitriao={anfitriao} />}
        {tela.tipo === 'casa' && <TelaCasa b={anfitriao} local={local} />}
        {tela.tipo === 'parceiro' && <TelaParceiro b={tela.b} local={local} />}
        {tela.tipo === 'concierge' && <TelaConcierge local={local} />}
        {tela.tipo === 'emergencia' && <TelaEmergencia local={local} />}
        {tela.tipo === 'anuncie' && <TelaAnuncie local={local} />}
      </div>
      <Barra total={telas.length} atual={i % telas.length} />
      {!explorando && <p className="pointer-events-none absolute right-4 top-[92px] animate-pulse whitespace-nowrap rounded-full bg-black/45 px-4 py-2 text-[14px] font-semibold">Toque para explorar Monte Verde</p>}
      {explorando && <Explorar businesses={businesses} anfitriao={anfitriao} local={local} onSair={() => setExplorando(false)} />}
      {APP_TOTEM && <button aria-hidden="true" tabIndex={-1} onClick={e => { e.stopPropagation(); cantoSecreto() }} className="absolute left-0 top-0 z-[110] h-20 w-20 opacity-0" />}
    </div>
  )
}

function Marca({ claro = true }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={claro ? 'text-white' : 'text-[var(--araucaria)]'}><Logo tamanho={20} /></span>
    </div>
  )
}

function Foto({ src, children }) {
  return (
    <div className="relative min-h-0 flex-1">
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(23,35,30,0.55)] via-transparent to-[var(--araucaria)]" />
      <div className="relative flex h-full flex-col justify-between p-6">{children}</div>
    </div>
  )
}

function Rodape({ url, chamada, sub }) {
  const qr = useQR(url)
  return (
    <div className="flex items-center gap-4 bg-[var(--nevoa)] p-5 text-[var(--araucaria)]">
      {qr ? <img src={qr} alt="QR code" className="h-[118px] w-[118px] shrink-0 rounded-xl" /> : <div className="h-[118px] w-[118px] shrink-0 rounded-xl bg-[var(--nevoa-2)]" />}
      <div className="min-w-0">
        <p className="serifa text-[24px] font-semibold leading-tight">{chamada}</p>
        <p className="mt-1 text-[15px] leading-snug text-[var(--leve)]">{sub}</p>
      </div>
    </div>
  )
}

function TelaPortal({ local, anfitriao }) {
  return (
    <>
      <Foto src={FOTOS.marDeNuvens.g}>
        <Marca />
        <div>
          {anfitriao && <p className="text-[15px] font-semibold uppercase tracking-[0.12em] text-[var(--broto)]">Bem-vindo ao {anfitriao.name}</p>}
          <p className="serifa mt-2 text-[44px] font-semibold leading-[1.02]">Descubra Monte Verde no seu ritmo.</p>
          <p className="mt-3 text-[17px] text-white/80">Onde comer agora, o que fazer, roteiro pronto e quem está aberto.</p>
        </div>
      </Foto>
      <Rodape url={link('/', local, 'portal')} chamada="Aponte a câmera" sub="Abra o guia no seu celular. Grátis, sem baixar nada." />
    </>
  )
}

function TelaParceiro({ b, local }) {
  const foto = b.images?.[0] || (FOTO_CATEGORIA[b.category] || FOTOS.avenida).g
  return (
    <>
      <Foto src={foto}>
        <div className="flex items-center justify-between">
          <Marca />
          <span className="rounded-full bg-[var(--madeira)] px-3 py-1 text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--araucaria)]">Recomendado</span>
        </div>
        <div>
          <p className="text-[15px] font-semibold uppercase tracking-[0.12em] text-[var(--broto)]">{(b.tags || [])[0] || 'Monte Verde'}</p>
          <p className="serifa mt-1 text-[42px] font-semibold leading-[1.02]">{b.name}</p>
          {b.description && <p className="mt-3 line-clamp-3 text-[17px] leading-snug text-white/85">{b.description}</p>}
        </div>
      </Foto>
      <Rodape url={link(`/estabelecimento/${b.slug}`, local, b.slug)} chamada="Veja como chegar" sub="Horário, fotos, WhatsApp e rota no seu celular." />
    </>
  )
}

function TelaConcierge({ local }) {
  return (
    <>
      <Foto src={FOTOS.porDoSol.g}>
        <Marca />
        <div>
          <p className="text-[15px] font-semibold uppercase tracking-[0.12em] text-[var(--broto)]">Concierge</p>
          <p className="serifa mt-2 text-[42px] font-semibold leading-[1.02]">Seu roteiro pronto em 1 minuto.</p>
          <p className="mt-3 text-[17px] text-white/80">Diga com quem veio e do que gosta. A gente monta o dia com horários reais.</p>
        </div>
      </Foto>
      <Rodape url={link('/concierge', local, 'concierge')} chamada="Monte seu roteiro" sub="Aponte a câmera e converse com o concierge." />
    </>
  )
}

function TelaEmergencia({ local }) {
  return (
    <>
      <div className="flex flex-1 flex-col justify-between p-6">
        <Marca />
        <div>
          <p className="serifa text-[40px] font-semibold leading-[1.05]">Precisou de ajuda?</p>
          <p className="mt-3 text-[17px] text-white/80">Farmácia, mecânico e pronto-socorro abertos agora, com telefone e rota.</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            {[['192', 'SAMU'], ['193', 'Bombeiros'], ['190', 'Polícia']].map(([n, t]) => (
              <div key={n} className="rounded-2xl bg-white/10 py-4"><p className="num text-[30px] font-bold">{n}</p><p className="text-[13px] text-white/70">{t}</p></div>
            ))}
          </div>
        </div>
      </div>
      <Rodape url={link('/sos', local, 'sos')} chamada="Úteis e emergência" sub="Tudo o que você precisa na viagem, no seu celular." />
    </>
  )
}

function TelaAnuncie({ local }) {
  return (
    <>
      <Foto src={FOTOS.avenida.g}>
        <Marca />
        <div>
          <p className="text-[15px] font-semibold uppercase tracking-[0.12em] text-[var(--broto)]">Para quem tem negócio na vila</p>
          <p className="serifa mt-2 text-[40px] font-semibold leading-[1.05]">Seu negócio nesta tela.</p>
          <p className="mt-3 text-[17px] text-white/80">Apareça para quem já está em Monte Verde, na mesa e no celular.</p>
        </div>
      </Foto>
      <Rodape url={link('/anuncie', local, 'anuncie')} chamada="Anuncie no portal" sub="Planos a partir de R$ 49 por mês, sem fidelidade." />
    </>
  )
}

/** Tela da casa: o estabelecimento onde o totem está, com a oferta dele (se houver). */
function TelaCasa({ b, local }) {
  const { porLugar } = useOfertas()
  const oferta = (porLugar.get(b.id) || [])[0]
  const foto = b.images?.[0] || (FOTO_CATEGORIA[b.category] || FOTOS.avenida).g
  return (
    <>
      <Foto src={foto}>
        <Marca />
        <div>
          <p className="text-[15px] font-semibold uppercase tracking-[0.12em] text-[var(--broto)]">Você está no</p>
          <p className="serifa mt-1 text-[44px] font-semibold leading-[1.02]">{b.name}</p>
          {oferta ? (
            <div className="mt-4 rounded-2xl bg-[var(--madeira)] p-4 text-[var(--araucaria)]">
              <p className="text-[13px] font-bold uppercase tracking-[0.1em]">Oferta da casa</p>
              <p className="serifa mt-1 text-[26px] font-semibold leading-tight">{oferta.titulo}</p>
              {oferta.regras && <p className="mt-1 text-[15px]">{oferta.regras}</p>}
            </div>
          ) : b.description && <p className="mt-3 line-clamp-3 text-[17px] leading-snug text-white/85">{b.description}</p>}
          {b.cardapio_url && <p className="mt-4 inline-flex rounded-full bg-white/15 px-4 py-2 text-[16px] font-semibold">Toque na tela e veja o cardápio</p>}
        </div>
      </Foto>
      <Rodape url={link(`/estabelecimento/${b.slug}`, local, 'casa')} chamada="Salve esta casa" sub="Fotos, horário e WhatsApp no seu celular, para voltar." />
    </>
  )
}

const SECOES = [
  { id: 'fazer', nome: 'O que fazer', icone: Mountain, cat: 'turismo' },
  { id: 'comer', nome: 'Comer e beber', icone: Utensils, cat: 'alimentacao' },
  { id: 'trilhas', nome: 'Trilhas', icone: Mountain },
  { id: 'uteis', nome: 'Farmácia e úteis', icone: LifeBuoy, grupos: ['saude', 'transporte', 'servicos'] },
  { id: 'roteiro', nome: 'Roteiro pronto', icone: Sparkles },
]

/** Item com QR: o cliente aponta a câmera e leva para o celular. */
function ItemQR({ titulo, sub, url }) {
  const qr = useQR(url)
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/[0.07] p-3">
      {qr ? <img src={qr} alt="" className="h-[84px] w-[84px] shrink-0 rounded-lg" /> : <div className="h-[84px] w-[84px] shrink-0 rounded-lg bg-white/10" />}
      <div className="min-w-0"><p className="text-[18px] font-semibold leading-tight">{titulo}</p>{sub && <p className="mt-1 line-clamp-2 text-[14px] text-white/70">{sub}</p>}</div>
    </div>
  )
}

/** Modo explorar: o cliente toca no totem e navega pelo guia ali mesmo. Volta ao carrossel sozinho depois de 45 s parado. */
function Explorar({ businesses, anfitriao, local, onSair }) {
  const [secao, setSecao] = useState(null)
  const [cardapio, setCardapio] = useState(false)
  const parado = useRef()
  const mexeu = (ms = 45000) => { clearTimeout(parado.current); parado.current = setTimeout(onSair, typeof ms === 'number' ? ms : 45000) }
  useEffect(() => { mexeu(); return () => clearTimeout(parado.current) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // na mesa de um restaurante, não sugerimos outro lugar para comer
  const secoes = SECOES.filter(x => !(anfitriao && x.cat && x.cat === anfitriao.category))
  const lista = !secao ? [] : secao.cat
    ? businesses.filter(b => b.category === secao.cat && b.slug !== local).sort((a, z) => (z.plan !== 'free') - (a.plan !== 'free') || (z.isOpen === true) - (a.isOpen === true)).slice(0, 6)
    : secao.grupos ? businesses.filter(b => secao.grupos.includes(b.category) && b.isOpen).slice(0, 6) : []
  return (
    <div onClick={mexeu} onTouchStart={mexeu} className="absolute inset-0 z-[105] flex flex-col bg-[var(--araucaria)] p-5 pt-8">
      {cardapio && <Cardapio b={anfitriao} totem onFechar={() => { setCardapio(false); mexeu() }} />}
      <div className="flex items-center justify-between">
        {secao ? <button onClick={() => setSecao(null)} className="flex min-h-12 items-center gap-1 text-[17px] font-semibold"><ChevronLeft size={22} />Voltar</button> : <Marca />}
        <button onClick={onSair} aria-label="Fechar" className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10"><Fechar size={22} /></button>
      </div>
      {!secao ? (
        <>
          <p className="serifa mt-6 text-[34px] font-semibold leading-tight">{anfitriao ? `Enquanto espera no ${anfitriao.name.split(' ')[0]}, conheça a vila` : 'Explore Monte Verde'}</p>
          {anfitriao?.cardapio_url && (
            <button onClick={() => { setCardapio(true); mexeu(180000) }} className="mt-5 flex min-h-[84px] items-center gap-4 rounded-[22px] bg-[var(--madeira)] p-4 text-left text-[var(--araucaria)]">
              <BookOpen size={30} /><span><span className="block text-[21px] font-bold leading-tight">Cardápio do {anfitriao.name.split(' ')[0]}</span><span className="text-[15px]">Veja pratos e preços aqui mesmo</span></span>
            </button>
          )}
          <div className="mt-4 grid flex-1 grid-cols-2 content-start gap-3">
            {secoes.map(x => (
              <button key={x.id} onClick={() => setSecao(x)} className="flex min-h-[120px] flex-col items-start justify-between rounded-[22px] bg-white/[0.08] p-4 text-left">
                <x.icone size={28} className="text-[var(--broto)]" /><span className="text-[19px] font-semibold leading-tight">{x.nome}</span>
              </button>
            ))}
          </div>
          <ItemQR titulo="Leve o guia no celular" sub="Mapa que funciona sem internet, roteiro e quem está aberto agora." url={link('/', local, 'explorar')} />
        </>
      ) : (
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
          <p className="serifa text-[30px] font-semibold">{secao.nome}</p>
          {secao.id === 'trilhas' && TRILHAS.map(t => <ItemQR key={t.slug} titulo={t.nome} sub={`${t.nivel} · ${t.tempo}`} url={link(`/trilhas/${t.slug}`, local, 'trilha')} />)}
          {secao.id === 'roteiro' && <ItemQR titulo="Seu roteiro em 1 minuto" sub="Diga quantos dias fica e do que gosta: o guia monta manhã, tarde e noite." url={link('/roteiro', local, 'roteiro')} />}
          {secao.id === 'roteiro' && <ItemQR titulo="Pergunte ao concierge" sub="Ex.: um passeio tranquilo para amanhã cedo." url={link('/concierge', local, 'concierge')} />}
          {lista.map(b => <ItemQR key={b.id} titulo={b.name} sub={`${b.isOpen === true ? 'Aberto agora · ' : ''}${b.address || ''}`} url={link(`/estabelecimento/${b.slug}`, local, 'explorar')} />)}
          {secao.id === 'uteis' && <div className="grid grid-cols-3 gap-2 text-center">{[['192', 'SAMU'], ['193', 'Bombeiros'], ['190', 'Polícia']].map(([n, t]) => <div key={n} className="rounded-2xl bg-white/10 py-3"><p className="num text-[26px] font-bold">{n}</p><p className="text-[12px] text-white/70">{t}</p></div>)}</div>}
          {(secao.cat || secao.grupos) && !lista.length && <p className="text-[16px] text-white/70">Nada aberto agora nesta seção.</p>}
        </div>
      )}
    </div>
  )
}

function Barra({ total, atual }) {
  return (
    <div className="absolute inset-x-6 top-3 flex gap-1.5">
      {Array.from({ length: total }, (_, k) => (
        <span key={k} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
          <span className={`block h-full bg-white ${k < atual ? 'w-full' : k === atual ? 'totem-progresso' : 'w-0'}`} style={k === atual ? { animationDuration: `${TEMPO}ms` } : undefined} />
        </span>
      ))}
    </div>
  )
}
