import { ChevronRight, CloudRain, CloudSun, CreditCard, Footprints, Route, Sun, TramFront } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CityPicker } from '../components/CityPicker'
import { ModeSwitch } from '../components/ModeSwitch'
import { kindLabel, upcomingAdult, useAdultEvents } from '../lib/adultEvents'
import { cityCoords, placesIn, useCity } from '../lib/city'
import { useT } from '../lib/i18n'
import { forMode, meCategoryLabel } from '../lib/mode'
import { useAllPlaces } from '../lib/osm'
import { isSummer, priceAdultShort } from '../lib/places'
import { cardSaving, clock, planDays, TALLINN_CARD_URL, toursUrl } from '../lib/visit'
import { useWeather, type OutdoorMode } from '../lib/weather'

type Length = 'half' | '1' | '2' | '3'
const LENGTHS: [Length, string][] = [
  ['half', 'Half day'],
  ['1', '1 day'],
  ['2', '2 days'],
  ['3', '3+ days'],
]

// Today in "Visiting" mode: a ready-made plan for the time you have, for today's weather.
export function TodayVisit() {
  const { t, locale } = useT()
  const [city] = useCity()
  const here = cityCoords(city)
  const { weather } = useWeather(here.lat, here.lng)
  const [length, setLength] = useState<Length>('1')
  const [day, setDay] = useState(0)
  const all = useAllPlaces()
  const pool = forMode('visit', placesIn(city, all))
  const mode: OutdoorMode = weather?.mode ?? (isSummer() ? 'outdoor' : 'indoor')
  const days = length === '2' ? 2 : length === '3' ? 3 : 1
  const plan = planDays(pool, mode, days, length === 'half' ? 3 : 5, 10 * 60, length === 'half' ? 14 * 60 + 30 : 19 * 60)
  const stops = plan[Math.min(day, plan.length - 1)] ?? []
  const everything = plan.flat().map((s) => s.place)
  const card = city === 'Tallinn' ? cardSaving(everything, days as 1 | 2 | 3) : null
  const cardLink = toursUrl('Tallinn Card') ?? TALLINN_CARD_URL
  const { list: events } = useAdultEvents()
  const tallinnDay = (d: Date | string) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Europe/Tallinn' })
  const tonight = upcomingAdult(events, city, 1).filter((e) => !e.allDay && tallinnDay(e.start) === tallinnDay(new Date())).slice(0, 2)
  const WeatherIcon = mode === 'indoor' ? CloudRain : mode === 'mixed' ? CloudSun : Sun
  const end = stops.length ? stops[stops.length - 1].start + stops[stops.length - 1].place.durationMinutes : 0
  const walkKm = stops.filter((s) => s.travel?.walk).reduce((n, s) => n + (s.travel!.minutes * 4.5) / 60, 0)

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
        <h1>{t('How long are you here?')}</h1>
        <div className="chip-row" role="group" aria-label={t('How long are you here?')}>
          {LENGTHS.map(([key, label]) => (
            <button
              key={key}
              className={`chip ${length === key ? 'on' : ''}`}
              aria-pressed={length === key}
              onClick={() => {
                setLength(key)
                setDay(0)
              }}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </header>

      {stops.length ? (
        <section className="hero visit-plan">
          <span className="hero-badge">
            <Route size={13} aria-hidden="true" /> {t('Your plan')}
            {weather ? ` · ${weather.temperature}°` : ''} <WeatherIcon size={13} aria-hidden="true" />
          </span>
          <div className="hero-line">
            <div className="hero-stack">
              <span className="hero-name">{stops.map((s) => s.place.name).slice(0, 2).join(', ')}{stops.length > 2 ? ' …' : ''}</span>
              <small className="hero-sub">
                {t('{n} stops', { n: stops.length })} · {t('about {km} km on foot', { km: Math.max(1, Math.round(walkKm)) })}
              </small>
            </div>
            <span className="hero-square">{clock(stops[0].start)}–{clock(end)}</span>
          </div>
          <ul className="hero-chips">
            <li>{mode === 'indoor' ? t('Indoor places first: rain is expected') : t('Outdoor places while it’s dry')}</li>
          </ul>
        </section>
      ) : (
        <section className="hero">
          <p className="hero-title">{t('No ideas for this town yet')}</p>
          <p className="hero-sub">{t('Try another town or look through all places.')}</p>
        </section>
      )}

      {plan.length > 1 && (
        <div className="chip-row" role="group" aria-label={t('Day')}>
          {plan.map((_, i) => (
            <button key={i} className={`chip ${day === i ? 'on' : ''}`} aria-pressed={day === i} onClick={() => setDay(i)}>
              {t('Day {n}', { n: i + 1 })}
            </button>
          ))}
        </div>
      )}

      {stops.length > 0 && (
        <ol className="list-card plan-list">
          {stops.map((s) => (
            <li key={s.place.id}>
              {s.travel && (
                <span className="plan-travel">
                  {s.travel.walk ? <Footprints size={14} aria-hidden="true" /> : <TramFront size={14} aria-hidden="true" />}
                  {s.travel.walk ? t('{n} min walk', { n: s.travel.minutes }) : t('About {n} min by tram, bus or taxi', { n: s.travel.minutes })}
                </span>
              )}
              <Link className="event-row" to={`/place/${s.place.id}`}>
                <span className="event-time">{clock(s.start)}</span>
                <span className="row-text">
                  <strong>{s.place.name}</strong>
                  <small>
                    {meCategoryLabel(s.place.category)} · {priceAdultShort(s.place)}
                  </small>
                </span>
                <ChevronRight size={18} className="muted" />
              </Link>
            </li>
          ))}
        </ol>
      )}
      {stops.length > 0 && <p className="footnote">{t('Times are a suggestion. Check opening hours before you go.')}</p>}

      {card && card.saving > 0 && (
        <a className="card-saving" href={cardLink} target="_blank" rel="noreferrer">
          <CreditCard size={20} aria-hidden="true" />
          <span>
            <strong>{t('The Tallinn Card saves you about €{n}', { n: card.saving })}</strong>
            <small>{t('Tickets on this plan €{tickets} · card €{card}, with public transport', { tickets: card.tickets, card: card.card })}</small>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </a>
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
        </section>
      )}

      <Link to="/explore?cat=sight" className="link-more">
        {t('All sights')} <ChevronRight size={16} />
      </Link>
    </div>
  )
}
