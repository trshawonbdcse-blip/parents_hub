import { Baby, CalendarDays, ChevronRight, CloudRain, CloudSun, Sparkles, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CityPicker } from '../components/CityPicker'
import { MilestoneNudge, WeekendPlan, useWeeklyProgress } from '../components/Engage'
import { PlaceRow } from '../components/PlaceRow'
import { cityCoords, placesIn, useCity } from '../lib/city'
import { eventInCity, events } from '../lib/events'
import { translate as tr, useT } from '../lib/i18n'
import { categoryLabel, formatAge, isSummer, priceShort, todaysPicks } from '../lib/places'
import { KEYS, useIdList, useStored } from '../lib/storage'
import { useChild } from '../lib/useChild'
import { useWeather, type OutdoorMode } from '../lib/weather'
import { useAgo } from '../lib/useAgo'
import { useMode } from '../lib/mode'
import { ModeSwitch } from '../components/ModeSwitch'
import { TodayMe } from './TodayMe'
import { TodayVisit } from './TodayVisit'
import type { Place, Visit } from '../types'

const NO_VISITS: Visit[] = []

const durationShort = (m: number) => (m >= 60 ? tr('{n} h', { n: Math.round((m / 60) * 2) / 2 }) : tr('{n} min', { n: m }))

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

// Why this place is a good idea right now, in a few short phrases.
function reasonsFor(p: Place, mode: OutdoorMode, napStart: string, favourite: boolean): string[] {
  const out: string[] = []
  if (mode === 'indoor' && p.setting !== 'outdoor') out.push(tr('Indoors — right for today’s weather'))
  else if (mode === 'outdoor' && p.setting !== 'indoor') out.push(tr('Good weather to be outside'))
  else if (mode === 'mixed' && p.setting !== 'outdoor') out.push(tr('Warm inside on a chilly day'))
  if (napStart) {
    const now = new Date()
    const left = minutesOf(napStart) - (now.getHours() * 60 + now.getMinutes())
    if (left > p.durationMinutes + 45) out.push(tr('Back before nap time'))
  }
  if (favourite) out.push(tr('One of your favourites'))
  if (p.price.free) out.push(tr('Free'))
  return out.slice(0, 3)
}

export function Today() {
  const [appMode] = useMode()
  return appMode === 'me' ? <TodayMe /> : appMode === 'visit' ? <TodayVisit /> : <TodayFamily />
}

function TodayFamily() {
  const { t, locale } = useT()
  const { months, name, napStart } = useChild()
  const [city] = useCity()
  const here = cityCoords(city)
  const { weather } = useWeather(here.lat, here.lng)
  const favorites = useIdList(KEYS.favorites)
  const [visits] = useStored<Visit[]>(KEYS.visits, NO_VISITS)
  const { done, goal } = useWeeklyProgress()
  const ago = useAgo()
  const firstName = name.trim().split(/\s+/)[0] ?? ''

  const twoWeeksAgo = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10)
  const visitedRecently = new Set(visits.filter((v) => v.date >= twoWeeksAgo).map((v) => v.placeId))
  const picks = todaysPicks({ months, weather, visitedRecently, favorites: new Set(favorites.ids), count: 3, pool: placesIn(city) })
  const mode: OutdoorMode = weather?.mode ?? (isSummer() ? 'outdoor' : 'indoor')
  const [best, ...more] = picks
  const price = best ? priceShort(best, months).split(' · ') : []
  const reasons = best ? reasonsFor(best, mode, napStart, favorites.has(best.id)) : []
  const dow = new Date().getDay()
  const weekend = [4, 5, 6].includes(dow)
  const now = Date.now()
  const upcoming = events
    .filter((e) => new Date(e.end ?? e.start).getTime() + (e.allDay ? 864e5 : 0) >= now)
    .filter((e) => eventInCity(e, city))
    .slice(0, 3)
  const WeatherIcon = mode === 'indoor' ? CloudRain : mode === 'mixed' ? CloudSun : Sun

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
        <h1>{firstName ? t('What shall we do today with {name}?', { name: firstName }) : t('What shall we do today?')}</h1>
        <div className="chip-line">
          {weather && (
            <span className="chip-static" title={`${t(weather.label)} · ${ago(weather.updatedAt)}`}>
              <WeatherIcon size={16} aria-hidden="true" /> {weather.temperature}°{weather.rainFrom ? ` · ${t('Rain soon')}` : ''}
            </span>
          )}
          {months !== null ? (
            <span className="chip-static">
              <Baby size={16} aria-hidden="true" /> {formatAge(months)}
            </span>
          ) : (
            <Link to="/me?tab=family" className="inline-cta">
              {t("Add your child's age for better ideas")} <ChevronRight size={16} />
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
              <Sparkles size={13} aria-hidden="true" /> {t('Best idea right now')}
            </span>
            <div className="hero-line">
              <span className="hero-square">{durationShort(best.durationMinutes)}</span>
              <div className="hero-stack">
                <span className="hero-name">{best.name}</span>
                <small className="hero-sub">
                  {categoryLabel(best.category)} · {best.area}
                </small>
              </div>
              <span className="hero-value">
                {price[0]}
                {price.length > 1 && <small>{price.slice(1).join(' · ')}</small>}
              </span>
            </div>
            {reasons.length > 0 && (
              <ul className="hero-chips">
                {reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </Link>
          {more.length > 0 && (
            <>
              <h2 className="list-head">{t('Or try')}</h2>
              <div className="row-list">
                {more.map((p) => (
                  <PlaceRow key={p.id} place={p} months={months} />
                ))}
              </div>
            </>
          )}
          <Link to="/explore" className="link-more">
            {t('See all places')} <ChevronRight size={16} />
          </Link>
        </section>
      ) : (
        <section className="hero">
          <span className="hero-badge">{t('Best idea right now')}</span>
          <p className="hero-title">{t('No ideas for this town yet')}</p>
          <p className="hero-sub">{t('Try another town or look through all places.')}</p>
          <Link to="/explore" className="hero-action">
            {t('Explore places')} <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </section>
      )}

      {weekend ? (
        <WeekendPlan exclude={picks.map((p) => p.id)} />
      ) : (
        upcoming.length > 0 && (
          <section>
            <div className="section-head">
              <h2 className="with-icon">
                <CalendarDays size={20} /> {t('Coming up')}
              </h2>
              <Link to="/events" className="link-more">
                {t('All events')} <ChevronRight size={16} />
              </Link>
            </div>
            <ul className="list-card">
              {upcoming.map((e) => (
                <li key={e.id}>
                  <Link to={`/event/${encodeURIComponent(e.id)}`} className="row">
                    <span className="date-badge">
                      <small>{new Date(e.start).toLocaleDateString(locale, { weekday: 'short', timeZone: 'Europe/Tallinn' })}</small>
                      <strong>{new Date(e.start).toLocaleDateString(locale, { day: 'numeric', timeZone: 'Europe/Tallinn' })}</strong>
                    </span>
                    <span className="row-text">
                      <strong>{e.title}</strong>
                      <small>{e.venue ?? e.source}</small>
                    </span>
                    <ChevronRight size={18} className="muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      )}

      <MilestoneNudge />
    </div>
  )
}
