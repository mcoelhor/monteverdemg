/** Logo Monte Verde MG: montanha em traço, nome e um traço curto embaixo. Cor = currentColor. */
export const MONTANHA = 'M6 50 L34 22 L43 30 L62 9 L71 19 L76 15 L114 50'
export const NEVE = 'M55 17 L60 23 L65 18 L69 22'

export function Simbolo({ className = '', size = 40, ...p }) {
  return (
    <svg viewBox="0 0 120 56" width={size} height={size * 56 / 120} className={className} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d={MONTANHA} /><path d={NEVE} strokeWidth="3.5" />
    </svg>
  )
}

/** Empilhada (montanha em cima, nome, traço). tamanho = altura do texto em px. */
export function Logo({ tamanho = 20, traco = true, className = '' }) {
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`}>
      <Simbolo size={tamanho * 2.1} />
      <span className="logo-nome mt-[0.18em] whitespace-nowrap" style={{ fontSize: tamanho }}>Monte Verde MG</span>
      {traco && <span className="mt-[0.35em] block h-[2px] rounded-full bg-current opacity-80" style={{ width: tamanho * 2.6 }} />}
    </span>
  )
}
