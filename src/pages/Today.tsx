import { ChevronRight, CloudRain, CloudSun, Home as HomeIcon, MapPin, PiggyBank, Sparkles, Sun, Trees, Umbrella, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import rawEvents from '../data/events.json'
import { PlaceCard } from '../components/PlaceCard'
import { formatAge, isSummer, moneyTips, todaysPicks } from '../lib/places'
import { KEYS, useIdList, useStored } from '../lib/storage'
import { useChild } from '../lib/useChild'
import { useWeather } from '../lib/weather'
import type { KidEvent, Visit } from '../types'

const NO_VISITS: Visit[] = []
const events = (rawEvents as { events: KidEvent[] }).events
const weekdayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'Europe/Tallinn' })
const dayNumFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'Europe/Tallinn' })

function greeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Today() {
  const { months, name } = useChild()
  const { weather, error } = useWeather()
  const favorites = useIdList(KEYS.favorites)
  const [visits] = useStored<Visit[]>(KEYS.visits, NO_VISITS)

  const twoWeeksAgo = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10)
  const visitedRecently = new Set(visits.filter((v) => v.date >= twoWeeksAgo).map((v) => v.placeId))
  const picks = todaysPicks({ months, weather, visitedRecently, favorites: new Set(favorites.ids), count: 6 })
  const mode = weather?.mode ?? (isSummer() ? 'outdoor' : 'indoor')
  const tip = moneyTips.length ? moneyTips[new Date().getDate() % moneyTips.length] : null
  const now = Date.now()
  const upcoming = events
    .filter((e) => new Date(e.end ?? e.start).getTime() + (e.allDay ? 864e5 : 0) >= now)
    .slice(0, 3)

  return (
    <div className="page">
      <header className="hero-header">
        <p className="muted">{greeting(new Date().getHours())}</p>
        <h1>What shall we do today{name ? ` with ${name}` : ''}?</h1>
        {months !== null ? (
          <span className="chip-static">Ideas for {formatAge(months)}</span>
        ) : (
          <Link to="/me" className="inline-cta">
            Add your child's age for better ideas <ChevronRight size={16} />
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
                {weather.temperature}° · {weather.label}
              </strong>
              <span className="weather-sub">
                Feels like {weather.feelsLike}° · wind {weather.windSpeed} km/h · updated{' '}
                {weather.updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span>{weather.advice}</span>
              {weather.rainFrom && (
                <span className="with-icon weather-sub">
                  <Umbrella size={14} /> Rain likely from {weather.rainFrom}
                </span>
              )}
            </>
          ) : (
            <span>{error ? 'Weather unavailable right now' : 'Checking the weather…'}</span>
          )}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Today's ideas</h2>
          <Link to="/explore" className="link-more">
            See all <ChevronRight size={16} />
          </Link>
        </div>
        <div className="carousel">
          {picks.map((p) => (
            <PlaceCard key={p.id} place={p} months={months} variant="narrow" />
          ))}
        </div>
      </section>

      <section>
        <h2>Browse</h2>
        <div className="quick-grid">
          <Link to="/explore?free=1" className="quick">
            <Wallet size={22} />
            <span>Free</span>
          </Link>
          <Link to="/explore?setting=indoor" className="quick">
            <HomeIcon size={22} />
            <span>Indoor</span>
          </Link>
          <Link to="/explore?setting=outdoor" className="quick">
            <Trees size={22} />
            <span>Outdoor</span>
          </Link>
          <Link to="/explore?sort=near" className="quick">
            <MapPin size={22} />
            <span>Near me</span>
          </Link>
        </div>
      </section>

      {upcoming.length > 0 && (
        <section>
          <div className="section-head">
            <h2>Coming up</h2>
            <Link to="/events" className="link-more">
              All events <ChevronRight size={16} />
            </Link>
          </div>
          <ul className="list-card">
            {upcoming.map((e) => (
              <li key={e.id}>
                <Link to={`/event/${encodeURIComponent(e.id)}`} className="row">
                  <span className="date-badge">
                    <small>{weekdayFmt.format(new Date(e.start))}</small>
                    <strong>{dayNumFmt.format(new Date(e.start))}</strong>
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
            <p className="overline">Money tip</p>
            <strong>{tip.title}</strong>
            <p className="small">{tip.detail}</p>
          </div>
        </section>
      )}

      <p className="footnote">
        <Sparkles size={14} /> Picks change daily and follow the weather.
      </p>
    </div>
  )
}
