import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, MessageCircle, LocateFixed, Navigation } from 'lucide-react'
import { Layout } from '../components/Layout/Layout'
import { useBusinesses } from '../hooks/useBusinesses'
import { renderToStaticMarkup } from 'react-dom/server'
import { CATEGORIES, categoria, iconeDe, nomeSub } from '../data/categories'
import { Icon } from '../components/UI/Icon'
import { StatusPill } from '../components/UI/Badge'
import { registrar, linkWhatsApp, linkRota } from '../lib/track'
import { MapaBase } from '../components/MapaBase'
import { BotaoMapaOffline } from '../components/MapaOffline'

/** Distância em texto curto. */
const textoDist = km => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`)
function distKm(a, b) {
  const R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

/** Dentro do mapa: centra no lugar escolhido, mostra você (GPS, funciona sem internet) e a linha até o lugar. */
function Controles({ rl, L, selecionado, eu, centrarEm }) {
  const map = rl.useMap()
  useEffect(() => { if (selecionado?.latitude) map.flyTo([selecionado.latitude, selecionado.longitude], Math.max(map.getZoom(), 16), { duration: 0.6 }) }, [selecionado?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (centrarEm) map.flyTo([centrarEm.lat, centrarEm.lng], Math.max(map.getZoom(), 16), { duration: 0.6 }) }, [centrarEm]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!eu) return
    const camadas = [
      L.circle([eu.lat, eu.lng], { radius: Math.min(eu.precisao || 30, 300), color: '#2563eb', weight: 1, fillOpacity: 0.12, interactive: false }),
      L.circleMarker([eu.lat, eu.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1, interactive: false }),
    ]
    if (selecionado?.latitude) camadas.push(L.polyline([[eu.lat, eu.lng], [selecionado.latitude, selecionado.longitude]], { color: '#2563eb', weight: 3, dashArray: '6 8', interactive: false }))
    camadas.forEach(c => c.addTo(map))
    return () => camadas.forEach(c => c.remove())
  }, [eu, selecionado?.id, map, L]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}


function MapView({ businesses, onSelect, selecionado, eu, centrarEm }) {
  const [MapContainer, setMapContainer] = useState(null)
  const [rl, setRl] = useState(null)
  const [Marker, setMarkerComp] = useState(null)
  const [Popup, setPopup] = useState(null)
  const [L, setL] = useState(null)

  useEffect(() => {
    import('leaflet').then(leaflet => {
      import('leaflet/dist/leaflet.css')
      const L = leaflet.default
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      setL(L)
    })
    import('react-leaflet').then(rl => {
      setMapContainer(() => rl.MapContainer)
      setRl(rl)
      setMarkerComp(() => rl.Marker)
      setPopup(() => rl.Popup)
    })
  }, [])

  if (!MapContainer || !rl || !Marker || !Popup || !L) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-green-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Carregando mapa...</p>
        </div>
      </div>
    )
  }

  const createIcon = (b) => {
    const bg = categoria(b.category)?.tint || '#14532d'
    const svg = renderToStaticMarkup(<Icon name={iconeDe(b)} size={16} strokeWidth={2.2} />)
    return L.divIcon({
      html: `<div class="pino" style="background:${bg}">${svg}</div>`,
      className: '',
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -36],
    })
  }

  return (
    <MapContainer
      center={[-22.8686, -46.0422]}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <MapaBase rl={rl} L={L} />
      <Controles rl={rl} L={L} selecionado={selecionado} eu={eu} centrarEm={centrarEm} />
      {businesses.map(b => b.latitude && b.longitude ? (
        <Marker
          key={b.id}
          position={[b.latitude, b.longitude]}
          icon={createIcon(b)}
          eventHandlers={{ click: () => onSelect(b) }}
        />
      ) : null)}
    </MapContainer>
  )
}

function BottomSheet({ business, onClose, eu }) {
  const navigate = useNavigate()
  if (!business) return null

  return (
    <div className="absolute bottom-20 left-0 right-0 mx-5 bg-white rounded-[var(--raio)] shadow-2xl p-4 z-[1000]">
      <div className="flex items-start gap-3">
        {business.images?.[0] ? (
          <img src={business.images[0]} alt={business.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">
            <Icon name={iconeDe(business)} size={24} className="text-[var(--leve)]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-1">{business.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{nomeSub(business)}</p>
          <StatusPill st={business.st} className="mt-1" />
          {eu && business.latitude && <p className="mt-1 text-xs font-semibold text-[#2563eb]">{textoDist(distKm(eu, { lat: business.latitude, lng: business.longitude }))} de você (em linha reta)</p>}
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <button
              onClick={() => navigate(`/estabelecimento/${business.slug}`)}
              className="whitespace-nowrap py-2 rounded-xl text-xs font-semibold text-white"
              style={{ background: '#14532d' }}
            >
              Detalhes
            </button>
            <a href={linkRota(business)} target="_blank" rel="noopener noreferrer" onClick={() => registrar('rota', { businessId: business.id })}
              className="flex items-center justify-center gap-1 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700">
              <Navigation size={13} /> Rota
            </a>
            {business.whatsapp && (
              <a
                href={linkWhatsApp(business.whatsapp)} target="_blank" rel="noopener noreferrer"
                onClick={() => registrar('whatsapp', { businessId: business.id })}
                className="flex items-center justify-center gap-1 py-2 rounded-xl bg-green-500 text-white text-xs font-semibold"
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
            )}
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 shrink-0">
          <X size={14} className="text-gray-500" />
        </button>
      </div>
    </div>
  )
}

export function MapPage() {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const { businesses, loading } = useBusinesses({ category: selectedCategory || undefined })
  const [params] = useSearchParams()
  const lugar = params.get('lugar')
  const [eu, setEu] = useState(null)
  const [centrarEm, setCentrarEm] = useState(null)
  const [erroGps, setErroGps] = useState('')
  const [seguindo, setSeguindo] = useState(false)

  // Chegou de "Ver no mapa" de um lugar: abre já nele
  useEffect(() => {
    if (!lugar || selectedBusiness) return
    const b = businesses.find(x => x.slug === lugar)
    if (b) setSelectedBusiness(b)
  }, [lugar, businesses]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sua posição pelo GPS do celular (não precisa de internet). Só liga quando a pessoa toca no botão.
  useEffect(() => {
    if (!seguindo || !navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      p => { setErroGps(''); setEu({ lat: p.coords.latitude, lng: p.coords.longitude, precisao: p.coords.accuracy }) },
      () => setErroGps('Não consegui sua localização. Confira se o GPS está ligado e se o app pode usá-la.'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [seguindo])
  const ondeEstou = () => { if (eu) setCentrarEm({ ...eu }); setSeguindo(true) }
  useEffect(() => { if (seguindo && eu && !centrarEm) setCentrarEm({ ...eu }) }, [eu]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Layout title="Mapa" showBack={false} largura="largo">
      <div className="relative flex flex-col" style={{ height: 'calc(100dvh - 8rem)' }}>
        <div className="flex gap-2 px-5 py-2 overflow-x-auto scrollbar-hide absolute top-0 left-0 right-0 z-[999] bg-gradient-to-b from-white/80 to-transparent backdrop-blur-sm">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              !selectedCategory ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'
            }`}
            style={!selectedCategory ? { background: '#14532d' } : {}}
          >
            Todos
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                selectedCategory === cat.id ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'
              }`}
              style={selectedCategory === cat.id ? { background: cat.tint } : {}}
            >
              <Icon name={cat.icon} size={13} /> {cat.name}
            </button>
          ))}
        </div>

        <div className="flex-1 pt-12">
          <MapView businesses={businesses} onSelect={setSelectedBusiness} selecionado={selectedBusiness} eu={eu} centrarEm={centrarEm} />
        </div>

        {!loading && (
          <p className="absolute bottom-24 left-4 right-4 z-[998] rounded-xl bg-white/95 px-3 py-2 text-xs text-[var(--leve)] shadow">
            {businesses.filter(b => b.latitude).length} de {businesses.length} lugares já têm localização no mapa. Os outros estão sendo marcados.
          </p>
        )}
        <BotaoMapaOffline className="absolute right-4 top-14 z-[999]" />
        <button onClick={ondeEstou} aria-label="Onde estou" className="absolute right-4 top-28 z-[999] flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md">
          <LocateFixed size={20} className={eu ? 'text-[#2563eb]' : 'text-gray-700'} />
        </button>
        {erroGps && <p className="absolute left-4 right-20 top-28 z-[999] rounded-xl bg-white/95 px-3 py-2 text-xs shadow">{erroGps}</p>}
        <BottomSheet business={selectedBusiness} eu={eu} onClose={() => setSelectedBusiness(null)} />
      </div>
    </Layout>
  )
}
