import { useState } from 'react'
import { Check, CopyCheck } from 'lucide-react'
import { DIAS, DIAS_NOME } from '../lib/horario'

const UTEIS = ['seg', 'ter', 'qua', 'qui', 'sex']
const FIM = ['sab', 'dom']

/** Horário de funcionamento: escolhe abre/fecha (e um 2º turno, se tiver), marca os dias e aplica de uma vez.
    Embaixo, cada dia continua editável (dá para escrever "fechado" ou ajustar só um dia).
    Guarda no formato do guia: "11:00-22:00" ou "12:00-15:00,19:00-23:00". */
export function EditorHorario({ hours, onChange }) {
  const [abre, setAbre] = useState('11:00')
  const [fecha, setFecha] = useState('22:00')
  const [turno2, setTurno2] = useState(false)
  const [abre2, setAbre2] = useState('19:00')
  const [fecha2, setFecha2] = useState('23:00')
  const [dias, setDias] = useState(() => new Set(DIAS))
  const [aviso, setAviso] = useState('')

  const marca = d => setDias(s => { const n = new Set(s); n.has(d) ? n.delete(d) : n.add(d); return n })
  const grupo = lista => setDias(new Set(lista))
  const set = (d, v) => onChange({ ...hours, [d]: v })

  function aplicar() {
    if (!dias.size) { setAviso('Marque pelo menos um dia.'); return }
    if (!abre || !fecha || abre === fecha) { setAviso('Confira o horário de abrir e de fechar.'); return }
    if (turno2 && (!abre2 || !fecha2 || abre2 === fecha2)) { setAviso('Confira o segundo horário.'); return }
    const txt = `${abre}-${fecha}${turno2 ? `,${abre2}-${fecha2}` : ''}`
    const novo = { ...hours }
    for (const d of dias) novo[d] = txt
    onChange(novo)
    setAviso(`Aplicado em ${dias.size} ${dias.size === 1 ? 'dia' : 'dias'}. Os outros dias ficaram como estavam.`)
  }

  const hora = 'num min-w-0 flex-1 rounded-2xl bg-[var(--nevoa)] px-3 py-2.5 text-[16px]'
  return (
    <div>
      <div className="rounded-[18px] border border-[var(--borda)] bg-white p-4">
        <p className="text-[15px] font-bold">Preencher rápido</p>
        <div className="mt-2 flex items-end gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-[13px] font-semibold text-[var(--leve)]">Abre<input type="time" value={abre} onChange={e => setAbre(e.target.value)} className={hora} /></label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-[13px] font-semibold text-[var(--leve)]">Fecha<input type="time" value={fecha} onChange={e => setFecha(e.target.value)} className={hora} /></label>
        </div>
        <label className="mt-3 flex min-h-11 items-center gap-2 text-[15px]">
          <input type="checkbox" checked={turno2} onChange={e => setTurno2(e.target.checked)} className="h-5 w-5 accent-[var(--musgo)]" />
          Fecha no meio do dia (tem 2º horário)
        </label>
        {turno2 && (
          <div className="mt-1 flex items-end gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-[13px] font-semibold text-[var(--leve)]">Reabre<input type="time" value={abre2} onChange={e => setAbre2(e.target.value)} className={hora} /></label>
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-[13px] font-semibold text-[var(--leve)]">Fecha<input type="time" value={fecha2} onChange={e => setFecha2(e.target.value)} className={hora} /></label>
          </div>
        )}

        <p className="mt-4 text-[14px] font-semibold">Nos dias que abrimos:</p>
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Dias da semana">
          {DIAS.map(d => (
            <button key={d} type="button" onClick={() => marca(d)} aria-pressed={dias.has(d)}
              className={`flex h-11 min-w-[48px] items-center justify-center gap-1 rounded-full px-3 text-[14px] font-semibold ${dias.has(d) ? 'bg-[var(--musgo)] text-white' : 'border border-[var(--borda)] bg-white text-[var(--leve)]'}`}>
              {dias.has(d) && <Check size={14} />}{DIAS_NOME[d].slice(0, 3)}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 text-[13px] font-semibold text-[var(--musgo)]">
          <button type="button" onClick={() => grupo(DIAS)} className="min-h-9 underline underline-offset-4">Todos</button>
          <button type="button" onClick={() => grupo(UTEIS)} className="min-h-9 underline underline-offset-4">Seg a sex</button>
          <button type="button" onClick={() => grupo(FIM)} className="min-h-9 underline underline-offset-4">Fim de semana</button>
          <button type="button" onClick={() => grupo([])} className="min-h-9 underline underline-offset-4">Limpar</button>
        </div>
        <button type="button" onClick={aplicar} className="botao botao-pri mt-3 h-11 min-h-0 w-full text-[15px]"><CopyCheck size={17} />Aplicar aos dias marcados</button>
        {aviso && <p className="mt-2 text-[13px] text-[var(--leve)]" role="status">{aviso}</p>}
      </div>

      <p className="mt-4 text-[13px] text-[var(--leve)]">Ajuste dia a dia, se precisar: 08:00-18:00 · dois turnos 12:00-15:00,19:00-23:00 · fechado · 24h. Em branco = não informado.</p>
      <div className="mt-2 grid grid-cols-1 gap-1.5">
        {DIAS.map(d => (
          <div key={d} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-[14px] font-semibold">{DIAS_NOME[d].slice(0, 3)}</span>
            <input value={hours[d] || ''} onChange={e => set(d, e.target.value)} placeholder="não informado" aria-label={`Horário de ${DIAS_NOME[d]}`} className="min-w-0 flex-1 rounded-2xl bg-[var(--nevoa)] px-4 py-2.5 text-[15px]" />
            <button type="button" onClick={() => set(d, hours[d] === 'fechado' ? '' : 'fechado')} aria-pressed={hours[d] === 'fechado'}
              className={`h-10 shrink-0 rounded-full px-3 text-[13px] font-semibold ${hours[d] === 'fechado' ? 'bg-[var(--araucaria)] text-white' : 'border border-[var(--borda)] text-[var(--leve)]'}`}>Fechado</button>
          </div>
        ))}
      </div>
    </div>
  )
}
