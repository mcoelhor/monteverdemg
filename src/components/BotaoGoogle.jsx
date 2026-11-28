import { useState } from 'react'
import { supabase } from '../lib/supabase'

/** Entrar com a conta Google. `volta` é a página para onde a pessoa retorna depois do login. */
export function BotaoGoogle({ volta = '/meu-negocio', texto = 'Entrar com Google' }) {
  const [msg, setMsg] = useState('')
  async function entrar() {
    setMsg('')
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}${volta}` } })
    if (error) setMsg(error.message.includes('not enabled') ? 'Entrar com Google ainda não está ligado. Use o e-mail por enquanto.' : error.message)
  }
  return (
    <>
      <button type="button" onClick={entrar} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-[var(--borda)] bg-white px-4 text-[15px] font-semibold text-[#1f1f1f]">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.4 0 24 0 14.6 0 6.6 5.4 2.6 13.2l8 6.2C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-8-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l8-6.2z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-8 6.2C6.6 42.6 14.6 48 24 48z"/></svg>
        {texto}
      </button>
      {msg && <p className="mt-2 text-[13px] font-medium text-[#8a3b2e]" role="alert">{msg}</p>}
    </>
  )
}
