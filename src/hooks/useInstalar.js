import { useEffect, useState } from 'react'

/** APK de teste do Android: gerado pelo GitHub a cada atualização, sempre no mesmo link. */
export const APK_URL = 'https://github.com/mcoelhor/monteverdemg/releases/download/apk-teste/monte-verde-mg-teste.apk'

let adiado = null
const ouvintes = new Set()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); adiado = e; ouvintes.forEach(f => f()) })
}

/** Botão "Instalar app": Android usa o aviso do navegador; iPhone recebe instrução. */
export function useInstalar() {
  const [, forca] = useState(0)
  useEffect(() => { const f = () => forca(n => n + 1); ouvintes.add(f); return () => ouvintes.delete(f) }, [])
  const instalado = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone)
  const ios = !instalado && /iphone|ipad|ipod/i.test(navigator.userAgent)
  const nativo = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()
  const android = !nativo && /android/i.test(navigator.userAgent)
  return {
    podeInstalar: !!adiado && !instalado,
    instalado: !!instalado,
    ios,
    android,
    nativo,
    instalar: async () => { if (!adiado) return; adiado.prompt(); await adiado.userChoice; adiado = null; ouvintes.forEach(f => f()) },
  }
}
