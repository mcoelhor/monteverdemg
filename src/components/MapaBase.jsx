import { useEffect, useState } from 'react'
import { instalados, abrir, aoMudar, sincronizar, ATRIBUICAO } from '../lib/mapaOffline'

/** Sinal de internet (muda na hora em que cai ou volta). */
export function useOnline() {
  const [on, setOn] = useState(() => navigator.onLine)
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false)
    window.addEventListener('online', a); window.addEventListener('offline', b)
    return () => { window.removeEventListener('online', a); window.removeEventListener('offline', b) }
  }, [])
  return on
}

export function usePacotes() {
  const [i, setI] = useState(instalados)
  useEffect(() => aoMudar(() => setI(instalados())), [])
  return i
}

// Ordem de pintura: arredores embaixo, Monte Verde (mais detalhado) por cima.
const ORDEM = { arredores: 2, 'monte-verde': 3 }

/**
 * Fundo do mapa, dentro do <MapContainer>.
 * - Com pacote no aparelho: desenha o mapa a partir do arquivo local (funciona sem internet).
 * - Com internet e sem o pacote dos arredores: mantém as imagens do OpenStreetMap por baixo, como antes.
 * Recebe o módulo react-leaflet (rl) e o Leaflet (L) já carregados, para não pesar o app.
 */
export function MapaBase({ rl, L }) {
  const map = rl.useMap()
  const pacotes = usePacotes()
  const online = useOnline()
  const ids = Object.keys(pacotes).sort((a, b) => (ORDEM[a] || 9) - (ORDEM[b] || 9))
  const chaveIds = ids.map(id => id + ':' + pacotes[id].versao).join('|')

  useEffect(() => { if (online) sincronizar() }, [online])

  // Imagens online do OpenStreetMap (comportamento antigo)
  const usarOsm = online && !pacotes.arredores
  useEffect(() => {
    if (!usarOsm) return
    const camada = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19, zIndex: 1,
    }).addTo(map)
    return () => { camada.remove() }
  }, [usarOsm, map, L])

  // Pacotes offline
  useEffect(() => {
    if (!ids.length) return
    let vivo = true; const camadas = []
    ;(async () => {
      window.L = window.L || L   // protomaps-leaflet usa o L global
      const { leafletLayer } = await import('protomaps-leaflet')
      for (const id of ids) {
        const p = await abrir(id).catch(() => null)
        if (!p || !vivo) continue
        const [w, s, e, n] = pacotes[id].bbox
        const camada = leafletLayer({
          url: p, flavor: 'light', lang: 'pt', maxDataZoom: pacotes[id].maxzoom, maxZoom: 19,
          bounds: L.latLngBounds([s, w], [n, e]), zIndex: ORDEM[id] || 4, attribution: ATRIBUICAO,
        })
        camada.addTo(map); camadas.push(camada)
      }
    })()
    return () => { vivo = false; camadas.forEach(c => c.remove()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveIds, map, L])

  return null
}
