import { LayoutGrid, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PlaceCard } from '../components/PlaceCard'
import { CATEGORY_ICON } from '../components/ui'
import { categoryLabel, distanceKm, fitsAge, fitsSeason, hasFreeParking, hasParking, places } from '../lib/places'
import { useChild } from '../lib/useChild'
import type { Category } from '../types'
import { useT } from '../lib/i18n'

type Coords = { lat: number; lng: number }

export function Explore() {
  const { t } = useT()
  const [params, setParams] = useSearchParams()
  const { months } = useChild()
  const [coords, setCoords] = useState<Coords | null>(null)
  const [locError, setLocError] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const q = params.get('q') ?? ''
  const setting = params.get('setting') ?? 'any'
  const free = params.get('free') === '1'
  const category = (params.get('cat') ?? 'any') as Category | 'any'
  const area = params.get('area') ?? 'any'
  const ageOnly = params.get('age') !== '0'
  const seasonOnly = params.get('season') !== '0'
  const sort = params.get('sort') ?? 'name'
  const parking = params.get('parking') ?? 'any'

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

  const areas = useMemo(() => [...new Set(places.map((p) => p.area))].sort(), [])
  const categories = useMemo(() => [...new Set(places.map((p) => p.category))], [])
  const sheetFilters = [area !== 'any', parking !== 'any', !ageOnly, !seasonOnly].filter(Boolean).length

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
      return photo || a.p.name.localeCompare(b.p.name)
    })

  const toggle = (key: string, on: boolean, value = '1') => update(key, on ? null : value)

  return (
    <div className="page">
      <div className="sticky-top">
        <h1 className="page-title">{t('Explore')}</h1>
        <div className="search-row">
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              placeholder={t('Search places in Tallinn')}
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

      <p className="result-count">
        {t(results.length === 1 ? '{n} place' : '{n} places', { n: results.length })}
        {locError && wantNear && !coords ? ` · ${t('Location not available — sorted by name.')}` : ''}
      </p>

      <div className="card-grid">
        {results.map(({ p, d }) => (
          <PlaceCard key={p.id} place={p} months={months} distance={d} />
        ))}
      </div>
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
