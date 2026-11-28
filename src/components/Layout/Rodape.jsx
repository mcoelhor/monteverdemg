import { Link } from 'react-router-dom'
import { Siren, ArrowRight } from 'lucide-react'

const LINKS = [
  ['Sobre Monte Verde', '/sobre'],
  ['Anuncie seu negócio', '/anuncie'],
  ['Meu negócio', '/meu-negocio'],
  ['Como chegar', '/como-chegar'],
  ['Na época', '/epoca'],
  ['Ofertas', '/ofertas'],
  ['Eventos', '/eventos'],
  ['Todas as categorias', '/categorias'],
  ['Contato', '/mais#contato'],
  ['Corrigir uma informação', '/mais#corrigir'],
  ['Baixar o app', '/app'],
  ['Créditos das fotos', '/creditos'],
  ['Privacidade', '/privacidade'],
  ['Termos de uso', '/termos'],
  ['Termos do anunciante', '/termos-anunciante'],
]

/** Fecho de todas as páginas: emergência discreta, links e o nome em tamanho de pôster. */
export function Rodape() {
  return (
    <footer className="mt-16 overflow-hidden border-t border-[var(--borda)] bg-[var(--nevoa-2)] px-5 pt-8 text-[var(--araucaria)] lg:pt-14">
      <div className="lg:mx-auto lg:max-w-[1180px] lg:px-3">
      <Link to="/sos" className="pressiona flex items-center gap-3 rounded-[var(--raio)] bg-[var(--sos)] px-5 py-4 text-white lg:max-w-[520px]">
        <Siren size={22} className="shrink-0" />
        <span className="flex-1">
          <span className="block text-[17px] font-bold leading-tight">Precisa de ajuda agora?</span>
          <span className="num block text-[14px] text-white/90">Farmácia, pronto-socorro, guincho · 190 · 192 · 193</span>
        </span>
        <ArrowRight size={20} className="shrink-0" />
      </Link>

      <nav className="mt-8 grid grid-cols-2 gap-x-4 gap-y-1 lg:grid-cols-4" aria-label="Links do rodapé">
        {LINKS.map(([t, to]) => (
          <Link key={to} to={to} className="flex min-h-11 min-w-0 items-center py-1 text-[15px] leading-snug text-[var(--leve)] transition-colors duration-150 hover:text-[var(--araucaria)]">{t}</Link>
        ))}
      </nav>

      <p className="mt-12 max-w-[30ch] text-[15px] leading-snug text-[var(--leve)]">
        Guia local de Monte Verde e Camanducaia, MG.
      </p>
      <p className="display -mb-[0.16em] mt-6 select-none text-[22vw] text-[var(--borda)] min-[480px]:text-[104px] lg:whitespace-nowrap lg:text-[150px]" aria-hidden="true">Monte Verde</p>
      </div>
    </footer>
  )
}
