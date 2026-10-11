import { CalendarDays, ChevronRight, CloudRain, CloudSun, Sun, Umbrella } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CityPicker } from '../components/CityPicker'
import { MilestoneNudge, WeekendPlan, useWeeklyProgress } from '../components/Engage'
import { PlaceRow } from '../components/PlaceRow'
import { PlaceImage } from '../components/ui'
import { cityCoords, placesIn, useCity } from '../lib/city'
import { eventInCity, events } from '../lib/events'
import { translate as tr, useT } from '../lib/i18n'
import { categoryLabel, fitsAge, formatAge, isSummer, priceShort, todaysPicks } from '../lib/places'
import { KEYS, useIdList, useStored } from '../lib/storage'
import { useChild } from '../lib/useChild'
import { useWeather, type OutdoorMode } from '../lib/weather'
import type { Place, Visit } from '../types'

const NO_VISITS: Visit[] = []

function greeting(hour: number) {
  if (hour < 12) return tr('Good morning')
  if (hour < 18) return tr('Good afternoon')
  return tr('Good evening')
}

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

// Why this place is a good idea right now, in a few short phrases.
function reasonsFor(p: Place, mode: OutdoorMode, months: number | null, napStart: string, favourite: boolean): string[] {
  const out: string[] = []
  if (mode === 'indoor' && p.setting !== 'outdoor') out.push(tr('Indoors — right for today’s weather'))
  else if (mode === 'outdoor' && p.setting !== 'indoor') out.push(tr('Good weather to be outside'))
  else if (mode === 'mixed' && p.setting !== 'outdoor') out.push(tr('Warm inside on a chilly day'))
  if (napStart) {
    const now = new Date()
    const left = minutesOf(napStart) - (now.getHours() * 60 + now.getMinutes())
    if (left > p.durationMinutes + 45) out.push(tr('Back before nap time'))
  }
  if (months !== null && fitsAge(p, months)) out.push(tr('Right for {age}', { age: formatAge(months) }))
  if (favourite) out.push(tr('One of your favourites'))
  if (p.price.free) out.push(tr('Free'))
  return out.slice(0, 3)
}

export function Today() {
  const { t, locale } = useT()
  const { months, name, napStart } = useChild()
  const [city] = useCity()
  const here = cityCoords(city)
  const { weather, error } = useWeather(here.lat, here.lng)
  const favorites = useIdList(KEYS.favorites)
  const [visits] = useStored<Visit[]>(KEYS.visits, NO_VISITS)
  const { done, goal } = useWeeklyProgress()

  const twoWeeksAgo = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10)
  const visitedRecently = new Set(visits.filter((v) => v.date >= twoWeeksAgo).map((v) => v.placeId))
  const picks = todaysPicks({ months, weather, visitedRecently, favorites: new Set(favorites.ids), count: 3, pool: placesIn(city) })
  const mode: OutdoorMode = weather?.mode ?? (isSummer() ? 'outdoor' : 'indoor')
  const [best, ...more] = picks
  const reasons = best ? reasonsFor(best, mode, months, napStart, favorites.has(best.id)) : []
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
          <p className="muted">{greeting(new Date().getHours())}</p>
          <CityPicker />
        </div>
        <h1>{name ? t('What shall we do today with {name}?', { name }) : t('What shall we do today?')}</h1>
        <div className="chip-line">
          {months !== null ? (
            <span className="chip-static">{t('Ideas for {age}', { age: formatAge(months) })}</span>
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

      <div className={`weather-strip ${mode}`}>
        <WeatherIcon size={20} />
        {weather ? (
          <span>
            <strong>
              {weather.temperature}° {t(weather.label)}
            </strong>{' '}
            · {t(weather.advice)}
            {weather.rainFrom && (
              <small className="with-icon">
                <Umbrella size={12} /> {t('Rain likely from {time}', { time: weather.rainFrom })}
              </small>
            )}
          </span>
        ) : (
          <span>{error ? t('Weather unavailable right now') : t('Checking the weather…')}</span>
        )}
      </div>

      {best && (
        <section className="best-pick">
          <p className="overline">{t('Best idea right now')}</p>
          <Link to={`/place/${best.id}`} className="best-card">
            <div className="best-media">
              <PlaceImage photo={best.photos?.[0]} category={best.category} />
            </div>
            <div className="best-body">
              <small className="muted">
                {categoryLabel(best.category)} · {best.area}
              </small>
              <h2>{best.name}</h2>
              <p className="best-price">{priceShort(best, months)}</p>
              {reasons.length > 0 && (
                <ul className="reasons">
                  {reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          </Link>
          {more.length > 0 && (
            <>
              <p className="overline">{t('Or try')}</p>
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
