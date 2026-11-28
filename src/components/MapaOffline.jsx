import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Check, Trash2, WifiOff, X, RefreshCw } from 'lucide-react'
import { manifesto, baixar, remover, suportado, mb, sincronizar } from '../lib/mapaOffline'
import { usePacotes, useOnline } from './MapaBase'

/** Lista dos pacotes: baixar, ver se está em dia, remover. */
export function PacotesMapa() {
  const pacotes = usePacotes()
  const online = useOnline()
  const [m, setM] = useState(null)
  const [erro, setErro] = useState('')
  const [prog, setProg] = useState({})

  useEffect(() => {
    if (!online) return
    manifesto().then(setM).catch(e => setErro(e.message))
  }, [online])

  if (!suportado()) return <p className="text-sm text-[var(--leve)]">Este navegador não consegue guardar o mapa. Use o Chrome (Android) ou o Safari (iPhone) atualizados.</p>

  const lista = m?.pacotes?.length ? [...m.pacotes].sort((a, b) => a.bytes - b.bytes)
    : Object.entries(pacotes).map(([id, p]) => ({ id, ...p }))

  const pegar = async item => {
    setErro(''); setProg(p => ({ ...p, [item.id]: 0 }))
    try { await baixar(item, f => setProg(p => ({ ...p, [item.id]: f }))) }
    catch (e) { setErro(e.message) }
    finally { setProg(p => { const n = { ...p }; delete n[item.id]; return n }) }
  }

  return (
    <div className="space-y-2.5">
      {lista.map(item => {
        const tem = pacotes[item.id]
        const emDia = tem && (!m || tem.versao === item.versao)
        const baixando = prog[item.id] != null
        return (
          <div key={item.id} className="rounded-[14px] border border-[var(--borda)] bg-white p-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-tight">{item.nome}</p>
                <p className="mt-0.5 text-xs text-[var(--leve)]">
                  {mb(item.bytes)}
                  {tem ? ` · salvo em ${new Date(tem.baixado_em).toLocaleDateString('pt-BR')}` : ''}
                  {tem && !emDia ? ' · versão nova disponível' : ''}
                </p>
              </div>
              {baixando ? (
                <span className="text-sm font-semibold tabular-nums text-[var(--musgo)]">{Math.round(prog[item.id] * 100)}%</span>
              ) : tem && emDia ? (
                <>
                  <span className="flex items-center gap-1 text-sm font-semibold text-[var(--musgo)]"><Check size={16} />Salvo</span>
                  <button onClick={() => remover(item.id)} aria-label={`Remover ${item.nome}`} className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--leve)] hover:bg-[var(--nevoa-2)]"><Trash2 size={17} /></button>
                </>
              ) : (
                <button disabled={!online || !m} onClick={() => pegar(item)} className="botao botao-pri flex min-h-11 items-center gap-1.5 px-4 text-sm disabled:opacity-50">
                  {tem ? <RefreshCw size={16} /> : <Download size={16} />}{tem ? 'Atualizar' : 'Baixar'}
                </button>
              )}
            </div>
            {baixando && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--nevoa-2)]"><div className="h-full bg-[var(--musgo)] transition-all" style={{ width: `${prog[item.id] * 100}%` }} /></div>}
          </div>
        )
      })}
      {!online && !lista.length && <p className="text-sm text-[var(--leve)]">Conecte-se à internet para baixar o mapa.</p>}
      {erro && <p className="text-sm text-red-700">{erro}</p>}
      <p className="text-xs leading-relaxed text-[var(--leve)]">
        Ruas, estradas e os lugares do guia aparecem sem internet. Com conexão, o mapa se atualiza sozinho.
        Dados © OpenStreetMap (ODbL). Rotas continuam pelo app de navegação.
      </p>
      {Object.keys(pacotes).length > 0 && online && (
        <button onClick={() => sincronizar({ forcar: true })} className="text-xs font-semibold text-[var(--musgo)] underline">Procurar atualização agora</button>
      )}
    </div>
  )
}

/** Botão flutuante na tela do mapa + painel. Avisa quando está sem internet e sem mapa salvo. */
export function BotaoMapaOffline({ className = '' }) {
  const [aberto, setAberto] = useState(false)
  const pacotes = usePacotes()
  const online = useOnline()
  const salvo = Object.keys(pacotes).length > 0
  return (
    <>
      <button onClick={() => setAberto(true)} className={`flex min-h-10 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-semibold shadow-md ${className}`}>
        {salvo ? <Check size={15} className="text-[var(--musgo)]" /> : online ? <Download size={15} /> : <WifiOff size={15} className="text-[var(--madeira)]" />}
        {salvo ? 'Mapa offline' : online ? 'Baixar mapa offline' : 'Sem internet'}
      </button>
      {!online && !salvo && (
        <p className="absolute left-4 right-16 top-28 z-[999] rounded-xl bg-white/95 px-3 py-2 text-xs shadow">
          Sem internet e sem mapa salvo: as ruas não aparecem. Da próxima vez, toque em "Baixar mapa offline" com conexão.
        </p>
      )}
      {aberto && createPortal(
        <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setAberto(false)}>
          <div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-[22px] bg-[var(--nevoa)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-[22px]" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="serifa text-[20px] font-semibold">Mapa sem internet</h2>
              <button onClick={() => setAberto(false)} aria-label="Fechar" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[var(--nevoa-2)]"><X size={18} /></button>
            </div>
            <PacotesMapa />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

/** Cartão do roteiro: recomenda baixar o mapa antes de subir a serra (o sinal falha). */
export function CartaoMapaOffline() {
  const [aberto, setAberto] = useState(false)
  const pacotes = usePacotes()
  if (!suportado()) return null
  const salvo = Object.keys(pacotes).length > 0
  return (
    <>
      {salvo ? (
        <button onClick={() => setAberto(true)} className="mx-5 mt-3 flex w-[calc(100%-2.5rem)] items-center gap-3 rounded-[var(--raio)] bg-[var(--papel)] p-4 text-left">
          <Check size={20} className="shrink-0 text-[var(--musgo)]" />
          <span className="text-[15px] leading-snug"><b>Mapa de Monte Verde salvo.</b> Ruas e lugares aparecem mesmo sem sinal.</span>
        </button>
      ) : (
        <div className="mx-5 mt-3 rounded-[var(--raio)] bg-[var(--papel)] p-4">
          <div className="flex items-start gap-3">
            <WifiOff size={20} className="mt-0.5 shrink-0 text-[var(--musgo)]" />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-bold leading-tight">Baixe o mapa de Monte Verde</p>
              <p className="mt-1 text-[14px] leading-snug text-[var(--leve)]">Recomendado: na serra o sinal costuma falhar. Com o mapa salvo, ruas e lugares do guia aparecem mesmo sem internet.</p>
            </div>
          </div>
          <button onClick={() => setAberto(true)} className="botao botao-pri mt-3 h-11 min-h-0 w-full text-[15px]"><Download size={16} />Baixar mapa</button>
        </div>
      )}
      {aberto && createPortal(
        <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setAberto(false)}>
          <div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-[22px] bg-[var(--nevoa)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-[22px]" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="serifa text-[20px] font-semibold">Mapa sem internet</h2>
              <button onClick={() => setAberto(false)} aria-label="Fechar" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[var(--nevoa-2)]"><X size={18} /></button>
            </div>
            <PacotesMapa />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
