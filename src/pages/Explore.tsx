import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PlaceCard } from '../components/PlaceCard'
import { CATEGORY_LABEL, distanceKm, fitsAge, fitsSeason, places } from '../lib/places'
import { useChild } from '../lib/useChild'
import type { Category } from '../types'

type Coords = { lat: number; lng: number }

export function Explore() {
  const [params, setParams] = useSearchParams()
  const { months } = useChild()
  const [coords, setCoords] = useState<Coords | null>(null)
  const [locError, setLocError] = useState<string | null>(null)

  const q = params.get('q') ?? ''
  const setting = params.get('setting') ?? 'any'
  const free = params.get('free') === '1'
  const category = (params.get('cat') ?? 'any') as Category | 'any'
  const area = params.get('area') ?? 'any'
  const ageOnly = params.get('age') !== '0'
  const seasonOnly = params.get('season') !== '0'
  const sort = params.get('sort') ?? 'name'

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value === null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const wantNear = sort === 'near'
  useEffect(() => {
    if (!wantNear || coords) return
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocError('Location not available — showing by name.'),
      { maximumAge: 300000, timeout: 10000 },
    )
  }, [wantNear, coords])

  const areas = useMemo(() => [...new Set(places.map((p) => p.area))].sort(), [])
  const categories = useMemo(() => [...new Set(places.map((p) => p.category))], [])

  const results = places
    .filter((p) => {
      const text = `${p.name} ${p.nameLocal ?? ''} ${p.area} ${p.description}`.toLowerCase()
      if (q && !text.includes(q.toLowerCase())) return false
      if (setting === 'indoor' && p.setting === 'outdoor') return false
      if (setting === 'outdoor' && p.setting === 'indoor') return false
      if (free && !p.price.free) return false
      if (category !== 'any' && p.category !== category) return false
      if (area !== 'any' && p.area !== area) return false
      if (ageOnly && !fitsAge(p, months)) return false
      if (seasonOnly && !fitsSeason(p)) return false
      return true
    })
    .map((p) => ({ p, d: coords ? distanceKm(coords.lat, coords.lng, p.lat, p.lng) : null }))
    .sort((a, b) => (wantNear && a.d !== null && b.d !== null ? a.d - b.d : a.p.name.localeCompare(b.p.name)))

  return (
    <div className="page">
      <header className="page-header">
        <h1>Explore</h1>
        <input
          type="search"
          className="search"
          placeholder="Search places…"
          value={q}
          onChange={(e) => update('q', e.target.value || null)}
        />
      </header>

      <div className="chips" role="group" aria-label="Filters">
        {(['any', 'indoor', 'outdoor'] as const).map((s) => (
          <button
            key={s}
            className={`chip ${setting === s ? 'on' : ''}`}
            onClick={() => update('setting', s === 'any' ? null : s)}
          >
            {s === 'any' ? 'All' : s === 'indoor' ? '🏠 Indoor' : '🌤️ Outdoor'}
          </button>
        ))}
        <button className={`chip ${free ? 'on' : ''}`} onClick={() => update('free', free ? null : '1')}>
          🆓 Free
        </button>
        <button className={`chip ${wantNear ? 'on' : ''}`} onClick={() => update('sort', wantNear ? null : 'near')}>
          📍 Near me
        </button>
      </div>

      <div className="filter-row">
        <select value={category} onChange={(e) => update('cat', e.target.value === 'any' ? null : e.target.value)}>
          <option value="any">All types</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c].emoji} {CATEGORY_LABEL[c].label}
            </option>
          ))}
        </select>
        <select value={area} onChange={(e) => update('area', e.target.value === 'any' ? null : e.target.value)}>
          <option value="any">All areas</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="toggles small">
        {months !== null && (
          <label>
            <input type="checkbox" checked={ageOnly} onChange={() => update('age', ageOnly ? '0' : null)} /> Right
            age only
          </label>
        )}
        <label>
          <input type="checkbox" checked={seasonOnly} onChange={() => update('season', seasonOnly ? '0' : null)} />{' '}
          Open this season
        </label>
      </div>

      {(locError || !('geolocation' in navigator)) && wantNear && !coords && <p className="small muted">{locError ?? 'Location not available — showing by name.'}</p>}
      <p className="small muted">{results.length} places</p>

      <div className="stack">
        {results.map(({ p, d }) => (
          <PlaceCard key={p.id} place={p} months={months} distance={d} />
        ))}
      </div>
      {!results.length && <p className="muted">Nothing matches. Try removing a filter.</p>}
    </div>
  )
}
