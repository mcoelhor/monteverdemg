import { porCategoria, preco } from '../hooks/useCardapio'

/** Cardápio cadastrado no guia, por categoria. */
export function CardapioLista({ itens, escuro = false }) {
  if (!itens.length) return null
  return (
    <div className="space-y-6">
      {porCategoria(itens).map(([cat, lista]) => (
        <section key={cat}>
          <h3 className={`serifa text-[20px] font-semibold ${escuro ? 'text-white' : ''}`}>{cat}</h3>
          <ul className={`mt-2 divide-y ${escuro ? 'divide-white/10' : 'divide-[var(--borda)]'}`}>
            {lista.map(i => (
              <li key={i.id} className="flex gap-3 py-3">
                {i.foto_url && <img src={i.foto_url} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" loading="lazy" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className={`flex-1 text-[16px] font-semibold leading-snug ${escuro ? 'text-white' : ''}`}>{i.nome}</p>
                    {i.preco != null && <p className={`num shrink-0 text-[16px] font-semibold ${escuro ? 'text-[var(--broto)]' : 'text-[var(--musgo)]'}`}>{preco(i.preco)}</p>}
                  </div>
                  {i.descricao && <p className={`mt-0.5 text-[14px] leading-snug ${escuro ? 'text-white/70' : 'text-[var(--leve)]'}`}>{i.descricao}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
