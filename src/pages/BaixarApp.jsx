import { Download, Share, PlusSquare, Smartphone } from 'lucide-react'
import { Layout } from '../components/Layout/Layout'
import { useInstalar, APK_URL } from '../hooks/useInstalar'

/** Página para baixar o app: APK no Android, passo a passo no iPhone. Endereço curto: /app */
export function BaixarApp() {
  const { podeInstalar, instalar, ios, android, nativo, instalado } = useInstalar()
  return (
    <Layout title="Baixar o app">
      <div className="space-y-6 px-5 pt-2 pb-10">
        {(nativo || instalado) && <p className="rounded-[14px] bg-[var(--broto)] p-4 text-[15px]">Você já está usando o app. 👍</p>}

        <section className={`rounded-[var(--raio)] border border-[var(--borda)] bg-white p-5 ${ios ? 'opacity-70' : ''}`}>
          <h2 className="serifa flex items-center gap-2 text-[20px] font-semibold"><Smartphone size={20} />Android</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--leve)]">App completo, abre mesmo sem internet. Versão de teste: baixe e instale direto, sem passar pela loja.</p>
          <a href={APK_URL} className="botao botao-pri mt-4 flex w-full items-center justify-center gap-2"><Download size={18} />Baixar o app Android</a>
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-[14px] leading-relaxed">
            <li>Abra o arquivo baixado (notificação ou pasta Downloads).</li>
            <li>Se aparecer "fonte desconhecida", toque em Configurações e permita.</li>
            <li>Toque em Instalar. Para atualizar, baixe de novo e instale por cima.</li>
          </ol>
          {android && podeInstalar && (
            <button onClick={instalar} className="mt-4 w-full text-center text-[14px] font-semibold text-[var(--musgo)] underline">Prefere sem baixar arquivo? Instalar pelo navegador</button>
          )}
        </section>

        <section className="rounded-[var(--raio)] border border-[var(--borda)] bg-white p-5">
          <h2 className="serifa flex items-center gap-2 text-[20px] font-semibold"><Smartphone size={20} />iPhone</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--leve)]">A versão da App Store ainda está a caminho. Enquanto isso, coloque o guia na tela de início, em 3 toques, pelo <b>Safari</b>:</p>
          <ol className="mt-4 space-y-3 text-[15px]">
            <li className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--nevoa-2)]"><Share size={18} /></span>Toque em <b>Compartilhar</b> (barra de baixo do Safari)</li>
            <li className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--nevoa-2)]"><PlusSquare size={18} /></span>Escolha <b>Adicionar à Tela de Início</b></li>
            <li className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--nevoa-2)] font-bold">✓</span>Toque em <b>Adicionar</b> e abra pelo ícone</li>
          </ol>
        </section>
      </div>
    </Layout>
  )
}
