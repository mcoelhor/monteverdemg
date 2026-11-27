import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Check } from 'lucide-react'
import { Logo } from '../components/UI/Logo'
import { useBusinesses } from '../hooks/useBusinesses'
import { localSalvo, salvarLocal } from '../lib/totemApp'

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Primeira abertura do totem (ou troca de lugar): escolhe em qual estabelecimento o aparelho está. */
export function TotemConfigurar() {
  const navigate = useNavigate()
  const { businesses, loading } = useBusinesses({})
  const [q, setQ] = useState('')
  const atual = localSalvo()
  const lista = useMemo(() => businesses.filter(b => !q || norm(b.name).includes(norm(q))).slice(0, 40), [businesses, q])
  const escolher = slug => { salvarLocal(slug); navigate(`/totem?local=${encodeURIComponent(slug)}`, { replace: true }) }
  return (
    <main className="min-h-dvh bg-[var(--nevoa)] px-5 pb-10 pt-8">
      <div className="mx-auto max-w-[560px]">
        <Logo />
        <h1 className="serifa mt-6 text-[26px] font-semibold leading-tight">Em qual lugar fica este totem?</h1>
        <p className="mt-2 text-[15px] text-[var(--leve)]">Escolha o estabelecimento onde o aparelho vai ficar. Para trocar depois, toque 5 vezes seguidas no canto de cima, à esquerda, da tela do totem.</p>
        <label className="mt-5 flex items-center gap-2 rounded-2xl border border-[var(--borda)] bg-white px-4">
          <Search size={18} className="text-[var(--leve)]" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Nome do estabelecimento" className="min-h-12 flex-1 bg-transparent text-[16px] outline-none" />
        </label>
        {loading && !businesses.length ? <p className="mt-4 text-sm text-[var(--leve)]">Carregando lugares… (precisa de internet na primeira vez)</p> : (
          <ul className="mt-3 divide-y divide-[var(--borda)] rounded-2xl border border-[var(--borda)] bg-white">
            {lista.map(b => (
              <li key={b.id}>
                <button onClick={() => escolher(b.slug)} className="flex min-h-14 w-full items-center gap-3 px-4 text-left">
                  <span className="flex-1"><span className="block text-[16px] font-semibold">{b.name}</span><span className="text-[13px] text-[var(--leve)]">{b.address || b.city || ''}</span></span>
                  {b.slug === atual && <Check size={18} className="text-[var(--musgo)]" />}
                </button>
              </li>
            ))}
            {!lista.length && <li className="p-4 text-sm text-[var(--leve)]">Nenhum lugar com esse nome.</li>}
          </ul>
        )}
        <button onClick={() => escolher('')} className="mt-4 text-[14px] font-semibold text-[var(--leve)] underline">Usar sem estabelecimento (só o guia)</button>
      </div>
    </main>
  )
}
