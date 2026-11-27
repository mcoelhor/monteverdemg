import { useEffect, useState } from 'react'
import { Sparkles, ShieldCheck } from 'lucide-react'
import { AdminLayout } from './AdminLayout'
import { supabase } from '../lib/supabase'

const CHAVES = [
  ['concierge_teto_diario', 'Teto diário de conversas do concierge', 'Ao atingir, o turista vê "Estamos sendo muito consultados, aguarde" e o formulário de roteiro continua funcionando.'],
  ['concierge_limite_10min', 'Mensagens por visitante a cada 10 minutos', 'Protege contra uso abusivo por uma só pessoa ou robô.'],
]

/** Configurações: limites do concierge, uso dos últimos dias e verificação em duas etapas. */
export function AdminConfig() {
  const [vals, setVals] = useState({})
  const [uso, setUso] = useState(null)
  const [salvo, setSalvo] = useState('')
  useEffect(() => {
    supabase.from('config').select('chave, valor').in('chave', CHAVES.map(c => c[0])).then(({ data }) => setVals(Object.fromEntries((data || []).map(x => [x.chave, x.valor]))))
    supabase.rpc('admin_concierge_uso').then(({ data }) => setUso(data || []))
  }, [])
  async function salvar() {
    const linhas = CHAVES.map(([k]) => ({ chave: k, valor: String(Math.max(1, Math.round(Number(vals[k]) || 1))), atualizado_em: new Date().toISOString() }))
    const { error } = await supabase.from('config').upsert(linhas)
    setSalvo(error ? 'Erro ao salvar' : 'Salvo. Vale em até 1 minuto.'); setTimeout(() => setSalvo(''), 3000)
  }
  const teto = Number(vals.concierge_teto_diario) || 0
  const hoje = uso?.[0]?.conversas || 0

  return (
    <AdminLayout>
      <section className="rounded-2xl bg-white p-4">
        <h2 className="flex items-center gap-2 font-bold"><Sparkles size={18} className="text-[var(--verde)]" />Concierge</h2>
        {uso && (
          <p className="mt-1 text-[14px]">Hoje: <b className="num">{hoje}</b> de <b className="num">{teto || '—'}</b> conversas{teto ? ` (${Math.round(hoje / teto * 100)}%)` : ''}</p>
        )}
        <div className="mt-3 space-y-3">
          {CHAVES.map(([k, rot, ajuda]) => (
            <label key={k} className="block">
              <span className="block text-[13px] font-bold">{rot}</span>
              <input type="number" min="1" inputMode="numeric" value={vals[k] ?? ''} onChange={e => setVals(v => ({ ...v, [k]: e.target.value }))} className="mt-1 w-full rounded-xl bg-[var(--creme)] px-3 py-2.5 text-sm" />
              <span className="mt-1 block text-[12px] text-[#626a63]">{ajuda}</span>
            </label>
          ))}
        </div>
        <button onClick={salvar} className="botao botao-pri mt-3 h-10 min-h-0 w-full text-[14px]">{salvo || 'Salvar limites'}</button>
        {uso?.length > 0 && (
          <ul className="mt-4 space-y-1 text-[13px]">
            {uso.map(d => (
              <li key={d.dia} className="flex items-center gap-2">
                <span className="num w-20 shrink-0 text-[#626a63]">{new Date(d.dia + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
                <span className="h-2 rounded-full bg-[var(--verde)]" style={{ width: `${Math.min(100, teto ? d.conversas / teto * 100 : 0)}%`, minWidth: 4 }} />
                <span className="num shrink-0">{d.conversas}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <DuasEtapas />
    </AdminLayout>
  )
}

/** Ativa o app autenticador (Google Authenticator, Authy etc.) para a conta do administrador. */
function DuasEtapas() {
  const [ativo, setAtivo] = useState(null)
  const [novo, setNovo] = useState(null) // { id, qr, secret }
  const [codigo, setCodigo] = useState('')
  const [msg, setMsg] = useState('')
  const carregar = () => supabase.auth.mfa.listFactors().then(({ data }) => setAtivo(!!data?.totp?.some(f => f.status === 'verified')))
  useEffect(() => { carregar() }, [])
  async function comecar() {
    setMsg('')
    const { data: lista } = await supabase.auth.mfa.listFactors()
    for (const f of lista?.all || []) if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id })
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Monte Verde MG admin' })
    if (error) { setMsg(error.message); return }
    setNovo({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
  }
  async function confirmar(e) {
    e.preventDefault(); setMsg('')
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: novo.id, code: codigo.replace(/\D/g, '') })
    if (error) { setMsg('Código incorreto. Use o que está aparecendo agora no app.'); return }
    setNovo(null); setCodigo(''); carregar()
  }
  return (
    <section className="mt-4 rounded-2xl bg-white p-4">
      <h2 className="flex items-center gap-2 font-bold"><ShieldCheck size={18} className="text-[var(--verde)]" />Verificação em duas etapas</h2>
      {ativo ? (
        <p className="mt-1 text-[14px] text-[#1f6b2a]">Ativada. Ao entrar no painel, além da senha, será pedido o código do app autenticador.</p>
      ) : novo ? (
        <form onSubmit={confirmar} className="mt-2">
          <p className="text-[13px] text-[#626a63]">1. Abra o Google Authenticator (ou Authy) e escaneie o código abaixo.</p>
          <img src={novo.qr} alt="QR code para o app autenticador" className="mx-auto mt-2 h-44 w-44" />
          <p className="mt-1 break-all text-center text-[12px] text-[#626a63]">Ou digite a chave: <span className="num">{novo.secret}</span></p>
          <p className="mt-3 text-[13px] text-[#626a63]">2. Digite o código de 6 dígitos que aparecer no app.</p>
          <input value={codigo} onChange={e => setCodigo(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" className="mt-1 w-full rounded-xl bg-[var(--creme)] px-3 py-2.5 text-center text-[18px] tracking-[0.4em]" />
          <button className="botao botao-pri mt-3 h-10 min-h-0 w-full text-[14px]">Ativar</button>
        </form>
      ) : (
        <>
          <p className="mt-1 text-[13px] text-[#626a63]">Protege o painel mesmo se alguém descobrir sua senha. Você vai precisar do celular com o app autenticador para entrar.</p>
          <button onClick={comecar} className="botao botao-pri mt-3 h-10 min-h-0 w-full text-[14px]">Ativar agora</button>
        </>
      )}
      {msg && <p className="mt-2 text-[13px] font-medium text-[#8a3b2e]">{msg}</p>}
    </section>
  )
}
