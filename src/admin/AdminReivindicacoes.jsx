import { useEffect, useState } from 'react'
import { MessageCircle, Check, X, BadgeCheck, UserCog, History } from 'lucide-react'
import { AdminLayout } from './AdminLayout'
import { supabase } from '../lib/supabase'

const FUNCAO = 'https://isotmggdbtqlyvddxmpe.supabase.co/functions/v1/aprovar-reivindicacao'
const data = d => (d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '')

async function chamar(corpo) {
  const { data: s } = await supabase.auth.getSession()
  const r = await fetch(FUNCAO, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session?.access_token}` }, body: JSON.stringify(corpo) })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.erro || 'falha')
  return d
}

function Pedido({ p, onMudou }) {
  const [acesso, setAcesso] = useState(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [conf, setConf] = useState('')
  let wa = (p.whatsapp || '').replace(/\D/g, ''); if (wa.length === 10 || wa.length === 11) wa = '55' + wa
  const nome = p.businesses?.name || '?'
  const msgPedido = `Olá, ${p.nome_contato.split(' ')[0]}! Aqui é do Monte Verde MG. Recebemos seu pedido de acesso a ${nome}. Para confirmar, responda com o código que apareceu na tela, pelo WhatsApp do negócio.`
  const msgAcesso = acesso ? `Pronto, ${p.nome_contato.split(' ')[0]}! ${nome} já está ligado à sua conta no Monte Verde MG. Entre em monteverdemg.com.br/meu-negocio com o e-mail ${acesso.email}${acesso.convite ? ' (mandamos um convite para você criar a senha)' : ''} e edite horário, fotos e contatos.` : ''

  async function decidir(acao) {
    if (acao === 'aprovar' && conf.trim().length < 3) { setErro('Antes de aprovar, escreva de qual contato você conferiu a prova (ex.: WhatsApp do pedido, telefone do guia, CNPJ).'); return }
    setEnviando(true); setErro('')
    try {
      const d = await chamar({ acao, id: p.id, contato_conferido: conf.trim(), evidencia: '' })
      if (acao === 'aprovar') setAcesso({ email: d.email, convite: d.convite })
      onMudou()
    } catch (e) { setErro(e.message) }
    setEnviando(false)
  }

  return (
    <li className="rounded-2xl bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[16px] font-bold leading-tight">{nome}</p>
          <p className="text-[13px] text-[#626a63]">{p.nome_contato} · {p.whatsapp} · {p.email}{p.user_id ? ' · e-mail confirmado' : ''}</p>
          <p className="text-[12px] text-[#8a918b]">{data(p.criado_em)} · código <b className="num">{p.codigo}</b></p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${p.status === 'verificada' ? 'bg-[#dcefdc] text-[#1d5f31]' : p.status === 'recusada' ? 'bg-[#f2e1dd] text-[#8a3b2e]' : 'bg-[#f3e8cc] text-[#6e5208]'}`}>{p.status}</span>
      </div>
      {p.cnpj && (
        <p className={`mt-2 rounded-xl px-3 py-2 text-[13px] ${p.cnpj_confere ? 'bg-[#dcefdc] text-[#1d5f31]' : p.cnpj_confere === false ? 'bg-[#f2e1dd] text-[#8a3b2e]' : 'bg-[var(--creme)]'}`}>
          CNPJ {p.cnpj}: {p.cnpj_nome || 'sem retorno da Receita'}{p.cnpj_situacao ? ` · ${p.cnpj_situacao}` : ''}{p.cnpj_municipio ? ` · ${p.cnpj_municipio}` : ''}{p.cnpj_confere === true ? ' · nome confere' : p.cnpj_confere === false ? ' · nome NÃO confere' : ''}
        </p>
      )}
      {p.status === 'pendente' && (
        <input value={conf} onChange={e => setConf(e.target.value)} placeholder="Conferi que a prova veio de… (nº do WhatsApp, telefone do guia, CNPJ)" className="mt-3 w-full rounded-xl bg-[var(--creme)] px-3 py-2.5 text-sm" />
      )}
      {p.status === 'pendente' && (
        <div className="mt-2 flex flex-wrap gap-2">
          {wa.length >= 12 && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(msgPedido)}`} target="_blank" rel="noopener noreferrer" className="botao botao-wa h-10 min-h-0 flex-1 text-[14px]"><MessageCircle size={15} />Pedir o código</a>}
          <button disabled={enviando} onClick={() => decidir('aprovar')} className="botao botao-pri h-10 min-h-0 flex-1 text-[14px]"><Check size={15} />Código confere: aprovar</button>
          <button disabled={enviando} onClick={() => decidir('recusar')} className="botao botao-sec h-10 min-h-0 px-3 text-[14px]"><X size={15} />Recusar</button>
        </div>
      )}
      {acesso && (
        <div className="mt-3 rounded-xl bg-[var(--creme)] p-3">
          <p className="text-[13px] font-bold">Aprovado. O dono já vê o negócio na conta dele. Se quiser, avise pelo WhatsApp:</p>
          <textarea readOnly rows={4} value={msgAcesso} className="mt-1 w-full rounded-xl bg-white p-2 text-[12px]" onFocus={e => e.target.select()} />
          {wa.length >= 12 && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(msgAcesso)}`} target="_blank" rel="noopener noreferrer" className="botao botao-wa mt-2 h-10 min-h-0 w-full text-[14px]"><MessageCircle size={15} />Enviar acesso</a>}
        </div>
      )}
      {erro && <p className="mt-2 text-[13px] font-semibold text-[var(--sos)]">{erro}</p>}
    </li>
  )
}

export function AdminReivindicacoes() {
  const [lista, setLista] = useState(null)
  const [cfg, setCfg] = useState('')
  const [salvo, setSalvo] = useState('')
  const carregar = () => supabase.from('reivindicacoes').select('*, businesses(name)').order('criado_em', { ascending: false }).limit(100).then(({ data }) => setLista(data || []))
  useEffect(() => {
    carregar()
    supabase.from('config').select('valor').eq('chave', 'whatsapp_guia').maybeSingle().then(({ data }) => setCfg(data?.valor || ''))
  }, [])
  async function salvarCfg() {
    const { error } = await supabase.from('config').upsert({ chave: 'whatsapp_guia', valor: cfg.replace(/\D/g, ''), atualizado_em: new Date().toISOString() })
    setSalvo(error ? 'Erro ao salvar' : 'Salvo'); setTimeout(() => setSalvo(''), 2000)
  }
  const pendentes = (lista || []).filter(p => p.status === 'pendente')

  return (
    <AdminLayout>
      <section className="rounded-2xl bg-white p-4">
        <h2 className="flex items-center gap-2 font-bold"><BadgeCheck size={18} className="text-[var(--verde)]" />Como funciona a verificação</h2>
        <p className="mt-1 text-[13px] text-[#626a63]">O dono vê um código na tela e manda pelo WhatsApp do negócio para o número abaixo. Se a mensagem veio do número que está no guia (ou do WhatsApp do pedido) e o código bate, aprove: o negócio passa na hora para a conta do dono (ele já confirmou o e-mail e criou a senha). O CNPJ, quando informado, é consultado na Receita e comparado com o nome.</p>
        <label className="mt-3 block text-[13px] font-bold">WhatsApp do guia (com DDD, só números)</label>
        <div className="mt-1 flex gap-2">
          <input value={cfg} onChange={e => setCfg(e.target.value)} inputMode="tel" placeholder="5535999999999" className="min-w-0 flex-1 rounded-xl bg-[var(--creme)] px-3 py-2.5 text-sm" />
          <button onClick={salvarCfg} className="botao botao-pri h-10 min-h-0 px-4 text-[14px]">{salvo || 'Salvar'}</button>
        </div>
        {!cfg && <p className="mt-2 text-[12px] text-[#8a3b2e]">Sem número, o dono só vê o código e você precisa chamá-lo pelo botão "Pedir o código".</p>}
      </section>

      <h2 className="mt-5 text-[18px] font-extrabold">Pedidos {pendentes.length ? <span className="num text-[var(--sos)]">· {pendentes.length} pendentes</span> : null}</h2>
      {lista === null ? <div className="esqueleto mt-3 h-24 rounded-2xl" /> : lista.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-white p-4 text-sm text-[#626a63]">Nenhum pedido ainda. Eles chegam pela área do dono (Meu negócio → Já está no guia).</p>
      ) : (
        <ul className="mt-3 space-y-2">{lista.map(p => <Pedido key={p.id} p={p} onMudou={carregar} />)}</ul>
      )}
      <Donos />
    </AdminLayout>
  )
}

/** Donos atuais: um por lugar. Trocar ou remover fica registrado no histórico, com motivo. */
function Donos() {
  const [donos, setDonos] = useState(null)
  const [hist, setHist] = useState([])
  const [busca, setBusca] = useState('')
  const [lugares, setLugares] = useState([])
  const [edita, setEdita] = useState(null) // { id, name }
  const [email, setEmail] = useState('')
  const [motivo, setMotivo] = useState('')
  const [msg, setMsg] = useState('')
  const carregar = () => {
    supabase.from('business_owners').select('business_id, email, verificado_em, businesses(name)').order('verificado_em', { ascending: false }).then(({ data }) => setDonos(data || []))
    supabase.from('donos_historico').select('*, businesses(name)').order('em', { ascending: false }).limit(30).then(({ data }) => setHist(data || []))
  }
  useEffect(() => { carregar() }, [])
  useEffect(() => {
    const t = busca.trim()
    if (t.length < 2) { setLugares([]); return }
    const id = setTimeout(() => supabase.from('businesses').select('id, name').ilike('name', `%${t}%`).limit(8).then(({ data }) => setLugares(data || [])), 250)
    return () => clearTimeout(id)
  }, [busca])
  async function trocar(e) {
    e.preventDefault(); setMsg('')
    if (!motivo.trim()) { setMsg('Escreva o motivo (fica no histórico).'); return }
    const { error } = await supabase.rpc('admin_trocar_dono', { p_business: edita.id, p_email: email, p_motivo: motivo })
    if (error) { setMsg(error.message); return }
    setEdita(null); setEmail(''); setMotivo(''); setBusca(''); carregar()
  }
  async function remover(d) {
    const m = window.prompt(`Remover o dono de ${d.businesses?.name}? Escreva o motivo:`)
    if (!m) return
    const { error } = await supabase.rpc('admin_remover_dono', { p_business: d.business_id, p_motivo: m })
    if (error) alert(error.message); else carregar()
  }
  const data = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

  return (
    <>
      <h2 className="mt-6 flex items-center gap-2 text-[18px] font-extrabold"><UserCog size={18} className="text-[var(--verde)]" />Donos dos lugares</h2>
      <p className="mt-1 text-[13px] text-[#626a63]">Cada lugar tem um dono por vez. Se outra pessoa pedir um lugar que já tem dono, o pedido não é aprovado direto: confira os dois lados e, se for o caso, troque aqui.</p>

      <section className="mt-3 rounded-2xl bg-white p-4">
        {edita ? (
          <form onSubmit={trocar} className="space-y-2">
            <p className="text-[14px]">Novo dono de <b>{edita.name}</b></p>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail da conta do novo dono" className="w-full rounded-xl bg-[var(--creme)] px-3 py-2.5 text-sm" />
            <input value={motivo} onChange={e => setMotivo(e.target.value)} maxLength={300} placeholder="Motivo (ex.: venda do negócio, disputa resolvida com documento)" className="w-full rounded-xl bg-[var(--creme)] px-3 py-2.5 text-sm" />
            {msg && <p className="text-[13px] font-medium text-[#8a3b2e]">{msg}</p>}
            <div className="flex gap-2">
              <button className="botao botao-pri h-10 min-h-0 flex-1 text-[14px]">Confirmar troca</button>
              <button type="button" onClick={() => { setEdita(null); setMsg('') }} className="botao botao-sec h-10 min-h-0 px-4 text-[14px]">Cancelar</button>
            </div>
            <p className="text-[12px] text-[#626a63]">A pessoa precisa já ter criado a conta em Meu negócio. O dono anterior perde o acesso na hora.</p>
          </form>
        ) : (
          <>
            <label className="block text-[13px] font-bold">Definir ou trocar o dono de um lugar</label>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar lugar pelo nome" className="mt-1 w-full rounded-xl bg-[var(--creme)] px-3 py-2.5 text-sm" />
            {lugares.length > 0 && (
              <ul className="mt-2 divide-y divide-[#eee]">
                {lugares.map(l => <li key={l.id}><button onClick={() => setEdita(l)} className="w-full py-2 text-left text-[14px]">{l.name}</button></li>)}
              </ul>
            )}
          </>
        )}
      </section>

      {donos === null ? <div className="esqueleto mt-3 h-16 rounded-2xl" /> : donos.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-white p-4 text-sm text-[#626a63]">Nenhum lugar com dono ainda.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {donos.map(d => (
            <li key={d.business_id} className="flex items-center gap-3 rounded-2xl bg-white p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold">{d.businesses?.name}</p>
                <p className="truncate text-[12px] text-[#626a63]">{d.email} · desde {data(d.verificado_em)}</p>
              </div>
              <button onClick={() => setEdita({ id: d.business_id, name: d.businesses?.name })} className="botao botao-sec h-9 min-h-0 px-3 text-[13px]">Trocar</button>
              <button onClick={() => remover(d)} className="h-9 px-2 text-[13px] font-semibold text-[#8a3b2e]">Remover</button>
            </li>
          ))}
        </ul>
      )}

      {hist.length > 0 && (
        <section className="mt-4 rounded-2xl bg-white p-4">
          <h3 className="flex items-center gap-2 text-[14px] font-bold"><History size={16} />Histórico</h3>
          <ul className="mt-2 space-y-1.5 text-[12px]">
            {hist.map(h => (
              <li key={h.id}>
                <span className="num text-[#626a63]">{data(h.em)}</span> · <b>{h.businesses?.name}</b> · {h.acao === 'definido' ? 'dono definido' : 'dono removido'}: {h.email || '—'} <span className="text-[#626a63]">({h.metodo}{h.motivo ? ` · ${h.motivo}` : ''})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
