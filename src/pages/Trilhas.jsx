import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Clock, Mountain, Footprints, Gauge, Ticket, Navigation, AlertTriangle } from 'lucide-react'
import { Layout } from '../components/Layout/Layout'
import { TRILHAS, trilha } from '../data/trilhas'
import { FOTOS } from '../data/fotos'
import { NaoEncontrada } from './NaoEncontrada'

const AVISO = 'Condições de trilha mudam com o tempo e a chuva. Avise alguém do seu roteiro e não saia da trilha.'
const MOVE_MAPA = 'https://www.google.com/maps/search/?api=1&query=MOVE+Visite+Monte+Verde+Av.+Monte+Verde+70'

/** Aviso principal: acesso às trilhas é pago e passa pela MOVE. */
function AvisoMove() {
  return (
    <div className="rounded-[var(--raio)] border-2 border-[var(--madeira)] bg-[#f6efe6] p-4">
      <p className="flex items-center gap-2 text-[16px] font-bold text-[#6b4f3a]"><Ticket size={19} />Antes de ir: fale com a MOVE</p>
      <p className="mt-1.5 text-[15px] leading-relaxed">As trilhas da serra são administradas pela <b>MOVE</b> (Agência de Desenvolvimento de Monte Verde). O acesso é <b>pago</b> e precisa ser <b>agendado</b>. Confirme preço, horário e se a trilha está aberta antes de sair.</p>
      <a href={MOVE_MAPA} target="_blank" rel="noopener noreferrer" className="botao botao-sec mt-3 inline-flex h-10 min-h-0 items-center gap-2 px-4 text-[14px]"><Navigation size={16} />Onde fica a MOVE</a>
    </div>
  )
}

function Ficha({ t }) {
  const itens = [[Gauge, 'Nível', t.nivel], [Footprints, 'Distância', t.distancia], [Clock, 'Tempo', t.tempo], [Mountain, 'Altitude', t.altitude]]
  return (
    <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {itens.map(([Ic, rot, val]) => (
        <div key={rot} className="rounded-[14px] border border-[var(--borda)] bg-[var(--papel)] p-3">
          <dt className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--leve)]"><Ic size={14} className="text-[var(--salvia)]" />{rot}</dt>
          <dd className="mt-1 text-[15px] font-semibold">{val}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Lista de trilhas. */
export function Trilhas() {
  return (
    <Layout title="Trilhas" subtitle="Caminhadas na Serra da Mantiqueira" showBack>
      <div className="px-5 lg:mx-auto lg:max-w-[1180px] lg:px-8">
        <AvisoMove />
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {TRILHAS.map((t, k) => (
            <li key={t.slug} className="entra" style={{ '--i': k }}>
              <Link to={`/trilhas/${t.slug}`} className="pressiona flex h-full flex-col rounded-[var(--raio)] border border-[var(--borda)] bg-[var(--papel)] p-5 transition-colors hover:bg-[var(--nevoa)]">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="serifa text-[22px] font-semibold leading-tight">{t.nome}</h2>
                  <span className="shrink-0 rounded-full bg-[var(--nevoa-2)] px-2.5 py-1 text-[12px] font-semibold">{t.nivel}</span>
                </div>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[var(--leve)]">{t.resumo}</p>
                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold">
                  <span className="inline-flex items-center gap-1"><Clock size={14} className="text-[var(--salvia)]" />{t.tempo}</span>
                  <span className="inline-flex items-center gap-1"><Mountain size={14} className="text-[var(--salvia)]" />{t.altitude}</span>
                  <span className="text-[var(--madeira)]">Acesso pela MOVE</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[13px] leading-relaxed text-[var(--leve)]">Altitudes e distâncias são aproximadas e variam entre as fontes. Conhece uma trilha que falta aqui ou viu algo desatualizado? <Link to="/mais#corrigir" className="font-semibold underline underline-offset-4">Avise a gente</Link>.</p>
      </div>
    </Layout>
  )
}

/** Página de uma trilha. */
export function TrilhaDetalhe() {
  const { slug } = useParams()
  const t = trilha(slug)
  if (!t) return <NaoEncontrada />
  const rota = `https://www.google.com/maps/dir/?api=1&destination=${t.inicio.lat},${t.inicio.lng}`
  return (
    <Layout title={t.nome} subtitle={`Trilha · ${t.nivel}`} showBack>
      <div className="px-5 lg:mx-auto lg:grid lg:max-w-[1180px] lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:px-8">
        <div>
          <AvisoMove />
          <div className="mt-4"><Ficha t={t} /></div>
          <div className="mt-5 space-y-3 text-[16px] leading-relaxed">{t.texto.map((p, i) => <p key={i}>{p}</p>)}</div>
          <h2 className="serifa mt-6 text-[20px] font-semibold">Dicas</h2>
          <ul className="mt-2 space-y-1.5 text-[15px]">{t.dicas.map(d => <li key={d} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--salvia)]" />{d}</li>)}</ul>
          <p className="mt-5 flex gap-2 rounded-[14px] bg-[var(--nevoa-2)] p-3.5 text-[14px] leading-relaxed"><AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--madeira)]" />{AVISO}</p>
        </div>
        <div className="mt-6 lg:mt-0">
          <MapaTrilha t={t} />
          <a href={rota} target="_blank" rel="noopener noreferrer" className="botao botao-pri mt-3 flex w-full items-center justify-center gap-2"><Navigation size={18} />Como chegar ao início</a>
          {t.wikiloc && (
            <div className="mt-5">
              <h2 className="serifa text-[20px] font-semibold">Traçado no Wikiloc</h2>
              <iframe title={`Traçado da trilha ${t.nome} no Wikiloc`} src={t.wikiloc} className="mt-2 h-[420px] w-full rounded-[var(--raio)] border border-[var(--borda)]" loading="lazy" />
            </div>
          )}
          <Link to="/busca?q=passeio" className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-bold text-[var(--musgo)]">Prefere ir com guia? Veja passeios <ArrowRight size={16} /></Link>
        </div>
      </div>
    </Layout>
  )
}

function MapaTrilha({ t }) {
  const [m, setM] = useState(null)
  useEffect(() => {
    Promise.all([import('leaflet'), import('react-leaflet'), import('leaflet/dist/leaflet.css')]).then(([l, rl]) => setM({ L: l.default, ...rl }))
  }, [])
  const pontos = [t.inicio, t.cume].filter(Boolean)
  if (!m) return <div className="esqueleto h-[300px] rounded-[var(--raio)]" />
  const { L, MapContainer, TileLayer, Marker, Tooltip } = m
  const pino = (txt, cor) => L.divIcon({ html: `<div style="display:inline-block;transform:translate(-50%,-100%);background:${cor};padding:5px 11px;border-radius:999px;font:600 12px Inter,sans-serif;color:#fff;white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,.25);border:2px solid #fff">${txt}</div>`, className: '', iconSize: [0, 0], iconAnchor: [0, 0] })
  const bounds = pontos.length > 1 ? L.latLngBounds(pontos.map(p => [p.lat, p.lng])).pad(0.4) : null
  return (
    <div className="h-[300px] overflow-hidden rounded-[var(--raio)] border border-[var(--borda)] lg:h-[380px]">
      <MapContainer {...(bounds ? { bounds } : { center: [pontos[0].lat, pontos[0].lng], zoom: 15 })} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        <Marker position={[t.inicio.lat, t.inicio.lng]} icon={pino('Início', '#587660')}><Tooltip>{t.inicio.nome}</Tooltip></Marker>
        {t.cume && <Marker position={[t.cume.lat, t.cume.lng]} icon={pino('Cume', '#B08D6B')}><Tooltip>{t.cume.nome}</Tooltip></Marker>}
      </MapContainer>
    </div>
  )
}
