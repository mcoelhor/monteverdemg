import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, Loader2, MapPin, RotateCcw, Sparkles, Route as RouteIcon } from 'lucide-react'
import { Layout } from '../components/Layout/Layout'
import { useBusinesses } from '../hooks/useBusinesses'
import { registrar } from '../lib/track'
import { SLOTS } from '../lib/roteiro'

const FUNCAO = 'https://isotmggdbtqlyvddxmpe.supabase.co/functions/v1/concierge'
const CHAVE = 'mv_concierge_v1'
const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || [] } catch { return [] } }
const gravar = v => { try { localStorage.setItem(CHAVE, JSON.stringify(v.slice(-20))) } catch { /* sem armazenamento */ } }

const INICIAIS = [
  'Fim de semana a dois, sem pressa',
  'Vou com crianças pequenas: o que fazer?',
  'Está chovendo. Onde ir agora?',
  'Onde jantar hoje com lareira?',
]

function visitante() {
  try {
    let v = localStorage.getItem('mv_conc_id')
    if (!v) { v = crypto.getRandomValues(new Uint32Array(2)).join('').slice(0, 16); localStorage.setItem('mv_conc_id', v) }
    return v
  } catch { return 'anon' }
}

/** Conversa com o concierge: o turista pergunta, a IA responde só com lugares do guia. */
export function Concierge() {
  const [msgs, setMsgs] = useState(ler)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const fim = useRef(null)
  const { businesses } = useBusinesses({})
  const porSlug = useMemo(() => new Map(businesses.map(b => [b.slug, b])), [businesses])

  useEffect(() => { gravar(msgs); fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs])

  async function enviar(pergunta) {
    const q = (pergunta ?? texto).trim()
    if (!q || enviando) return
    setTexto(''); setErro('')
    const nova = [...msgs, { role: 'user', text: q }]
    setMsgs(nova); setEnviando(true)
    registrar('busca', { term: `concierge:${q.slice(0, 100)}` })
    try {
      const r = await fetch(FUNCAO, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitante: visitante(), mensagens: nova.map(m => ({ role: m.role, text: m.text })) }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.erro || 'O concierge não respondeu agora.')
      setMsgs([...nova, { role: 'assistant', text: d.texto || '', dias: d.dias || [], sugestoes: d.sugestoes || [], indisponivel: !!d.indisponivel }])
    } catch (e) {
      setErro(e.message || 'Sem conexão. Tente de novo.')
      setMsgs(nova)
    } finally { setEnviando(false) }
  }

  const ultima = msgs[msgs.length - 1]
  const sugestoes = ultima?.role === 'assistant' && ultima.sugestoes?.length ? ultima.sugestoes : msgs.length ? [] : INICIAIS

  return (
    <Layout hideHeader titulo="Concierge" semRodape>
      <section className="bg-[var(--araucaria)] px-5 pb-6 text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 22px)' }}>
        <p className="flex items-center gap-1.5 text-[14px] font-semibold uppercase tracking-[0.12em] text-[var(--madeira)]"><Sparkles size={15} />Concierge</p>
        <h1 className="titulo mt-2">Monte Verde no seu ritmo</h1>
        <p className="mt-2 text-[16px] leading-relaxed text-white/75">Conte quem vem, quantos dias e do que gosta. Eu monto o roteiro só com lugares do guia, respeitando o horário de cada um.</p>
        {msgs.length > 0 && (
          <button onClick={() => { setMsgs([]); setErro('') }} className="botao mt-4 h-10 min-h-0 bg-white/10 px-4 text-[14px] text-white"><RotateCcw size={15} />Nova conversa</button>
        )}
      </section>

      <div className="space-y-4 px-5 pb-40 pt-5" aria-live="polite">
        {msgs.map((m, i) => m.role === 'user'
          ? <p key={i} className="ml-auto w-fit max-w-[85%] rounded-[20px] rounded-br-md bg-[var(--musgo)] px-4 py-3 text-[16px] leading-relaxed text-white">{m.text}</p>
          : <Resposta key={i} m={m} porSlug={porSlug} />
        )}
        {enviando && <p className="flex items-center gap-2 text-[15px] text-[var(--leve)]"><Loader2 size={16} className="animate-spin" />Montando a sugestão…</p>}
        {erro && <p role="alert" className="rounded-2xl bg-[var(--sos-fundo)] px-4 py-3 text-[15px] text-[var(--sos)]">{erro}</p>}
        <div ref={fim} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] bg-gradient-to-t from-[var(--nevoa)] via-[var(--nevoa)] to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-6 lg:max-w-[760px]">
        {sugestoes.length > 0 && !enviando && (
          <div className="mb-2 flex gap-2 overflow-x-auto scrollbar-hide">
            {sugestoes.map(s => <button key={s} onClick={() => enviar(s)} className="chip h-10 shrink-0 whitespace-nowrap px-4 text-[14px]">{s}</button>)}
          </div>
        )}
        <form onSubmit={e => { e.preventDefault(); enviar() }} className="flex items-end gap-2 rounded-[26px] bg-[var(--papel)] p-1.5 pl-4 shadow-[0_6px_24px_rgba(23,35,30,0.12)]">
          <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={1} maxLength={600}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
            placeholder="Ex.: 2 dias, casal, gostamos de trilha" aria-label="Sua pergunta ao concierge"
            className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[16px] outline-none" />
          <button type="submit" disabled={!texto.trim() || enviando} aria-label="Enviar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--musgo)] text-white disabled:opacity-40">
            {enviando ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={19} />}
          </button>
        </form>
      </div>
    </Layout>
  )
}

function Resposta({ m, porSlug }) {
  return (
    <div className="max-w-[94%]">
      <p className="whitespace-pre-line rounded-[20px] rounded-bl-md bg-[var(--papel)] px-4 py-3 text-[16px] leading-relaxed">{m.text}</p>
      {m.indisponivel && (
        <Link to="/roteiro" className="botao botao-pri mt-3 h-12 min-h-0 px-5 text-[15px]"><RouteIcon size={17} />Montar roteiro agora</Link>
      )}
      {m.dias?.map((d, k) => (
        <div key={k} className="mt-3 rounded-[var(--raio)] bg-[var(--papel)] p-4">
          {d.titulo && <h3 className="text-[20px] leading-tight">{d.titulo}</h3>}
          <ol className="mt-2 space-y-3">
            {d.paradas.map((p, i) => {
              const b = p.slug ? porSlug.get(p.slug) : null
              const rotulo = SLOTS[p.periodo]?.rotulo || ''
              const corpo = (
                <>
                  <span className="block text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--madeira)]">{rotulo}</span>
                  <span className="block text-[17px] font-semibold leading-snug">{b?.name || p.nome}</span>
                  {p.porque && <span className="block text-[14px] leading-snug text-[var(--leve)]">{p.porque}</span>}
                </>
              )
              return (
                <li key={i}>
                  {b
                    ? <Link to={`/estabelecimento/${b.slug}`} className="pressiona flex items-start gap-3"><MapPin size={18} className="mt-5 shrink-0 text-[var(--musgo)]" /><span>{corpo}</span></Link>
                    : <div className="flex items-start gap-3"><span className="mt-5 h-[18px] w-[18px] shrink-0" /><span>{corpo}</span></div>}
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </div>
  )
}
