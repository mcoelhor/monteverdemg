import { Logo } from '../components/UI/Logo'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { APP_TOTEM, localSalvo } from '../lib/totemApp'
import QRCode from 'qrcode'
import { useBusinesses } from '../hooks/useBusinesses'
import { FOTOS, FOTO_CATEGORIA } from '../data/fotos'
import { registrar } from '../lib/track'

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

  const anfitriao = businesses.find(b => b.slug === local)
  const parceiros = useMemo(() => businesses
    .filter(b => (b.featured || (b.plan && b.plan !== 'free')) && !/teste/.test(b.slug) && b.slug !== local)
    // no totem de um lugar, nunca aparece concorrente da mesma categoria (ex.: outro restaurante na mesa do restaurante)
    .filter(b => !anfitriao || b.category !== anfitriao.category)
    .sort((a, z) => (z.plan === 'premium') - (a.plan === 'premium')), [businesses, local, anfitriao])

  const telas = useMemo(() => {
    const t = [{ tipo: 'portal' }]
    parceiros.slice(0, 6).forEach((b, k) => { t.push({ tipo: 'parceiro', b }); if (k === 1) t.push({ tipo: 'concierge' }) })
    if (parceiros.length < 2) t.push({ tipo: 'concierge' })
    t.push({ tipo: 'emergencia' }, { tipo: 'anuncie' })
    return t
  }, [parceiros])

  // Gira as telas, mantém a tela acesa e recarrega a cada 6 horas (pega parceiros novos)
  useEffect(() => { const id = setInterval(() => setI(x => x + 1), TEMPO); return () => clearInterval(id) }, [])
  useEffect(() => {
    let trava
    const pedir = () => navigator.wakeLock?.request('screen').then(t => { trava = t }).catch(() => {})
    pedir(); document.addEventListener('visibilitychange', pedir)
    const recarga = setTimeout(() => location.reload(), 6 * 3600e3)
    registrar('visita', { term: `totem:${local || 'sem-local'}` })
    return () => { trava?.release?.(); document.removeEventListener('visibilitychange', pedir); clearTimeout(recarga) }
  }, [local])
  useEffect(() => { document.title = 'Monte Verde MG · Totem' }, [])

  const tela = telas[i % telas.length]
  const telaCheia = () => document.documentElement.requestFullscreen?.().catch(() => {})

  return (
    <div onClick={telaCheia} className="fixed inset-0 z-[100] flex cursor-none select-none flex-col overflow-hidden bg-[var(--araucaria)] text-white">
      <div key={i} className="totem-entra flex min-h-0 flex-1 flex-col">
        {tela.tipo === 'portal' && <TelaPortal local={local} anfitriao={anfitriao} />}
        {tela.tipo === 'parceiro' && <TelaParceiro b={tela.b} local={local} />}
        {tela.tipo === 'concierge' && <TelaConcierge local={local} />}
        {tela.tipo === 'emergencia' && <TelaEmergencia local={local} />}
        {tela.tipo === 'anuncie' && <TelaAnuncie local={local} />}
      </div>
      <Barra total={telas.length} atual={i % telas.length} />
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
