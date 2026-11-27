import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Map as MapIcon } from 'lucide-react'
import { MapaBase } from './MapaBase'
import { useGeolocation } from '../hooks/useGeolocation'

/** Mapa pequeno na página do lugar: o pino do lugar (e você, se a localização estiver ligada).
 *  Funciona sem internet quando o mapa offline está salvo. Toque abre o mapa grande centrado no lugar. */
export function MiniMapa({ b }) {
  const navigate = useNavigate()
  const [m, setM] = useState(null)
  const { location, getDistance } = useGeolocation()
  useEffect(() => {
    Promise.all([import('leaflet'), import('react-leaflet'), import('leaflet/dist/leaflet.css')]).then(([l, rl]) => setM({ L: l.default, rl }))
  }, [])
  if (!b.latitude || !b.longitude) return null
  const abrir = () => navigate(`/mapa?lugar=${encodeURIComponent(b.slug)}`)
  const d = getDistance(b.latitude, b.longitude)
  return (
    <div className="sobe mt-4 overflow-hidden rounded-[18px] border border-[var(--borda)] bg-[var(--papel)]" style={{ '--i': 2 }}>
      <div className="relative h-[170px]">
        {m ? (
          <m.rl.MapContainer center={[b.latitude, b.longitude]} zoom={16} zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} keyboard={false} attributionControl={false} style={{ height: '100%', width: '100%' }}>
            <MapaBase rl={m.rl} L={m.L} />
            <m.rl.Marker position={[b.latitude, b.longitude]} icon={m.L.divIcon({ html: '<div class="pino" style="background:#14532d"></div>', className: '', iconSize: [34, 34], iconAnchor: [17, 34] })} />
            {location && <m.rl.CircleMarker center={[location.lat, location.lng]} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }} />}
          </m.rl.MapContainer>
        ) : <div className="esqueleto h-full" />}
        <button onClick={abrir} className="absolute inset-0 z-[500]" aria-label={`Abrir ${b.name} no mapa`} />
      </div>
      <button onClick={abrir} className="flex min-h-12 w-full items-center gap-2 px-4 text-[15px] font-semibold text-[var(--musgo)]">
        <MapIcon size={18} />Ver no mapa e como chegar
        {d != null && <span className="ml-auto text-[13px] font-normal text-[var(--leve)]">{d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1).replace('.', ',')} km`} de você</span>}
      </button>
    </div>
  )
}
