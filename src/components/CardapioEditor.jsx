import { useRef, useState } from 'react'
import { Plus, Trash2, Pencil, ImagePlus, Loader2, Eye, EyeOff } from 'lucide-react'
import { supabase, SUPABASE_URL } from '../lib/supabase'
import { useCardapio, preco } from '../hooks/useCardapio'

const FOTOS = `${SUPABASE_URL}/storage/v1/object/public/fotos/`
const VAZIO = { categoria: '', nome: '', descricao: '', preco: '', foto_url: null }

async function comprimir(file, max, q) {
  const bmp = await createImageBitmap(file)
  const esc = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * esc); c.height = Math.round(bmp.height * esc)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise(r => c.toBlob(r, 'image/webp', q))
}

/** Cadastro do cardápio: usado pelo dono (Meu negócio) e pelo administrador. */
export function CardapioEditor({ b }) {
  const { itens, recarregar } = useCardapio(b.id, { todos: true })
  const [f, setF] = useState(null) // item em edição (novo ou existente)
  const [msg, setMsg] = useState('')
  const [enviando, setEnviando] = useState(false)
  const arquivo = useRef()
  const categorias = [...new Set(itens.map(i => i.categoria).filter(Boolean))]

  async function foto(e) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setEnviando(true); setMsg('')
    try {
      const nome = `lugares/${b.id}/cardapio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.webp`
      const blob = await comprimir(file, 1400, 0.8)
      const { error } = await supabase.storage.from('fotos').upload(nome, blob, { contentType: 'image/webp' })
      if (error) throw error
      setF(v => ({ ...v, foto_url: FOTOS + nome }))
    } catch (err) { setMsg('Não foi possível enviar a foto: ' + (err.message || '')) }
    setEnviando(false)
  }

  async function salvar() {
    if (!f.nome.trim()) return setMsg('Dê um nome ao item.')
    const dados = { business_id: b.id, categoria: f.categoria.trim().slice(0, 60), nome: f.nome.trim().slice(0, 80), descricao: (f.descricao || '').trim().slice(0, 300), preco: f.preco === '' || f.preco == null ? null : Number(String(f.preco).includes(',') ? String(f.preco).replace(/\./g, '').replace(',', '.') : f.preco), foto_url: f.foto_url }
    if (dados.preco != null && Number.isNaN(dados.preco)) return setMsg('Preço inválido. Ex.: 59,90')
    const r = f.id ? await supabase.from('cardapio_itens').update(dados).eq('id', f.id) : await supabase.from('cardapio_itens').insert({ ...dados, ordem: itens.length })
    if (r.error) return setMsg(r.error.message)
    setF(null); setMsg(''); recarregar()
  }
  const alternar = async (i, campo) => { await supabase.from('cardapio_itens').update({ [campo]: !i[campo] }).eq('id', i.id); recarregar() }
  const apagar = async i => { if (!confirm(`Apagar "${i.nome}" do cardápio?`)) return; await supabase.from('cardapio_itens').delete().eq('id', i.id); recarregar() }

  const campo = 'mt-1 w-full rounded-xl border border-[var(--borda)] bg-white px-3 py-2.5 text-[15px]'
  return (
    <section className="mt-6">
      <h3 className="text-[18px] font-extrabold tracking-[-0.02em]">Cardápio <span className="text-[14px] font-medium text-[var(--leve)]">({itens.length} itens)</span></h3>
      <p className="mt-1 text-[14px] text-[var(--leve)]">O cliente consulta pelo botão “Ver cardápio”, na sua página do guia e no totem das mesas. Foto é opcional.</p>

      <ul className="mt-3 divide-y divide-[var(--borda)] rounded-2xl border border-[var(--borda)] bg-white">
        {itens.map(i => (
          <li key={i.id} className={`flex items-center gap-3 p-3 ${i.ativo ? '' : 'opacity-50'}`}>
            {i.foto_url ? <img src={i.foto_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <div className="h-12 w-12 shrink-0 rounded-lg bg-[var(--nevoa-2)]" />}
            <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-semibold">{i.nome}</p><p className="truncate text-[13px] text-[var(--leve)]">{[i.categoria, preco(i.preco)].filter(Boolean).join(' · ')}</p></div>
            <button onClick={() => alternar(i, 'ativo')} aria-label={i.ativo ? 'Esconder' : 'Mostrar'} title={i.ativo ? 'Esconder (acabou)' : 'Mostrar de novo'} className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--leve)]">{i.ativo ? <Eye size={17} /> : <EyeOff size={17} />}</button>
            <button onClick={() => { setF({ ...i, preco: i.preco == null ? '' : String(i.preco).replace('.', ',') }); setMsg('') }} aria-label="Editar" className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--leve)]"><Pencil size={17} /></button>
            <button onClick={() => apagar(i)} aria-label="Apagar" className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--leve)]"><Trash2 size={17} /></button>
          </li>
        ))}
        {!itens.length && <li className="p-4 text-[14px] text-[var(--leve)]">Nenhum item ainda.</li>}
      </ul>

      {!f && <button onClick={() => { setF({ ...VAZIO, categoria: categorias[categorias.length - 1] || '' }); setMsg('') }} className="botao botao-sec mt-3 flex w-full items-center justify-center gap-2"><Plus size={18} />Adicionar item</button>}

      {f && (
        <div className="mt-3 rounded-2xl border border-[var(--borda)] bg-[var(--nevoa)] p-4">
          <div className="flex gap-3">
            <button type="button" onClick={() => arquivo.current?.click()} className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--borda)] bg-white" aria-label="Foto do prato">
              {enviando ? <Loader2 className="animate-spin" /> : f.foto_url ? <img src={f.foto_url} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="text-[var(--leve)]" />}
            </button>
            <input ref={arquivo} type="file" accept="image/*" className="hidden" onChange={foto} />
            <div className="flex-1">
              <label className="block text-[13px] font-semibold">Nome<input className={campo} value={f.nome} onChange={e => setF(v => ({ ...v, nome: e.target.value }))} placeholder="Pizza Margherita" /></label>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block text-[13px] font-semibold">Categoria<input className={campo} list="cats-cardapio" value={f.categoria} onChange={e => setF(v => ({ ...v, categoria: e.target.value }))} placeholder="Pizzas" /></label>
            <label className="block text-[13px] font-semibold">Preço (R$)<input className={campo} inputMode="decimal" value={f.preco} onChange={e => setF(v => ({ ...v, preco: e.target.value }))} placeholder="59,90" /></label>
          </div>
          <datalist id="cats-cardapio">{categorias.map(c => <option key={c} value={c} />)}</datalist>
          <label className="mt-2 block text-[13px] font-semibold">Descrição<textarea className={campo} rows={2} value={f.descricao} onChange={e => setF(v => ({ ...v, descricao: e.target.value }))} placeholder="Molho de tomate, muçarela de búfala e manjericão" /></label>
          {msg && <p className="mt-2 text-[14px] text-red-700">{msg}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={salvar} disabled={enviando} className="botao botao-pri flex-1">Salvar item</button>
            <button onClick={() => { setF(null); setMsg('') }} className="botao botao-sec">Cancelar</button>
          </div>
        </div>
      )}
      {!f && msg && <p className="mt-2 text-[14px] text-red-700">{msg}</p>}
    </section>
  )
}
