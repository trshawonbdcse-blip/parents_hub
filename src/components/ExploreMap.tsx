import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LocateFixed, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useT } from '../lib/i18n'
import type { Category, Place } from '../types'
import { PlaceRow } from './PlaceRow'

// Marker colours per kind of place (hand-checked places are drawn bigger, with a ring).
const COLOR: Record<Category, string> = {
  playground: '#e07a2f',
  park: '#3f8f4f',
  museum: '#7a5cc2',
  'indoor-play': '#d6457a',
  library: '#c99a1a',
  swimming: '#2f7fc4',
  'zoo-farm': '#8a6a3a',
  beach: '#e0b13a',
  mall: '#6b7280',
  cafe: '#6b7280',
  theatre: '#b03a6a',
  class: '#136f63',
  'winter-fun': '#4aa3c7',
}

interface Props {
  places: Place[]
  center: { lat: number; lng: number }
  zoom: number
  months: number | null
  me: { lat: number; lng: number } | null
  onLocate: () => void
}

// Leaflet map with OpenStreetMap tiles; thousands of points are drawn on a canvas.
export default function ExploreMap({ places, center, zoom, months, me, onLocate }: Props) {
  const { t } = useT()
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const meMarker = useRef<L.CircleMarker | null>(null)
  const [selected, setSelected] = useState<Place | null>(null)

  useEffect(() => {
    if (!el.current || map.current) return
    map.current = L.map(el.current, { preferCanvas: true, zoomControl: false, attributionControl: true }).setView([center.lat, center.lng], zoom)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    return () => {
      map.current?.remove()
      map.current = null
    }
    // The map is created once; centre changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    map.current?.setView([center.lat, center.lng], zoom)
  }, [center.lat, center.lng, zoom])

  useEffect(() => {
    const group = layer.current
    if (!group) return
    group.clearLayers()
    // Community places first, so hand-checked ones are drawn on top.
    const sorted = [...places].sort((a, b) => Number(Boolean(b.osm)) - Number(Boolean(a.osm)))
    for (const p of sorted) {
      L.circleMarker([p.lat, p.lng], {
        radius: p.osm ? 5 : 8,
        color: p.osm ? '#ffffff' : '#1b2422',
        weight: p.osm ? 1 : 2,
        fillColor: COLOR[p.category],
        fillOpacity: 0.9,
      })
        .on('click', () => setSelected(p))
        .addTo(group)
    }
  }, [places])

  useEffect(() => {
    if (!map.current) return
    meMarker.current?.remove()
    if (me) {
      meMarker.current = L.circleMarker([me.lat, me.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#2f6fe0', fillOpacity: 1 }).addTo(map.current)
      map.current.setView([me.lat, me.lng], Math.max(map.current.getZoom(), 14))
    }
  }, [me])

  return (
    <div className="map-wrap">
      <div ref={el} className="map" />
      <button className="map-locate" onClick={onLocate} aria-label={t('Near me')}>
        <LocateFixed size={20} />
      </button>
      {selected && (
        <div className="map-card">
          <button className="map-card-close" onClick={() => setSelected(null)} aria-label={t('Close')}>
            <X size={16} />
          </button>
          <PlaceRow place={selected} months={months} />
        </div>
      )}
    </div>
  )
}
