import { ChevronRight, CloudRain, CloudSun, Home as HomeIcon, MapPin, PiggyBank, Sparkles, Sun, Trees, Umbrella, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import rawEvents from '../data/events.json'
import { CityPicker } from '../components/CityPicker'
import { MilestoneNudge, WeekendPlan, WeeklyGoal } from '../components/Engage'
import { PlaceCard } from '../components/PlaceCard'
import { cityCoords, placesIn, useCity } from '../lib/city'
import { eventInCity } from '../lib/events'
import { ACTIVITY_ICON, activities, fitFor } from '../lib/activities'
import { formatAge, isSummer, moneyTips, todaysPicks } from '../lib/places'
import { KEYS, useIdList, useStored } from '../lib/storage'
import { useChild } from '../lib/useChild'
import { useWeather } from '../lib/weather'
import type { KidEvent, Visit } from '../types'
import { translate as tr, useT } from '../lib/i18n'

const NO_VISITS: Visit[] = []
const events = (rawEvents as { events: KidEvent[] }).events

function greeting(hour: number) {
  if (hour < 12) return tr('Good morning')
  if (hour < 18) return tr('Good afternoon')
  return tr('Good evening')
}

export function Today() {
  const { t, locale } = useT()
  const { months, name } = useChild()
  const [city] = useCity()
  const here = cityCoords(city)
  const { weather, error } = useWeather(here.lat, here.lng)
  const favorites = useIdList(KEYS.favorites)
  const [visits] = useStored<Visit[]>(KEYS.visits, NO_VISITS)

  const twoWeeksAgo = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10)
  const visitedRecently = new Set(visits.filter((v) => v.date >= twoWeeksAgo).map((v) => v.placeId))
  const picks = todaysPicks({ months, weather, visitedRecently, favorites: new Set(favorites.ids), count: 6, pool: placesIn(city) })
  const mode = weather?.mode ?? (isSummer() ? 'outdoor' : 'indoor')
  const tip = moneyTips.length ? moneyTips[new Date().getDate() % moneyTips.length] : null
  const startable = activities().filter((a) => ['now', 'soon', 'unknown'].includes(fitFor(a, months)))
  const now = Date.now()
  const upcoming = events
    .filter((e) => new Date(e.end ?? e.start).getTime() + (e.allDay ? 864e5 : 0) >= now)
    .filter((e) => eventInCity(e, city))
    .slice(0, 3)

  return (
    <div className="page">
      <header className="hero-header">
        <div className="hero-top">
          <p className="muted">{greeting(new Date().getHours())}</p>
          <CityPicker />
        </div>
        <h1>{name ? t('What shall we do today with {name}?', { name }) : t('What shall we do today?')}</h1>
        {months !== null ? (
          <span className="chip-static">{t('Ideas for {age}', { age: formatAge(months) })}</span>
        ) : (
          <Link to="/me" className="inline-cta">
            {t("Add your child's age for better ideas")} <ChevronRight size={16} />
          </Link>
        )}
      </header>

      <section className={`weather-card ${mode}`}>
        <div className="weather-icon">
          {mode === 'indoor' ? <CloudRain size={28} /> : mode === 'mixed' ? <CloudSun size={28} /> : <Sun size={28} />}
        </div>
        <div className="weather-text">
          {weather ? (
            <>
              <strong>
                {weather.temperature}° · {t(weather.label)}
              </strong>
              <span className="weather-sub">
                {t('Feels like {f}° · wind {w} km/h · updated {time}', {
                  f: weather.feelsLike,
                  w: weather.windSpeed,
                  time: weather.updatedAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
                })}
              </span>
              <span>{t(weather.advice)}</span>
              {weather.rainFrom && (
                <span className="with-icon weather-sub">
                  <Umbrella size={14} /> {t('Rain likely from {time}', { time: weather.rainFrom })}
                </span>
              )}
            </>
          ) : (
            <span>{error ? t('Weather unavailable right now') : t('Checking the weather…')}</span>
          )}
        </div>
      </section>

      <MilestoneNudge />

      <section>
        <div className="section-head">
          <h2>{t('Today\'s ideas')}</h2>
          <Link to="/explore" className="link-more">
            {t('See all')} <ChevronRight size={16} />
          </Link>
        </div>
        <div className="carousel">
          {picks.map((p) => (
            <PlaceCard key={p.id} place={p} months={months} variant="narrow" />
          ))}
        </div>
      </section>

      <WeekendPlan />

      <WeeklyGoal />

      <section>
        <div className="section-head">
          <h2>{months !== null ? t('Start something new') : t('Activities by age')}</h2>
          <Link to="/activities" className="link-more">
            {t('See all')} <ChevronRight size={16} />
          </Link>
        </div>
        <div className="carousel">
          {startable.map((a) => {
            const Icon = ACTIVITY_ICON[a.key]
            return (
              <Link key={a.key} to={`/activity/${a.key}`} className="activity-chip">
                <span className="activity-icon">{Icon && <Icon size={20} />}</span>
                <strong>{a.name}</strong>
                <small>{(a.fromMonths === 0 ? t('From birth') : t('From {age}', { age: formatAge(a.fromMonths) }))}</small>
              </Link>
            )
          })}
        </div>
      </section>

      <section>
        <h2>{t('Browse')}</h2>
        <div className="quick-grid">
          <Link to="/explore?free=1" className="quick">
            <Wallet size={22} />
            <span>{t('Free')}</span>
          </Link>
          <Link to="/explore?setting=indoor" className="quick">
            <HomeIcon size={22} />
            <span>{t('Indoor')}</span>
          </Link>
          <Link to="/explore?setting=outdoor" className="quick">
            <Trees size={22} />
            <span>{t('Outdoor')}</span>
          </Link>
          <Link to="/explore?sort=near" className="quick">
            <MapPin size={22} />
            <span>{t('Near me')}</span>
          </Link>
        </div>
      </section>

      {upcoming.length > 0 && (
        <section>
          <div className="section-head">
            <h2>{t('Coming up')}</h2>
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
      )}

      {tip && (
        <section className="tip-card">
          <PiggyBank size={22} />
          <div>
            <p className="overline">{t('Money tip')}</p>
            <strong>{tip.title}</strong>
            <p className="small">{tip.detail}</p>
          </div>
        </section>
      )}

      <p className="footnote">
        <Sparkles size={14} /> {t('Picks change daily and follow the weather.')}
      </p>
    </div>
  )
}
