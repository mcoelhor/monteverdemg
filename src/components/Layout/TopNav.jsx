import { Simbolo } from '../UI/Logo'
import { Link, useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'

const LINKS = [
  ['Início', '/'],
  ['Explorar', '/categorias'],
  ['Roteiros', '/roteiro'],
  ['Ofertas', '/ofertas'],
  ['Eventos', '/eventos'],
  ['Úteis', '/uteis'],
  ['Mapa', '/mapa'],
  ['Salvos', '/favoritos'],
]

/** Menu do computador, no espírito da referência aprovada: marca em versal com "Portal de turismo"
    e links em letras maiúsculas espaçadas. No celular quem navega é a barra de baixo. */
export function TopNav() {
  const { pathname } = useLocation()
  const ativo = p => (p === '/' ? pathname === '/' : pathname.startsWith(p) || (p === '/categorias' && pathname.startsWith('/categoria/')))
  return (
    <nav className="sticky top-0 z-50 hidden h-[76px] border-b border-[var(--borda)] bg-[var(--papel)]/95 text-[var(--araucaria)] backdrop-blur lg:block" aria-label="Menu">
      <div className="mx-auto flex h-full max-w-[1180px] items-center gap-6 px-8">
        <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="Monte Verde MG, início">
          <Simbolo size={50} />
          <span className="leading-none">
            <span className="logo-nome block text-[22px]">Monte Verde MG</span>
            <span className="mt-1.5 block h-[2px] w-12 rounded-full bg-current opacity-70" />
          </span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
          {LINKS.map(([t, to]) => (
            <Link key={to} to={to} aria-current={ativo(to) ? 'page' : undefined}
              className={`relative px-2.5 py-2 text-[12.5px] font-semibold uppercase tracking-[0.14em] transition-colors duration-150 ${ativo(to) ? 'text-[var(--musgo)]' : 'text-[var(--leve)] hover:text-[var(--araucaria)]'}`}>
              {t}
              {ativo(to) && <span className="absolute inset-x-2.5 -bottom-0.5 h-[2px] rounded-full bg-[var(--madeira)]" />}
            </Link>
          ))}
        </div>
        <Link to="/busca" aria-label="Buscar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[var(--nevoa)]"><Search size={19} /></Link>
        <Link to="/anuncie" className="botao botao-pri h-10 min-h-0 shrink-0 px-4 text-[14px]">Anuncie</Link>
      </div>
    </nav>
  )
}
