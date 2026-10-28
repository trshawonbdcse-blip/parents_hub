import { Baby, CalendarDays, ChevronRight, RefreshCw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CityPicker } from '../components/CityPicker'
import { MilestoneNudge, WeekendPlan, useWeeklyProgress } from '../components/Engage'
import { PlaceRow } from '../components/PlaceRow'
import { cityCoords, placesIn, useCity } from '../lib/city'
import { eventInCity, events } from '../lib/events'
import { translate as tr, useT } from '../lib/i18n'
import { categoryLabel, formatAge, priceShort } from '../lib/places'
import { sceneOf, sceneReason, scenePicks, type Scene } from '../lib/scene'
import { WeatherWhy } from '../components/WeatherWhy'
import { KEYS, useIdList, useStored } from '../lib/storage'
import { useChild } from '../lib/useChild'
import { useWeather } from '../lib/weather'
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
function reasonsFor(p: Place, scene: Scene, napStart: string, favourite: boolean): string[] {
  const out: string[] = []
  const why = sceneReason(scene, p)
  if (why) out.push(why)
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
  const firstName = name.trim().split(/\s+/)[0] ?? ''

  const twoWeeksAgo = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10)
  const visitedRecently = new Set(visits.filter((v) => v.date >= twoWeeksAgo).map((v) => v.placeId))
  const [shuffle, setShuffle] = useState(0)
  // A small child's limits: indoors sooner when it's cold, wet or windy.
  const scene = sceneOf(weather, false)
  const picks = scenePicks({ pool: placesIn(city), scene, months, visitedRecently, favorites: new Set(favorites.ids), count: 3, shuffle })
  const [best, ...more] = picks
  const price = best ? priceShort(best, months).split(' · ') : []
  const reasons = best ? reasonsFor(best, scene, napStart, favorites.has(best.id)) : []
  const dow = new Date().getDay()
  const weekend = [4, 5, 6].includes(dow)
  const now = Date.now()
  const upcoming = events
    .filter((e) => new Date(e.end ?? e.start).getTime() + (e.allDay ? 864e5 : 0) >= now)
    .filter((e) => eventInCity(e, city))
    .slice(0, 3)

  return (
    <div className="page today">
      <header className="hero-header">
        <div className="hero-top">
          <span className="brand" aria-label="Kuhu Minna">
            kuhu minna
          </span>
          <div className="top-chips">
            <ModeSwitch />
            <CityPicker />
          </div>
        </div>
        <h1>{firstName ? t('What shall we do today with {name}?', { name: firstName }) : t('What shall we do today?')}</h1>
        <div className="chip-line">
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

      <WeatherWhy weather={weather} scene={scene} adult={false} />

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
          <button type="button" className="shuffle-button" onClick={() => setShuffle((n) => n + 1)}>
            <RefreshCw size={16} aria-hidden="true" /> {t('Show other ideas')}
          </button>
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
