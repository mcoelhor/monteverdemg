import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserRound, Store, LogOut, ChevronDown, Heart } from 'lucide-react'
import { useConta, nomeDe, fotoDe, sair } from '../lib/conta'

/** "Entrar" do topo: escolhe entre conta de visitante e área do dono. Logado, mostra a foto e o menu da conta.
    variante "nav" = menu do computador; "topo" = ícone na barra do topo da home (celular). */
export function BotaoConta({ variante = 'nav' }) {
  const { carregando, user } = useConta()
  const [aberto, setAberto] = useState(false)
  const caixa = useRef(null)

  useEffect(() => {
    if (!aberto) return
    const fora = e => { if (!caixa.current?.contains(e.target)) setAberto(false) }
    const esc = e => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('pointerdown', fora); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', esc) }
  }, [aberto])

  if (carregando) return <span className={variante === 'nav' ? 'h-10 w-10 shrink-0' : 'h-11 w-11 shrink-0'} aria-hidden="true" />
  const foto = fotoDe(user)
  const estilo = variante === 'nav'
    ? 'h-10 rounded-full border border-[var(--borda)] bg-[var(--papel)] text-[14px] font-semibold text-[var(--araucaria)] hover:bg-[var(--nevoa)]'
    : 'h-11 w-11 justify-center rounded-full'
  const fechar = () => setAberto(false)

  return (
    <div ref={caixa} className="relative shrink-0">
      <button type="button" onClick={() => setAberto(v => !v)} aria-expanded={aberto} aria-haspopup="menu"
        aria-label={variante === 'topo' ? (user ? 'Minha conta' : 'Entrar') : undefined}
        className={`flex items-center gap-2 ${variante === 'nav' ? (user ? 'pl-1 pr-2.5' : 'px-4') : ''} ${estilo}`}>
        {variante === 'topo' ? (user
          ? (foto ? <img src={foto} alt="" width="30" height="30" referrerPolicy="no-referrer" className="h-[30px] w-[30px] rounded-full object-cover" />
            : <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[var(--broto)] text-[13px] font-bold text-[var(--musgo)]">{(nomeDe(user)[0] || '?').toUpperCase()}</span>)
          : <UserRound size={22} aria-hidden="true" />)
        : user ? (
          <>
            {foto ? <img src={foto} alt="" width="32" height="32" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover" />
              : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--broto)] text-[14px] font-bold text-[var(--musgo)]">{(nomeDe(user)[0] || '?').toUpperCase()}</span>}
            <span className="sr-only">Minha conta</span><ChevronDown size={15} aria-hidden="true" />
          </>
        ) : <><UserRound size={17} aria-hidden="true" />Entrar</>}
      </button>

      {aberto && (
        <div role="menu" className={`absolute z-[60] mt-2 w-[280px] overflow-hidden rounded-[16px] border border-[var(--borda)] bg-[var(--papel)] text-[var(--araucaria)] shadow-[0_12px_40px_rgb(20_22_20/0.18)] right-0`}>
          {user ? (
            <>
              <p className="truncate border-b border-[var(--borda)] px-4 py-3 text-[14px]"><b>{nomeDe(user)}</b><span className="block truncate text-[13px] text-[var(--leve)]">{user.email}</span></p>
              <Item to="/conta" icon={UserRound} titulo="Minha conta" sub="Roteiros salvos e dados da conta" onClick={fechar} />
              <Item to="/favoritos" icon={Heart} titulo="Lugares salvos" sub="Os lugares que você marcou" onClick={fechar} />
              <Item to="/meu-negocio" icon={Store} titulo="Meu negócio" sub="Editar a página do seu lugar" onClick={fechar} />
              <button role="menuitem" onClick={() => { fechar(); sair() }} className="flex min-h-12 w-full items-center gap-3 border-t border-[var(--borda)] px-4 text-left text-[15px] hover:bg-[var(--nevoa)]"><LogOut size={18} className="text-[var(--leve)]" />Sair</button>
            </>
          ) : (
            <>
              <p className="px-4 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--leve)]">Entrar como</p>
              <Item to="/conta" icon={UserRound} titulo="Visitante" sub="Salvar lugares e montar seus roteiros" onClick={fechar} />
              <Item to="/meu-negocio" icon={Store} titulo="Dono de negócio" sub="Restaurante, pousada ou loja: edite sua página" onClick={fechar} />
              <Link role="menuitem" to="/favoritos" onClick={fechar} className="flex min-h-11 items-center gap-3 border-t border-[var(--borda)] px-4 text-[14px] text-[var(--leve)] hover:bg-[var(--nevoa)]"><Heart size={16} />Ver lugares salvos neste aparelho</Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Item({ to, icon: I, titulo, sub, onClick }) {
  return (
    <Link role="menuitem" to={to} onClick={onClick} className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--nevoa)]">
      <I size={19} className="mt-0.5 shrink-0 text-[var(--musgo)]" />
      <span><span className="block text-[15px] font-semibold leading-tight">{titulo}</span><span className="block text-[13px] leading-snug text-[var(--leve)]">{sub}</span></span>
    </Link>
  )
}
