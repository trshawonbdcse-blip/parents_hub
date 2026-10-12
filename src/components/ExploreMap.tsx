import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@maplibre/maplibre-gl-leaflet'
import { setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre looks for its worker next to its own file, which bundling moves; point it at the copied file.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { LocateFixed, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useT } from '../lib/i18n'
import type { Place } from '../types'
import { PlaceRow } from './PlaceRow'

// Theme colours, read once from the CSS tokens. Hand-checked places are bigger and darker
// (with a yellow ring), so the difference never depends on colour alone.
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

interface Props {
  places: Place[]
  center: { lat: number; lng: number }
  zoom: number
  months: number | null
  me: { lat: number; lng: number } | null
  onLocate: () => void
}

// Base map: OpenFreeMap vector tiles (free, no key, no usage limit, made for apps like this).
// Phones without WebGL fall back to plain OpenStreetMap images.
const STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'

setWorkerUrl(workerUrl)

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function baseLayer(): L.Layer {
  if (hasWebGL()) return L.maplibreGL({ style: STYLE, attributionControl: { customAttribution: ATTRIBUTION } })
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
}

// Leaflet map; thousands of points are drawn on a canvas above the base map.
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
    baseLayer().addTo(map.current)
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
    const [primary, deep, accent, surface] = ['--primary', '--deep', '--accent', '--surface'].map(token)
    for (const p of sorted) {
      L.circleMarker([p.lat, p.lng], {
        radius: p.osm ? 5 : 8,
        color: p.osm ? surface : accent,
        weight: p.osm ? 1 : 3,
        fillColor: p.osm ? primary : deep,
        fillOpacity: p.osm ? 0.85 : 1,
      })
        .on('click', () => setSelected(p))
        .addTo(group)
    }
  }, [places])

  useEffect(() => {
    if (!map.current) return
    meMarker.current?.remove()
    if (me) {
      meMarker.current = L.circleMarker([me.lat, me.lng], { radius: 9, color: token('--surface'), weight: 3, fillColor: token('--info'), fillOpacity: 1 }).addTo(map.current)
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
