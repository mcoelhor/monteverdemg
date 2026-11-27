import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout/Layout'

const H2 = ({ children }) => <h2 className="mt-6 text-[20px] font-extrabold tracking-[-0.02em]">{children}</h2>
const ATUALIZADO = '27/11/2026'

/** Termos de uso do guia (turistas e visitantes). Linguagem simples. Revisar com advogado antes de cobrar em escala. */
export function TermosUso() {
  return (
    <Layout title="Termos de uso" showBack>
      <div className="px-5 pb-6 text-[16px] leading-relaxed lg:mx-auto lg:max-w-[720px]">
        <p className="text-sm text-[var(--leve)]">Atualizado em {ATUALIZADO}</p>
        <p className="mt-3">O Monte Verde MG é um guia local gratuito de Monte Verde e Camanducaia (MG). Ao usar o site ou o app, você concorda com estes termos.</p>
        <H2>O que o guia oferece</H2>
        <p className="mt-2">Informações sobre estabelecimentos, serviços, trilhas e eventos; roteiro e concierge com inteligência artificial; mapa (inclusive sem internet); ofertas e avisos dos estabelecimentos.</p>
        <H2>Informações podem mudar</H2>
        <p className="mt-2">Horários, preços, telefones e condições de trilhas mudam. Fazemos o possível para manter tudo certo, mas confirme direto com o estabelecimento ou com quem administra a trilha antes de ir. Sugestões do concierge e do roteiro são automáticas e podem conter erros.</p>
        <H2>Responsabilidade</H2>
        <p className="mt-2">Cada estabelecimento responde pelo próprio serviço, preço, oferta e atendimento. O guia não intermedeia pagamentos entre turistas e estabelecimentos. Em trilhas e passeios, siga as regras do local e as orientações de segurança.</p>
        <H2>Uso correto</H2>
        <p className="mt-2">Não use o guia para enviar conteúdo falso, ofensivo ou de terceiros sem autorização, nem para tentar acessar áreas restritas.</p>
        <H2>Anúncios</H2>
        <p className="mt-2">Lugares em destaque e parceiros são publicidade e aparecem identificados. Regras para quem anuncia: <Link to="/termos-anunciante" className="font-semibold text-[var(--musgo)] underline underline-offset-4">termos do anunciante</Link>.</p>
        <H2>Privacidade</H2>
        <p className="mt-2">Veja o que guardamos e como desligar em <Link to="/privacidade" className="font-semibold text-[var(--musgo)] underline underline-offset-4">Privacidade</Link>.</p>
        <H2>Contato</H2>
        <p className="mt-2">monteverdeapp@gmail.com</p>
      </div>
    </Layout>
  )
}

/** Termos do anunciante: o que o plano inclui, regras das notificações e cancelamento. */
export function TermosAnunciante() {
  return (
    <Layout title="Termos do anunciante" showBack>
      <div className="px-5 pb-6 text-[16px] leading-relaxed lg:mx-auto lg:max-w-[720px]">
        <p className="text-sm text-[var(--leve)]">Atualizado em {ATUALIZADO}</p>
        <p className="mt-3">Valem para quem cadastra, administra ou anuncia um negócio no Monte Verde MG.</p>
        <H2>Cadastro e página do negócio</H2>
        <p className="mt-2">O cadastro básico é gratuito. Quem administra a página deve ser o responsável pelo negócio e manter as informações verdadeiras e atualizadas. O guia pode revisar, corrigir ou tirar do ar informações incorretas, e confirma a titularidade antes de liberar a edição.</p>
        <H2>Planos pagos</H2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Os planos (Destaque e Parceiro) valem pelo período contratado, contado a partir da ativação.</li>
          <li>O que cada plano inclui está descrito na página <Link to="/anuncie" className="font-semibold text-[var(--musgo)] underline underline-offset-4">Anuncie</Link> no momento da contratação.</li>
          <li>Sem fidelidade: não há renovação automática. Ao fim do período, a página volta ao plano gratuito, sem perder o cadastro.</li>
          <li>Destaque significa mais visibilidade, não posição garantida em toda busca, nem número mínimo de clientes ou cliques.</li>
          <li>Arrependimento: em contratação online, você pode desistir em até 7 dias da ativação e receber o valor de volta (Código de Defesa do Consumidor, art. 49).</li>
        </ul>
        <H2>Notificações no celular dos turistas</H2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Só chegam a quem aceitou receber ofertas dos estabelecimentos e podem ser desligadas pelo turista a qualquer momento.</li>
          <li>Horário de envio entre 8h e 21h, quantidade conforme o plano, sem links no texto.</li>
          <li>Todo aviso passa por aprovação do guia antes de sair. Conteúdo enganoso, ofensivo ou fora da realidade do negócio é recusado.</li>
        </ul>
        <H2>Ofertas e fotos</H2>
        <p className="mt-2">O anunciante cumpre as ofertas que publica, nas condições informadas. Fotos e textos enviados devem ser próprios ou autorizados; ao enviar, você autoriza o guia a exibi-los no site, no app e no totem.</p>
        <H2>Totem</H2>
        <p className="mt-2">Anúncios no totem seguem as mesmas regras de conteúdo. Vídeos e imagens precisam ter direitos de uso.</p>
        <H2>Contato</H2>
        <p className="mt-2">monteverdeapp@gmail.com</p>
      </div>
    </Layout>
  )
}
