import { LayoutGrid, List, Map as MapIcon, Search, SlidersHorizontal, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CityPicker } from '../components/CityPicker'
import { PlaceCard } from '../components/PlaceCard'
import { ALL, cityCoords, cityName, placesIn, useCity } from '../lib/city'
import { PlaceRow } from '../components/PlaceRow'
import { CATEGORY_ICON } from '../components/ui'
import { categoryLabel, distanceKm, fitsAge, fitsSeason, hasFreeParking, hasParking } from '../lib/places'
import { useChild } from '../lib/useChild'
import { useAllPlaces } from '../lib/osm'
import { acceptsStebby, useStebby } from '../lib/stebby'
import type { Category } from '../types'
import { useT } from '../lib/i18n'

type Coords = { lat: number; lng: number }

// Leaflet is only downloaded when the map is opened.
const ExploreMap = lazy(() => import('../components/ExploreMap'))

export function Explore() {
  const { t } = useT()
  const [params, setParams] = useSearchParams()
  const { months } = useChild()
  const [coords, setCoords] = useState<Coords | null>(null)
  const [locError, setLocError] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [city] = useCity()
  const all = useAllPlaces()
  const pool = useMemo(() => placesIn(city, all), [city, all])
  const [limit, setLimit] = useState(40)

  const q = params.get('q') ?? ''
  const setting = params.get('setting') ?? 'any'
  const free = params.get('free') === '1'
  const category = (params.get('cat') ?? 'any') as Category | 'any'
  const area = params.get('area') ?? 'any'
  const ageOnly = params.get('age') !== '0'
  const seasonOnly = params.get('season') !== '0'
  const sort = params.get('sort') ?? 'name'
  const parking = params.get('parking') ?? 'any'
  const mapView = params.get('view') === 'map'
  const stebbyOnly = params.get('stebby') === '1'
  const [hasStebby] = useStebby()

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
      () => setLocError(true),
      { maximumAge: 300000, timeout: 10000 },
    )
  }, [wantNear, coords])

  const areas = useMemo(() => [...new Set(pool.map((p) => p.area))].sort((a, b) => a.localeCompare(b, 'et')), [pool])
  const categories = useMemo(() => [...new Set(pool.map((p) => p.category))], [pool])
  const sheetFilters = [area !== 'any', parking !== 'any', !ageOnly, !seasonOnly].filter(Boolean).length

  const results = pool
    .filter((p) => {
      const text = `${p.name} ${p.nameLocal ?? ''} ${p.area} ${p.city} ${p.description}`.toLowerCase()
      if (q && !text.includes(q.toLowerCase())) return false
      if (setting === 'indoor' && p.setting === 'outdoor') return false
      if (setting === 'outdoor' && p.setting === 'indoor') return false
      if (free && !p.price.free) return false
      if (stebbyOnly && !acceptsStebby(p)) return false
      if (category !== 'any' && p.category !== category) return false
      if (area !== 'any' && areas.includes(area) && p.area !== area) return false
      if (ageOnly && !fitsAge(p, months)) return false
      if (seasonOnly && !fitsSeason(p)) return false
      if (parking === 'yes' && !hasParking(p)) return false
      if (parking === 'free' && !hasFreeParking(p)) return false
      if (parking === 'pargi' && !p.parkingInfo?.pargiSupported) return false
      return true
    })
    .map((p) => ({ p, d: coords ? distanceKm(coords.lat, coords.lng, p.lat, p.lng) : null }))
    .sort((a, b) => {
      if (wantNear && a.d !== null && b.d !== null) return a.d - b.d
      // Places with reviewed photos first, so the list leads with what parents can picture.
      const photo = Number(Boolean(b.p.photos?.length)) - Number(Boolean(a.p.photos?.length))
      // Hand-checked places before OpenStreetMap ones.
      const checked = Number(Boolean(a.p.osm)) - Number(Boolean(b.p.osm))
      return photo || checked || a.p.name.localeCompare(b.p.name)
    })

  const toggle = (key: string, on: boolean, value = '1') => update(key, on ? null : value)
  // With no search or filters, lead with photo cards of hand-checked places.
  const browsing = !q && category === 'any' && setting === 'any' && !free && !wantNear && !stebbyOnly && parking === 'any'
  const featured = browsing ? results.filter(({ p }) => p.photos?.length && !p.osm).slice(0, 10) : []
  const featuredIds = new Set(featured.map(({ p }) => p.id))
  const listed = results.filter(({ p }) => !featuredIds.has(p.id))

  return (
    <div className="page">
      <div className="sticky-top">
        <div className="title-row">
          <h1 className="page-title">{t('Explore')}</h1>
          <CityPicker />
        </div>
        <div className="search-row">
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              placeholder={city === ALL ? t('Search places in Estonia') : t('Search places in {city}', { city: cityName(city) })}
              value={q}
              onChange={(e) => update('q', e.target.value || null)}
            />
          </label>
          <button className="icon-button" onClick={() => setSheetOpen(true)} aria-label={t('More filters')}>
            <SlidersHorizontal size={20} />
            {sheetFilters > 0 && <span className="dot-count">{sheetFilters}</span>}
          </button>
        </div>

        <div className="chip-row" role="group" aria-label="Quick filters">
          {(hasStebby || stebbyOnly) && (
            <button className={`chip ${stebbyOnly ? 'on' : ''}`} onClick={() => toggle('stebby', stebbyOnly)}>
              Stebby
            </button>
          )}
          <button className={`chip ${free ? 'on' : ''}`} onClick={() => toggle('free', free)}>
            {t('Free')}
          </button>
          <button className={`chip ${setting === 'indoor' ? 'on' : ''}`} onClick={() => update('setting', setting === 'indoor' ? null : 'indoor')}>
            {t('Indoor')}
          </button>
          <button className={`chip ${setting === 'outdoor' ? 'on' : ''}`} onClick={() => update('setting', setting === 'outdoor' ? null : 'outdoor')}>
            {t('Outdoor')}
          </button>
          <button className={`chip ${wantNear ? 'on' : ''}`} onClick={() => update('sort', wantNear ? null : 'near')}>
            {t('Near me')}
          </button>
          <button className={`chip ${parking === 'free' ? 'on' : ''}`} onClick={() => update('parking', parking === 'free' ? null : 'free')}>
            {t('Free parking')}
          </button>
        </div>
      </div>

      <div className="category-row" role="group" aria-label="Type of place">
        <button className={`category ${category === 'any' ? 'on' : ''}`} onClick={() => update('cat', null)}>
          <span className="category-icon">
            <LayoutGrid size={20} />
          </span>
          {t('All')}
        </button>
        {categories.map((c) => {
          const Icon = CATEGORY_ICON[c]
          return (
            <button key={c} className={`category ${category === c ? 'on' : ''}`} onClick={() => update('cat', category === c ? null : c)}>
              <span className="category-icon">
                <Icon size={20} />
              </span>
              {categoryLabel(c)}
            </button>
          )
        })}
      </div>

      <div className="view-row">
        <p className="result-count">
          {t(results.length === 1 ? '{n} place' : '{n} places', { n: results.length })}
          {locError && wantNear && !coords ? ` · ${t('Location not available — sorted by name.')}` : ''}
        </p>
        <div className="segmented small" role="tablist" aria-label={t('View')}>
          <button className={mapView ? '' : 'on'} onClick={() => update('view', null)} aria-label={t('List')}>
            <List size={16} /> {t('List')}
          </button>
          <button className={mapView ? 'on' : ''} onClick={() => update('view', 'map')} aria-label={t('Map')}>
            <MapIcon size={16} /> {t('Map')}
          </button>
        </div>
      </div>

      {mapView ? (
        <Suspense fallback={<div className="map-wrap loading">{t('Loading…')}</div>}>
          <ExploreMap
            places={results.map((r) => r.p)}
            center={coords ?? cityCoords(city)}
            zoom={coords ? 14 : city === ALL ? 7 : 12}
            months={months}
            me={coords}
            onLocate={() => update('sort', 'near')}
          />
        </Suspense>
      ) : (
        <>
          {featured.length > 0 && (
            <section>
              <h2 className="list-head">{t('Featured')}</h2>
              <div className="carousel">
                {featured.map(({ p, d }) => (
                  <PlaceCard key={p.id} place={p} months={months} distance={d} variant="narrow" />
                ))}
              </div>
            </section>
          )}
          {featured.length > 0 && <h2 className="list-head">{t('All places')}</h2>}
          <div className="row-list">
            {listed.slice(0, limit).map(({ p, d }) => (
              <PlaceRow key={p.id} place={p} months={months} distance={d} />
            ))}
          </div>
          {listed.length > limit && (
            <button className="button secondary wide-button" onClick={() => setLimit(limit + 60)}>
              {t('Show more ({n} left)', { n: listed.length - limit })}
            </button>
          )}
        </>
      )}
      {results.some(({ p }) => p.osm) && <p className="footnote">{t('Includes places from OpenStreetMap (© OpenStreetMap contributors), not checked by us.')}</p>}
      {!results.length && (
        <div className="empty">
          <p>{t('No places match these filters.')}</p>
          <button className="button secondary" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
            {t('Clear all filters')}
          </button>
        </div>
      )}

      {sheetOpen && (
        <div className="sheet-backdrop" onClick={() => setSheetOpen(false)}>
          <div className="sheet" role="dialog" aria-label={t('Filters')} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h2>{t('Filters')}</h2>
              <button className="icon-button plain" onClick={() => setSheetOpen(false)} aria-label={t('Close')}>
                <X size={20} />
              </button>
            </div>

            <div className="field">
              <span className="field-label">{t('Area')}</span>
              <select value={area} onChange={(e) => update('area', e.target.value === 'any' ? null : e.target.value)}>
                <option value="any">{t('All areas')}</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <span className="field-label">{t('Parking')}</span>
              <div className="segmented">
                {(
                  [
                    ['any', 'Any'],
                    ['yes', 'Has parking'],
                    ['free', 'Free'],
                    ['pargi', 'Pargi.ee'],
                  ] as const
                ).map(([v, label]) => (
                  <button key={v} className={parking === v ? 'on' : ''} onClick={() => update('parking', v === 'any' ? null : v)}>
                    {t(label)}
                  </button>
                ))}
              </div>
            </div>

            {months !== null && (
              <label className="switch-row">
                <span>{t('Only places for my child\'s age')}</span>
                <input type="checkbox" role="switch" checked={ageOnly} onChange={() => update('age', ageOnly ? '0' : null)} />
              </label>
            )}
            <label className="switch-row">
              <span>{t('Only places open this season')}</span>
              <input type="checkbox" role="switch" checked={seasonOnly} onChange={() => update('season', seasonOnly ? '0' : null)} />
            </label>

            <div className="sheet-actions">
              <button
                className="button secondary"
                onClick={() => {
                  const next = new URLSearchParams(params)
                  ;['area', 'parking', 'age', 'season'].forEach((k) => next.delete(k))
                  setParams(next, { replace: true })
                }}
              >
                {t('Reset')}
              </button>
              <button className="button primary" onClick={() => setSheetOpen(false)}>
                {t('Show {n} places', { n: results.length })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
