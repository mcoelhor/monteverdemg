import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Heart, Route, LogOut, Trash2, Store, ArrowRight, Loader2, Sparkles, ChevronDown, MapPin } from 'lucide-react'
import { Layout } from '../components/Layout/Layout'
import { BotaoGoogle } from '../components/BotaoGoogle'
import { useConta, nomeDe, fotoDe, sair, apagarConta } from '../lib/conta'
import { useFavorites } from '../hooks/useFavorites'
import { supabase } from '../lib/supabase'
import { SLOTS } from '../lib/roteiro'

// Mesmo formato do link "Enviar" do roteiro: abre o roteiro salvo direto na tela de roteiro.
const linkRoteiro = dados => `/roteiro?r=${btoa(unescape(encodeURIComponent(JSON.stringify(dados)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
const VOLTAS = ['/roteiro', '/favoritos', '/conta', '/concierge']

export function Conta() {
  const { carregando, user } = useConta()
  const [params] = useSearchParams()
  const volta = VOLTAS.includes(params.get('volta')) ? params.get('volta') : '/conta'
  return (
    <Layout title="Minha conta" showBack>
      <div className="px-5 pb-10">
        {carregando ? <div className="esqueleto mt-4 h-40 rounded-[var(--raio)]" /> : user ? <Logado user={user} /> : <Entrar volta={volta} />}
      </div>
    </Layout>
  )
}

function Entrar({ volta }) {
  return (
    <section className="mt-2 rounded-[18px] border border-[var(--borda)] bg-[var(--papel)] p-5">
      <h2 className="serifa text-[24px] font-semibold leading-tight">Salve sua viagem</h2>
      <p className="mt-2 text-[16px] leading-relaxed text-[var(--leve)]">Entre para guardar lugares e roteiros e encontrar tudo de novo no celular, no computador ou se trocar de aparelho. O guia continua funcionando sem conta.</p>
      <div className="mt-5"><BotaoGoogle volta={volta} texto="Entrar com Google" /></div>
      <p className="mt-4 text-[13px] leading-relaxed text-[var(--leve)]">Guardamos só seu nome, e-mail e o que você salvar. Você pode apagar a conta quando quiser. <Link to="/privacidade" className="underline">Privacidade</Link></p>
    </section>
  )
}

function Logado({ user }) {
  const { favorites } = useFavorites()
  const [roteiros, setRoteiros] = useState(null)
  const [ehDono, setEhDono] = useState(false)
  const foto = fotoDe(user)

  useEffect(() => {
    supabase.from('roteiros_salvos').select('id,titulo,dados,atualizado_em').order('atualizado_em', { ascending: false }).then(({ data }) => setRoteiros(data || []))
    supabase.from('business_owners').select('business_id', { count: 'exact', head: true }).eq('user_id', user.id).then(({ count }) => setEhDono(!!count))
  }, [user.id])

  const apagarRoteiro = async id => {
    setRoteiros(r => r.filter(x => x.id !== id))
    await supabase.from('roteiros_salvos').delete().eq('id', id)
  }

  return (
    <>
      <section className="mt-2 flex items-center gap-4 rounded-[18px] border border-[var(--borda)] bg-[var(--papel)] p-5">
        {foto
          ? <img src={foto} alt="" width="56" height="56" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full object-cover" />
          : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--broto)] text-[22px] font-bold text-[var(--musgo)]">{(nomeDe(user)[0] || '?').toUpperCase()}</span>}
        <div className="min-w-0">
          <p className="truncate text-[18px] font-bold">{nomeDe(user)}</p>
          <p className="truncate text-[14px] text-[var(--leve)]">{user.email}</p>
        </div>
      </section>

      <Link to="/favoritos" className="pressiona mt-3 flex min-h-14 items-center gap-3 rounded-[var(--raio)] bg-[var(--papel)] px-4">
        <Heart size={20} className="text-[#d43c3c]" />
        <span className="flex-1 text-[16px] font-semibold">Lugares salvos</span>
        <span className="num text-[15px] text-[var(--leve)]">{favorites.businesses.length}</span>
        <ArrowRight size={18} className="text-[var(--musgo)]" />
      </Link>

      <section className="mt-6">
        <h2 className="titulo text-[22px]">Roteiros salvos</h2>
        {roteiros === null ? <div className="esqueleto mt-3 h-16 rounded-[var(--raio)]" /> : roteiros.length === 0 ? (
          <p className="mt-2 text-[15px] text-[var(--leve)]">Nenhum ainda. Monte um em <Link to="/roteiro" className="font-semibold text-[var(--musgo)] underline">Roteiro</Link> e toque em "Salvar".</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {roteiros.map(r => r.dados?.tipo === 'concierge'
              ? <RoteiroConcierge key={r.id} r={r} onApagar={() => apagarRoteiro(r.id)} />
              : (
              <li key={r.id} className="flex items-center gap-2 rounded-[var(--raio)] bg-[var(--papel)] pl-4">
                <Link to={linkRoteiro(r.dados)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3">
                  <Route size={18} className="shrink-0 text-[var(--musgo)]" />
                  <span className="min-w-0">
                    <span className="block truncate text-[16px] font-semibold">{r.titulo}</span>
                    <span className="block text-[13px] text-[var(--leve)]">salvo em {new Date(r.atualizado_em).toLocaleDateString('pt-BR')}</span>
                  </span>
                </Link>
                <button onClick={() => apagarRoteiro(r.id)} className="flex h-14 w-12 items-center justify-center text-[var(--leve)]" aria-label={`Apagar roteiro ${r.titulo}`}><Trash2 size={18} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {ehDono && (
        <Link to="/meu-negocio" className="pressiona mt-6 flex min-h-14 items-center gap-3 rounded-[var(--raio)] bg-[var(--papel)] px-4">
          <Store size={20} className="text-[var(--musgo)]" />
          <span className="flex-1 text-[16px] font-semibold">Meu negócio</span>
          <ArrowRight size={18} className="text-[var(--musgo)]" />
        </Link>
      )}

      <button onClick={() => sair()} className="botao botao-sec mt-8 w-full"><LogOut size={18} />Sair</button>
      <ApagarConta />
    </>
  )
}

/** Roteiro do concierge salvo: abre ali mesmo, com os dias e os lugares (cada lugar leva à página dele). */
function RoteiroConcierge({ r, onApagar }) {
  const [aberto, setAberto] = useState(false)
  const dias = Array.isArray(r.dados?.dias) ? r.dados.dias : []
  return (
    <li className="rounded-[var(--raio)] bg-[var(--papel)]">
      <div className="flex items-center gap-2 pl-4">
        <button onClick={() => setAberto(v => !v)} aria-expanded={aberto} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 text-left">
          <Sparkles size={18} className="shrink-0 text-[var(--musgo)]" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-semibold">{r.titulo}</span>
            <span className="block text-[13px] text-[var(--leve)]">{dias.length} {dias.length === 1 ? 'dia' : 'dias'} · salvo em {new Date(r.atualizado_em).toLocaleDateString('pt-BR')}</span>
          </span>
          <ChevronDown size={18} className={`shrink-0 text-[var(--leve)] transition-transform ${aberto ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={onApagar} className="flex h-14 w-12 items-center justify-center text-[var(--leve)]" aria-label={`Apagar roteiro ${r.titulo}`}><Trash2 size={18} /></button>
      </div>
      {aberto && (
        <div className="space-y-4 border-t border-[var(--borda)] px-4 pb-4 pt-3">
          {r.dados?.pedido && <p className="text-[14px] italic text-[var(--leve)]">"{r.dados.pedido}"</p>}
          {dias.map((d, k) => (
            <div key={k}>
              {d.titulo && <h3 className="serifa text-[18px] font-semibold">{d.titulo}</h3>}
              <ol className="mt-1 space-y-2">
                {(d.paradas || []).map((p, i) => {
                  const corpo = (
                    <span className="min-w-0">
                      <span className="block text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--madeira)]">{SLOTS[p.periodo]?.rotulo || ''}</span>
                      <span className="block text-[16px] font-semibold leading-snug">{p.nome}</span>
                      {p.porque && <span className="block text-[13px] leading-snug text-[var(--leve)]">{p.porque}</span>}
                    </span>
                  )
                  return (
                    <li key={i}>
                      {p.slug
                        ? <Link to={`/estabelecimento/${p.slug}`} className="flex items-start gap-2"><MapPin size={16} className="mt-4 shrink-0 text-[var(--musgo)]" />{corpo}</Link>
                        : <div className="flex items-start gap-2 pl-6">{corpo}</div>}
                    </li>
                  )
                })}
              </ol>
            </div>
          ))}
        </div>
      )}
    </li>
  )
}

function ApagarConta() {
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState(0) // 0 fechado · 1 confirmar · 2 apagando
  const [erro, setErro] = useState('')
  const confirmar = async () => {
    setEtapa(2); setErro('')
    try { await apagarConta(); navigate('/', { replace: true }) } catch (e) { setErro(e.message); setEtapa(1) }
  }
  if (etapa === 0) return <button onClick={() => setEtapa(1)} className="mt-3 min-h-11 w-full text-[14px] font-semibold text-[#8a3b2e] underline underline-offset-4">Apagar minha conta</button>
  return (
    <div className="mt-4 rounded-[var(--raio)] border border-[#e9c6bf] bg-[#fbf1ef] p-4" role="alertdialog" aria-labelledby="apagar-titulo">
      <p id="apagar-titulo" className="text-[16px] font-bold text-[#8a3b2e]">Apagar a conta?</p>
      <p className="mt-1 text-[15px] leading-relaxed">Seus lugares e roteiros salvos na conta somem para sempre. Não dá para desfazer. O que está salvo neste aparelho continua aqui.</p>
      {erro && <p className="mt-2 text-[14px] font-semibold text-[#8a3b2e]" role="alert">{erro}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={() => setEtapa(0)} disabled={etapa === 2} className="botao botao-sec flex-1">Cancelar</button>
        <button onClick={confirmar} disabled={etapa === 2} className="botao flex-1 bg-[#8a3b2e] text-white">{etapa === 2 ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}Apagar</button>
      </div>
    </div>
  )
}
