import { Check, ChevronDown, LocateFixed, MapPin, X } from 'lucide-react'
import { useState } from 'react'
import { ALL, CITIES, cityName, nearestCity, useCity } from '../lib/city'
import { useT } from '../lib/i18n'

// "📍 Tallinn ▾" button that opens a sheet for choosing the town.
export function CityPicker() {
  const { t } = useT()
  const [city, setCity] = useCity()
  const [open, setOpen] = useState(false)
  const [locating, setLocating] = useState(false)

  const choose = (c: string) => {
    setCity(c)
    setOpen(false)
  }

  const locate = () => {
    if (!('geolocation' in navigator)) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        choose(nearestCity(pos.coords.latitude, pos.coords.longitude))
      },
      () => setLocating(false),
      { maximumAge: 600000, timeout: 10000 },
    )
  }

  return (
    <>
      <button className="city-button" onClick={() => setOpen(true)} aria-label={t('Choose a town')}>
        <MapPin size={16} />
        <span>{city === ALL ? t('All of Estonia') : cityName(city)}</span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet" role="dialog" aria-label={t('Choose a town')} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h2>{t('Choose a town')}</h2>
              <button className="icon-button plain" onClick={() => setOpen(false)} aria-label={t('Close')}>
                <X size={20} />
              </button>
            </div>
            <button className="button secondary" onClick={locate} disabled={locating}>
              <LocateFixed size={18} /> {locating ? t('Finding you…') : t('Use my location')}
            </button>
            <ul className="city-list">
              {[{ name: ALL, count: CITIES.reduce((n, c) => n + c.count, 0) }, ...CITIES].map((c) => (
                <li key={c.name}>
                  <button className={city === c.name ? 'on' : ''} onClick={() => choose(c.name)}>
                    <span>{c.name === ALL ? t('All of Estonia') : cityName(c.name)}</span>
                    <small>{t(c.count === 1 ? '{n} place' : '{n} places', { n: c.count })}</small>
                    {city === c.name && <Check size={18} />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
