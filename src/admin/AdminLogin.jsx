import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { sair } from './useAdmin'
import { BotaoGoogle } from '../pages/MeuNegocio'

export function AdminLogin({ user }) {
  const [modo, setModo] = useState('entrar') // entrar | criar
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setMsg(''); setOk(''); setEnviando(true)
    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
      if (error) setMsg(error.message.includes('confirm') ? 'Confirme o e-mail antes de entrar (veja a caixa de entrada).' : 'E-mail ou senha incorretos.')
    } else {
      if (senha.length < 8) { setMsg('Use uma senha com pelo menos 8 caracteres.'); setEnviando(false); return }
      const { error } = await supabase.auth.signUp({ email: email.trim(), password: senha, options: { emailRedirectTo: `${location.origin}/bastidores-mv` } })
      if (error) setMsg(error.message)
      else setOk('Conta criada. Abra o e-mail de confirmação e depois entre aqui.')
    }
    setEnviando(false)
  }

  const campo = 'w-full rounded-xl bg-[#f4f1eb] px-3.5 py-3 text-[15px] focus:bg-white focus:shadow-[inset_0_0_0_1.5px_var(--verde)]'
  return (
    <div className="flex min-h-dvh items-center justify-center p-5">
      <div className="entra w-full max-w-sm rounded-3xl bg-white p-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--verde)] text-white"><Lock size={22} /></span>
        <h1 className="mt-4 text-xl font-bold">Área do administrador</h1>
        {user && <CodigoDuasEtapas />}
        {user ? (
          <>
            <p className="mt-2 text-sm text-[#626a63]">Você entrou como <b>{user.email}</b>, mas essa conta não tem acesso ao painel.</p>
            <button onClick={sair} className="botao botao-sec mt-4 w-full">Sair e usar outra conta</button>
          </>
        ) : (
          <>
          <div className="mt-4"><BotaoGoogle volta="/bastidores-mv" /></div>
          <form onSubmit={enviar} className="mt-4 space-y-3">
            <input className={campo} type="email" autoComplete="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
            <input className={campo} type="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} required />
            {msg && <p className="text-[13px] font-medium text-[#8a3b2e]" role="alert">{msg}</p>}
            {ok && <p className="text-[13px] font-medium text-[#1f6b2a]">{ok}</p>}
            <button disabled={enviando} className="botao botao-pri w-full disabled:opacity-60">{enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}</button>
            <button type="button" onClick={() => { setModo(modo === 'entrar' ? 'criar' : 'entrar'); setMsg(''); setOk('') }} className="w-full text-center text-[13px] font-semibold text-[var(--verde)]">
              {modo === 'entrar' ? 'Primeiro acesso? Criar conta' : 'Já tenho conta. Entrar'}
            </button>
          </form>
          </>
        )}
      </div>
    </div>
  )
}

/** Segunda etapa: quem ativou a verificação em duas etapas digita o código do app autenticador. */
function CodigoDuasEtapas() {
  const [precisa, setPrecisa] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [msg, setMsg] = useState('')
  useEffect(() => {
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => setPrecisa(data?.currentLevel === 'aal1' && data?.nextLevel === 'aal2'))
  }, [])
  if (!precisa) return null
  async function confirmar(e) {
    e.preventDefault(); setMsg('')
    const { data: f } = await supabase.auth.mfa.listFactors()
    const fator = f?.totp?.find(x => x.status === 'verified')
    if (!fator) { setMsg('Nenhum app autenticador ativado.'); return }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fator.id, code: codigo.replace(/\D/g, '') })
    if (error) setMsg('Código incorreto ou vencido. Tente o próximo que aparecer no app.')
    else location.reload()
  }
  return (
    <form onSubmit={confirmar} className="mt-4 rounded-2xl bg-[#f4f1eb] p-4">
      <p className="text-[14px] font-bold">Verificação em duas etapas</p>
      <p className="mt-1 text-[13px] text-[#626a63]">Digite o código de 6 dígitos do seu app autenticador.</p>
      <input value={codigo} onChange={e => setCodigo(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" className="mt-2 w-full rounded-xl bg-white px-3.5 py-3 text-center text-[20px] tracking-[0.4em]" />
      {msg && <p className="mt-2 text-[13px] font-medium text-[#8a3b2e]">{msg}</p>}
      <button className="botao botao-pri mt-3 w-full">Confirmar</button>
    </form>
  )
}
