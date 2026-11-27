import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Layout } from '../components/Layout/Layout'

const H2 = ({ children }) => <h2 className="serifa mt-8 text-[22px] font-semibold leading-tight">{children}</h2>

/** Sobre Monte Verde: história da vila e o essencial para quem vem. Texto próprio (fontes: imprensa e portal de turismo de Camanducaia, nov/2026). */
export function Sobre() {
  return (
    <Layout title="Sobre Monte Verde" showBack>
      <article className="px-5 pb-6 text-[16px] leading-relaxed lg:mx-auto lg:max-w-[720px]">
        <p className="text-[18px]">Monte Verde é um distrito de Camanducaia, no extremo sul de Minas Gerais, a cerca de 1.554 metros de altitude, no alto da Serra da Mantiqueira. Fica perto da divisa com São Paulo e é um dos destinos de serra mais procurados do Sudeste.</p>

        <H2>Como a vila começou</H2>
        <p className="mt-2">A história tem nome e sobrenome: Verner Grinberg, imigrante da Letônia que chegou ao Brasil ainda criança, com a família, em 1913. Duas décadas depois, ouviu falar de uns campos frios no alto da serra, os Campos do Jaguari. Em 1938, subiu a Mantiqueira a lombo de burro, abrindo caminho no mato, e comprou terras numa área que muita gente em Camanducaia considerava sem valor.</p>
        <p className="mt-3">Ali ele encontrou o que procurava: um vale frio, cercado de montanhas e coberto de araucárias, parecido com a paisagem da terra natal. Outras famílias europeias vieram depois e trouxeram receitas, costumes e o jeito de construir que ainda dá o tom da vila.</p>
        <p className="mt-3">A data oficial de fundação é <strong>29 de novembro de 1950</strong>, quando o primeiro lote foi registrado.</p>

        <H2>De onde vem o nome</H2>
        <p className="mt-2">"Monte Verde" é a tradução do sobrenome do fundador: em alemão, <em>grün</em> quer dizer verde e <em>Berg</em>, monte.</p>

        <H2>O que esperar</H2>
        <ul className="mt-2 space-y-2">
          <li><strong>Frio de verdade:</strong> no inverno as madrugadas podem ficar abaixo de zero, com geada. Leve agasalho em qualquer época: à noite esfria mesmo no verão.</li>
          <li><strong>Natureza:</strong> os picos mais altos ficam no Parque Verner Grinberg, que leva o nome do fundador. <Link to="/trilhas" className="font-semibold text-[var(--musgo)] underline underline-offset-4">Veja as trilhas</Link>: o acesso é pago e agendado.</li>
          <li><strong>A vila:</strong> a avenida principal concentra restaurantes de fondue e trutas, cafés, chocolaterias e lojas, quase tudo dá para fazer a pé.</li>
          <li><strong>Sinal fraco:</strong> em alguns pontos o celular não pega. <Link to="/mapa" className="font-semibold text-[var(--musgo)] underline underline-offset-4">Baixe o mapa offline</Link> antes de sair.</li>
        </ul>

        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          <Link to="/roteiro" className="botao botao-pri flex items-center justify-center gap-2">Montar meu roteiro <ArrowRight size={18} /></Link>
          <Link to="/como-chegar" className="botao botao-sec flex items-center justify-center gap-2">Como chegar</Link>
        </div>
      </article>
    </Layout>
  )
}
