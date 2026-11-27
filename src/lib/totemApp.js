// App do totem (APK "Monte Verde Totem"): mesmo código do guia, gerado com VITE_TOTEM=1.
// Abre direto no /totem do estabelecimento escolhido na primeira vez (guardado no aparelho).
export const APP_TOTEM = import.meta.env.VITE_TOTEM === '1'
const CHAVE = 'mv-totem-local'
export const localSalvo = () => { try { return localStorage.getItem(CHAVE) || '' } catch { return '' } }
export const salvarLocal = slug => { try { localStorage.setItem(CHAVE, slug) } catch { /* */ } }
