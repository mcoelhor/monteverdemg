import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ExternalLink } from 'lucide-react'
import { CardapioLista } from './CardapioLista'

/** Cardápio do estabelecimento em tela cheia, dentro do app (o link que o próprio lugar usa). */
export function Cardapio({ b, onFechar, totem = false, itens = [] }) {
  const proprio = itens.length > 0
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])
  return createPortal(
    <div className="fixed inset-0 z-[3000] flex flex-col bg-[var(--araucaria)]" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <p className="min-w-0 flex-1 truncate text-[17px] font-semibold">Cardápio · {b.name}</p>
        {!totem && !proprio && <a href={b.cardapio_url} target="_blank" rel="noopener noreferrer" aria-label="Abrir no navegador" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><ExternalLink size={19} /></a>}
        <button onClick={onFechar} aria-label="Fechar cardápio" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><X size={20} /></button>
      </div>
      {proprio ? (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--nevoa)] px-5 py-5"><CardapioLista itens={itens} />{b.cardapio_url && !totem && <a href={b.cardapio_url} target="_blank" rel="noopener noreferrer" className="botao botao-sec mt-6 flex w-full items-center justify-center gap-2">Pedir online <ExternalLink size={16} /></a>}</div>
      ) : <iframe title={`Cardápio de ${b.name}`} src={b.cardapio_url} className="min-h-0 w-full flex-1 bg-white" />}
    </div>,
    document.body,
  )
}
