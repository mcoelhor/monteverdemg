// Conta do visitante: um só estado de sessão para o site todo (favoritos, roteiros, Minha conta).
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

let atual = { carregando: true, user: null }
const ouvintes = new Set()
const emitir = () => ouvintes.forEach(f => f(atual))

supabase.auth.getSession().then(({ data }) => { atual = { carregando: false, user: data.session?.user || null }; emitir() })
supabase.auth.onAuthStateChange((_e, session) => {
  // setTimeout: o Supabase pede para não chamar a API dentro do próprio aviso de mudança
  setTimeout(() => { atual = { carregando: false, user: session?.user || null }; emitir() }, 0)
})

export function useConta() {
  const [s, setS] = useState(atual)
  useEffect(() => { ouvintes.add(setS); setS(atual); return () => ouvintes.delete(setS) }, [])
  return s
}
export const contaAtual = () => atual.user
export function aoMudarConta(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn) }

export const nomeDe = u => u?.user_metadata?.full_name || u?.user_metadata?.name || u?.email?.split('@')[0] || ''
export const fotoDe = u => u?.user_metadata?.avatar_url || u?.user_metadata?.picture || ''

export const sair = () => supabase.auth.signOut()

/** Apaga a conta (função no servidor) e encerra a sessão neste aparelho. */
export async function apagarConta() {
  const { data, error } = await supabase.functions.invoke('apagar-conta', { body: {} })
  if (error || !data?.ok) {
    let erro = data?.erro
    try { erro = erro || (await error?.context?.json())?.erro } catch { /* sem corpo */ }
    throw new Error(erro || 'Não foi possível apagar agora. Tente de novo.')
  }
  await supabase.auth.signOut({ scope: 'local' })
}
