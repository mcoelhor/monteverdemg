import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Compass, Route, LifeBuoy, Heart } from 'lucide-react'

const TABS = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/categorias', icon: Compass, label: 'Explorar', tambem: ['/categoria/', '/busca', '/mapa'] },
  { path: '/roteiro', icon: Route, label: 'Roteiro', tambem: ['/concierge'] },
  { path: '/uteis', icon: LifeBuoy, label: 'Úteis', tambem: ['/sos'] },
  { path: '/favoritos', icon: Heart, label: 'Salvos' },
]

/** Barra de baixo: clara, ícone e rótulo; o destino ativo fica em verde sálvia. */
export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const ativo = (p, tambem = []) => (p === '/' ? pathname === '/' : [p, ...tambem].some(x => pathname.startsWith(x)))

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[480px] border-t border-[var(--borda)] bg-[var(--papel)] lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação principal"
    >
      <div className="flex h-[66px] items-stretch px-1">
        {TABS.map(({ path, icon: Icon, label, tambem }) => {
          const on = ativo(path, tambem)
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              aria-current={on ? 'page' : undefined}
              className="pressiona relative flex flex-1 flex-col items-center justify-center gap-1"
            >
              <span className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200 ${on ? 'bg-[var(--broto)]' : ''}`}>
                <Icon size={22} strokeWidth={on ? 2.1 : 1.7} className={on ? 'text-[var(--musgo)]' : 'text-[var(--leve)]'} />
              </span>
              <span className={`text-[12px] transition-colors duration-200 ${on ? 'font-bold text-[var(--musgo)]' : 'font-medium text-[var(--leve)]'}`}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
