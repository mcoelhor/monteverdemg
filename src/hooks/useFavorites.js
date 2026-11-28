import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { contaAtual, aoMudarConta } from '../lib/conta'

const STORAGE_KEY = 'monteverde_favoritos'
const CHAVE_ANTIGA = 'multivid_favorites' // favoritos salvos antes da troca de nome
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TIPO = { businesses: 'lugar', events: 'evento' }

function lerLocal() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(CHAVE_ANTIGA) || 'null')
    return { businesses: s?.businesses || [], events: s?.events || [] }
  } catch { return { businesses: [], events: [] } }
}

// Um só estado para o site todo: o coração marcado num card aparece marcado em todas as telas.
let fav = lerLocal()
const ouvintes = new Set()
function emitir() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fav)) } catch { /* sem armazenamento */ }
  ouvintes.forEach(f => f(fav))
}

// Com conta: junta o que está no aparelho com o que está na conta e grava o que faltar na conta.
let sincronizadoPara = null
async function sincronizar(user) {
  if (!user || sincronizadoPara === user.id) return
  sincronizadoPara = user.id
  const { data, error } = await supabase.from('favoritos').select('tipo,item_id')
  if (error) { sincronizadoPara = null; return }
  const remoto = { businesses: [], events: [] }
  for (const r of data) (r.tipo === 'lugar' ? remoto.businesses : remoto.events).push(r.item_id)
  const faltando = []
  for (const k of ['businesses', 'events']) {
    for (const id of fav[k]) if (UUID.test(id) && !remoto[k].includes(id)) faltando.push({ tipo: TIPO[k], item_id: id })
  }
  if (faltando.length) await supabase.from('favoritos').upsert(faltando, { onConflict: 'user_id,tipo,item_id', ignoreDuplicates: true })
  fav = {
    businesses: [...new Set([...fav.businesses, ...remoto.businesses])],
    events: [...new Set([...fav.events, ...remoto.events])],
  }
  emitir()
}
aoMudarConta(s => { if (s.user) sincronizar(s.user); else sincronizadoPara = null })

function alternar(k, id) {
  const tinha = fav[k].includes(id)
  fav = { ...fav, [k]: tinha ? fav[k].filter(x => x !== id) : [...fav[k], id] }
  emitir()
  const user = contaAtual()
  if (user && UUID.test(id)) {
    const q = supabase.from('favoritos')
    ;(tinha ? q.delete().match({ tipo: TIPO[k], item_id: id }) : q.upsert({ tipo: TIPO[k], item_id: id }, { onConflict: 'user_id,tipo,item_id', ignoreDuplicates: true }))
      .then(() => {}, () => {})
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(fav)
  useEffect(() => { ouvintes.add(setFavorites); setFavorites(fav); return () => ouvintes.delete(setFavorites) }, [])

  const toggleBusiness = useCallback(id => alternar('businesses', id), [])
  const toggleEvent = useCallback(id => alternar('events', id), [])
  const isFavoriteBusiness = useCallback(id => favorites.businesses.includes(id), [favorites])
  const isFavoriteEvent = useCallback(id => favorites.events.includes(id), [favorites])

  return { favorites, toggleBusiness, toggleEvent, isFavoriteBusiness, isFavoriteEvent }
}
