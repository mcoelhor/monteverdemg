import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Cardápio cadastrado pelo dono. Guardado no aparelho para o totem mostrar mesmo sem internet.
const chave = id => `mv_cardapio_${id}`
const ler = id => { try { return JSON.parse(localStorage.getItem(chave(id)) || 'null') || [] } catch { return [] } }

export function useCardapio(businessId, { todos = false } = {}) {
  const [itens, setItens] = useState(() => (businessId && !todos ? ler(businessId) : []))
  const [carregando, setCarregando] = useState(!!businessId)
  const recarregar = useCallback(async () => {
    if (!businessId) return
    let q = supabase.from('cardapio_itens').select('*').eq('business_id', businessId).order('ordem').order('criado_em')
    if (!todos) q = q.eq('ativo', true)
    const { data, error } = await q
    setCarregando(false)
    if (error) return
    setItens(data || [])
    if (!todos) try { localStorage.setItem(chave(businessId), JSON.stringify(data || [])) } catch { /* cheio */ }
  }, [businessId, todos])
  useEffect(() => { recarregar() }, [recarregar])
  return { itens, carregando, recarregar }
}

export const preco = v => (v == null || v === '' ? '' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))

/** Agrupa por categoria, na ordem em que aparecem. */
export function porCategoria(itens) {
  const m = new Map()
  for (const i of itens) { const c = i.categoria || 'Cardápio'; if (!m.has(c)) m.set(c, []); m.get(c).push(i) }
  return [...m.entries()]
}
