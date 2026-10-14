import { ChevronRight, CloudRain, CloudSun, Music, Sparkles, Sun, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CityPicker } from '../components/CityPicker'
import { useWeeklyProgress } from '../components/Engage'
import { ModeSwitch } from '../components/ModeSwitch'
import { PlaceRow } from '../components/PlaceRow'
import { cityCoords, placesIn, useCity } from '../lib/city'
import { translate as tr, useT } from '../lib/i18n'
import { forMode, meCategoryLabel } from '../lib/mode'
import { isSummer, priceAdultShort, todaysPicks } from '../lib/places'
import { useAllPlaces } from '../lib/osm'
import { acceptsStebby, useStebby } from '../lib/stebby'
import { KEYS, useIdList, useStored } from '../lib/storage'
import { useWeather, type OutdoorMode } from '../lib/weather'
import type { Place, Visit } from '../types'
import { kindLabel, upcomingAdult, useAdultEvents } from '../lib/adultEvents'

const NO_VISITS: Visit[] = []
const durationShort = (m: number) => (m >= 60 ? tr('{n} h', { n: Math.round((m / 60) * 2) / 2 }) : tr('{n} min', { n: m }))

function reasonsFor(p: Place, mode: OutdoorMode, favourite: boolean, stebby: boolean): string[] {
  const out: string[] = []
  if (mode === 'indoor' && p.setting !== 'outdoor') out.push(tr('Indoors — right for today’s weather'))
  else if (mode === 'outdoor' && p.setting !== 'indoor') out.push(tr('Good weather to be outside'))
  else if (mode === 'mixed' && p.setting !== 'outdoor') out.push(tr('Warm inside on a chilly day'))
  if (stebby) out.push(tr('Pay with Stebby'))
  if (favourite) out.push(tr('One of your favourites'))
  if (p.price.free) out.push(tr('Free'))
  return out.slice(0, 3)
}

// Today in "Just me" mode: one idea for an adult right now, more ideas, and an outdoor plan.
export function TodayMe() {
  const { t, locale } = useT()
  const [city] = useCity()
  const here = cityCoords(city)
  const { weather } = useWeather(here.lat, here.lng)
  const favorites = useIdList(KEYS.favorites)
  const [visits] = useStored<Visit[]>(KEYS.visits, NO_VISITS)
  const [hasStebby, setStebby] = useStebby()
  const { list: adultEvents } = useAdultEvents()
  const tallinnDay = (d: Date | string) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Europe/Tallinn' })
  const tonight = upcomingAdult(adultEvents, city, 1).filter((e) => !e.allDay && tallinnDay(e.start) === tallinnDay(new Date())).slice(0, 3)
  const { done, goal } = useWeeklyProgress()
  const all = useAllPlaces()
  const pool = forMode('me', placesIn(city, all))

  const twoWeeksAgo = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10)
  const visitedRecently = new Set(visits.filter((v) => v.date >= twoWeeksAgo).map((v) => v.placeId))
  const opts = { months: null, weather, visitedRecently, favorites: new Set(favorites.ids) }
  const picks = todaysPicks({ ...opts, count: 4, pool })
  const mode: OutdoorMode = weather?.mode ?? (isSummer() ? 'outdoor' : 'indoor')
  const [best, ...more] = picks
  const stebby = (p: Place) => hasStebby && acceptsStebby(p)
  const outdoor = mode === 'indoor' ? [] : todaysPicks({ ...opts, weather: null, count: 2, pool: pool.filter((p) => p.category === 'nature' && !picks.includes(p)) })
  const WeatherIcon = mode === 'indoor' ? CloudRain : mode === 'mixed' ? CloudSun : Sun
  const price = best ? priceAdultShort(best) : ''

  return (
    <div className="page today">
      <header className="hero-header">
        <div className="hero-top">
          <span className="brand" aria-label="Kuhu Minna">
            kuhu minna
          </span>
          <CityPicker />
        </div>
        <ModeSwitch />
        <h1>{t('What shall I do today?')}</h1>
        <div className="chip-line">
          {weather && (
            <span className="chip-static">
              <WeatherIcon size={16} aria-hidden="true" /> {weather.temperature}°{weather.rainFrom ? ` · ${t('Rain soon')}` : ''}
            </span>
          )}
          {hasStebby && (
            <Link to="/explore?stebby=1" className="chip-static stebby-chip">
              <Wallet size={16} aria-hidden="true" /> Stebby
            </Link>
          )}
          <Link to="/me?tab=moments" className="goal-chip" aria-label={t('This week')}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <circle cx="9" cy="9" r="7" className="goal-track" />
              <circle cx="9" cy="9" r="7" className="goal-fill" strokeDasharray={`${44 * Math.min(1, done / goal)} 44`} transform="rotate(-90 9 9)" />
            </svg>
            {t('{done}/{goal} this week', { done: Math.min(done, goal), goal })}
          </Link>
        </div>
      </header>

      {best ? (
        <section className="best-pick">
          <Link to={`/place/${best.id}`} className="hero best-card">
            <span className="hero-badge">
              <Sparkles size={13} aria-hidden="true" /> {t('Best for you right now')}
            </span>
            <div className="hero-line">
              <span className="hero-square">{durationShort(best.durationMinutes)}</span>
              <div className="hero-stack">
                <span className="hero-name">{best.name}</span>
                <small className="hero-sub">
                  {meCategoryLabel(best.category)} · {best.area}
                </small>
              </div>
              <span className="hero-value">{price}</span>
            </div>
            <ul className="hero-chips">
              {reasonsFor(best, mode, favorites.has(best.id), stebby(best)).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Link>
          {more.length > 0 && (
            <>
              <h2 className="list-head">{t('Also good now')}</h2>
              <div className="row-list">
                {more.map((p) => (
                  <PlaceRow key={p.id} place={p} months={null} />
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="hero">
          <span className="hero-badge">{t('Best for you right now')}</span>
          <p className="hero-title">{t('No ideas for this town yet')}</p>
          <p className="hero-sub">{t('Try another town or look through all places.')}</p>
          <Link to="/explore" className="hero-action">
            {t('Explore places')} <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </section>
      )}

      {tonight.length > 0 && (
        <section>
          <h2 className="list-head">{t('Tonight')}</h2>
          <ul className="list-card">
            {tonight.map((e) => (
              <li key={e.id}>
                <Link className="event-row" to={`/event/${encodeURIComponent(e.id)}`}>
                  <span className="event-time">{new Date(e.start).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Tallinn' })}</span>
                  <span className="row-text">
                    <strong>{e.title}</strong>
                    <small>{[t(kindLabel(e.kind)), e.venue].filter(Boolean).join(' · ')}</small>
                  </span>
                  <ChevronRight size={18} className="muted" />
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/events" className="link-more">
            <Music size={16} aria-hidden="true" /> {t('All concerts and shows')} <ChevronRight size={16} />
          </Link>
        </section>
      )}

      {outdoor.length > 0 && (
        <section>
          <h2 className="list-head">{t('Outdoors this week')}</h2>
          <div className="row-list">
            {outdoor.map((p) => (
              <PlaceRow key={p.id} place={p} months={null} />
            ))}
          </div>
        </section>
      )}

      {hasStebby ? (
        <Link to="/explore?stebby=1" className="nudge">
          <span className="activity-icon">
            <Wallet size={20} />
          </span>
          <span>
            <strong>{t('Use your Stebby budget')}</strong>
            <small>{t('Places near you that take Stebby')}</small>
          </span>
          <ChevronRight size={18} />
        </Link>
      ) : (
        <button type="button" className="nudge" onClick={() => setStebby(true)}>
          <span className="activity-icon">
            <Wallet size={20} />
          </span>
          <span>
            <strong>{t('Have Stebby from work?')}</strong>
            <small>{t('Tap to mark places where you can pay with it')}</small>
          </span>
          <ChevronRight size={18} />
        </button>
      )}

      <Link to="/explore" className="link-more">
        {t('See all places')} <ChevronRight size={16} />
      </Link>
    </div>
  )
}
