import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2, Loader2, Eye, EyeOff } from 'lucide-react'
import { supabase, SUPABASE_URL } from '../lib/supabase'

const FOTOS = `${SUPABASE_URL}/storage/v1/object/public/fotos/`
const chave = id => `mv_artes_${id}`

/** Artes do totem de um lugar (guardadas no aparelho para tocar sem internet). */
export function useArtes(businessId, { todas = false } = {}) {
  const ler = () => { try { return JSON.parse(localStorage.getItem(chave(businessId)) || 'null') || [] } catch { return [] } }
  const [artes, setArtes] = useState(() => (businessId && !todas ? ler() : []))
  const recarregar = useCallback(async () => {
    if (!businessId) return
    let q = supabase.from('totem_artes').select('*').eq('business_id', businessId).order('ordem').order('criado_em')
    if (!todas) q = q.eq('ativo', true)
    const { data, error } = await q
    if (error) return
    setArtes(data || [])
    if (!todas) try { localStorage.setItem(chave(businessId), JSON.stringify(data || [])) } catch { /* cheio */ }
  }, [businessId, todas])
  useEffect(() => { recarregar() }, [recarregar])
  return { artes, recarregar }
}

async function preparar(file) {
  const bmp = await createImageBitmap(file)
  const esc = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * esc); c.height = Math.round(bmp.height * esc)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise(r => c.toBlob(r, 'image/webp', 0.85))
}

/** Envio das artes: o dono (ou o admin) coloca artes prontas, em pé, que giram no totem da casa. */
export function ArtesTotemEditor({ b }) {
  const { artes, recarregar } = useArtes(b.id, { todas: true })
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState('')
  const input = useRef()
  async function enviar(e) {
    const files = [...(e.target.files || [])].slice(0, 8 - artes.length); e.target.value = ''
    if (!files.length) return
    setEnviando(true); setMsg('')
    for (const f of files) {
      try {
        const nome = `lugares/${b.id}/totem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.webp`
        const { error } = await supabase.storage.from('fotos').upload(nome, await preparar(f), { contentType: 'image/webp' })
        if (error) throw error
        const r = await supabase.from('totem_artes').insert({ business_id: b.id, imagem_url: FOTOS + nome, ordem: artes.length })
        if (r.error) throw r.error
      } catch (err) { setMsg('Não foi possível enviar uma arte: ' + (err.message || '')) }
    }
    setEnviando(false); recarregar()
  }
  const alternar = async a => { await supabase.from('totem_artes').update({ ativo: !a.ativo }).eq('id', a.id); recarregar() }
  const apagar = async a => {
    if (!confirm('Apagar esta arte do totem?')) return
    await supabase.from('totem_artes').delete().eq('id', a.id)
    const caminho = a.imagem_url.replace(FOTOS, '')
    if (caminho.startsWith('lugares/')) await supabase.storage.from('fotos').remove([caminho])
    recarregar()
  }
  return (
    <section className="mt-6">
      <h3 className="text-[18px] font-extrabold tracking-[-0.02em]">Artes do totem <span className="text-[14px] font-medium text-[var(--leve)]">({artes.length} de 8)</span></h3>
      <p className="mt-1 text-[14px] text-[var(--leve)]">Imagens prontas que giram no totem das suas mesas: promoções, pratos, eventos. Faça em pé (formato de story, 1080 × 1920) e evite texto nas bordas.</p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {artes.map(a => (
          <div key={a.id} className={`relative aspect-[9/16] overflow-hidden rounded-xl bg-[var(--nevoa-2)] ${a.ativo ? '' : 'opacity-40'}`}>
            <img src={a.imagem_url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1">
              <button onClick={() => alternar(a)} aria-label={a.ativo ? 'Pausar' : 'Ativar'} className="flex h-9 w-9 items-center justify-center text-white">{a.ativo ? <Eye size={16} /> : <EyeOff size={16} />}</button>
              <button onClick={() => apagar(a)} aria-label="Apagar" className="flex h-9 w-9 items-center justify-center text-white"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {artes.length < 8 && (
          <button onClick={() => input.current?.click()} disabled={enviando} className="flex aspect-[9/16] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[var(--borda)] text-[12px] text-[var(--leve)]">
            {enviando ? <Loader2 className="animate-spin" /> : <ImagePlus />}Adicionar
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={enviar} />
      {msg && <p className="mt-2 text-[14px] text-red-700">{msg}</p>}
    </section>
  )
}
