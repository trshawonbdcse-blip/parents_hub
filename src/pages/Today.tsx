import { Link } from 'react-router-dom'
import { PlaceCard } from '../components/PlaceCard'
import { formatAge, isSummer, moneyTips, todaysPicks } from '../lib/places'
import { KEYS, useIdList, useStored } from '../lib/storage'
import { useChild } from '../lib/useChild'
import { useWeather } from '../lib/weather'
import type { Visit } from '../types'

const NO_VISITS: Visit[] = []

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
  const picks = todaysPicks({ months, weather, visitedRecently, favorites: new Set(favorites.ids) })
  const indoorDay = weather ? !weather.goodForOutdoor : !isSummer()
  const tip = moneyTips.length ? moneyTips[new Date().getDate() % moneyTips.length] : null

  return (
    <div className="page">
      <header className="page-header">
        <p className="muted">{greeting(new Date().getHours())} 👋</p>
        <h1>
          What shall we do today{name ? ` with ${name}` : ''}?
        </h1>
        {months !== null ? (
          <p className="muted small">Showing places for {formatAge(months)} old</p>
        ) : (
          <Link to="/me" className="banner">
            👶 Add your child's birthday to get age-matched ideas →
          </Link>
        )}
      </header>

      <section className="card weather">
        {weather ? (
          <>
            <span className="weather-emoji" aria-hidden="true">
              {weather.emoji}
            </span>
            <div>
              <strong>
                {weather.temperature}°C · {weather.label}
              </strong>
              <p className="small muted">
                Tallinn now · wind {weather.windSpeed} km/h
              </p>
              <p className="small">
                {indoorDay ? '🏠 Better an indoor day today.' : '🌤️ Nice enough to be outside!'}
              </p>
            </div>
          </>
        ) : (
          <p className="muted small">{error ? 'Weather unavailable right now.' : 'Checking the weather…'}</p>
        )}
      </section>

      <section>
        <div className="section-head">
          <h2>Today's ideas</h2>
          <Link to="/explore" className="small">
            See all
          </Link>
        </div>
        {picks.length ? (
          <div className="stack">
            {picks.map((p) => (
              <PlaceCard key={p.id} place={p} months={months} />
            ))}
          </div>
        ) : (
          <p className="muted">No matching places yet.</p>
        )}
      </section>

      <section>
        <h2>Quick find</h2>
        <div className="quick-grid">
          <Link to="/explore?free=1" className="quick">
            🆓<span>Free</span>
          </Link>
          <Link to="/explore?setting=indoor" className="quick">
            🏠<span>Indoor</span>
          </Link>
          <Link to="/explore?sort=near" className="quick">
            📍<span>Near me</span>
          </Link>
          <Link to="/explore?setting=outdoor" className="quick">
            🌳<span>Outdoor</span>
          </Link>
        </div>
      </section>

      {tip && (
        <section className="card tip">
          <p className="eyebrow">💰 Money tip</p>
          <strong>{tip.title}</strong>
          <p className="small">{tip.detail}</p>
          <a href={tip.source} target="_blank" rel="noreferrer" className="small">
            Source ↗
          </a>
        </section>
      )}
    </div>
  )
}
