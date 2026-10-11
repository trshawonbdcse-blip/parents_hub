import { CalendarHeart, ChevronRight, CloudRain, CloudSun, Sparkles, Sun, Target } from 'lucide-react'
import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ACTIVITY_ICON, activities } from '../lib/activities'
import { cityCoords, placesIn, useCity } from '../lib/city'
import { eventInCity, events } from '../lib/events'
import { useT } from '../lib/i18n'
import { formatAge, todaysPicks } from '../lib/places'
import { KEYS, useStored } from '../lib/storage'
import { useChild } from '../lib/useChild'
import { useForecast, type DayForecast } from '../lib/weather'
import type { KidEvent, Visit } from '../types'
import { PlaceCard } from './PlaceCard'

const NO_VISITS: Visit[] = []
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Europe/Tallinn' })

// Start of the current week (Monday), as YYYY-MM-DD.
function weekStart(now = new Date()) {
  const d = new Date(now)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return dayKey(d)
}

// "This weekend": shown Thursday–Sunday with the forecast, events and ideas for Sat & Sun.
export function WeekendPlan() {
  const { t, locale } = useT()
  const [city] = useCity()
  const { months } = useChild()
  const here = cityCoords(city)
  const forecast = useForecast(here.lat, here.lng)
  const today = new Date()
  const dow = today.getDay()
  if (![4, 5, 6, 0].includes(dow)) return null

  // Thu–Sat: the coming Saturday and Sunday; on Sunday just today.
  const days = forecast.filter((f) => [6, 0].includes(new Date(`${f.date}T12:00:00`).getDay())).slice(0, dow === 0 ? 1 : 2)
  const keys = new Set(days.map((d) => d.date))
  const weekendEvents = events
    .filter((e: KidEvent) => keys.has(dayKey(new Date(e.start))) && eventInCity(e, city))
    .slice(0, 4)
  const wet = days.length > 0 && days.every((d) => d.mode === 'indoor')
  const ideas = todaysPicks({
    months,
    weather: null,
    visitedRecently: new Set(),
    favorites: new Set(),
    count: 3,
    pool: placesIn(city).filter((p) => (wet ? p.setting !== 'outdoor' : true)),
  })
  const Icon = (d: DayForecast) => (d.mode === 'indoor' ? CloudRain : d.mode === 'mixed' ? CloudSun : Sun)

  return (
    <section className="weekend">
      <div className="section-head">
        <h2 className="with-icon">
          <CalendarHeart size={20} /> {t('This weekend')}
        </h2>
        <Link to="/events" className="link-more">
          {t('All events')} <ChevronRight size={16} />
        </Link>
      </div>
      {days.length > 0 && (
        <div className="weekend-days">
          {days.map((d) => {
            const I = Icon(d)
            return (
              <div key={d.date} className={`weekend-day ${d.mode}`}>
                <strong>{new Date(`${d.date}T12:00:00`).toLocaleDateString(locale, { weekday: 'long' })}</strong>
                <span className="with-icon">
                  <I size={18} /> {d.max}° / {d.min}° · {t(d.label)}
                </span>
                <small>{d.rain >= 50 ? t('Rain likely — plan something indoors') : d.mode === 'outdoor' ? t('Good for being outside') : t('Wrap up warm')}</small>
              </div>
            )
          })}
        </div>
      )}
      {weekendEvents.length > 0 && (
        <ul className="list-card">
          {weekendEvents.map((e) => (
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
      )}
      <div className="carousel">
        {ideas.map((p) => (
          <PlaceCard key={p.id} place={p} months={months} variant="narrow" />
        ))}
      </div>
    </section>
  )
}

// Weekly outing goal, counted from "We went today".
export function WeeklyGoal() {
  const { t } = useT()
  const [visits] = useStored<Visit[]>(KEYS.visits, NO_VISITS)
  const [goal] = useStored<number>(KEYS.weeklyGoal, 2)
  const start = weekStart()
  const done = new Set(visits.filter((v) => v.date >= start).map((v) => v.date)).size
  const pct = Math.min(1, done / goal)
  const r = 22
  const c = 2 * Math.PI * r
  return (
    <section className="goal-card">
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r={r} className="goal-track" />
        <circle cx="28" cy="28" r={r} className="goal-fill" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 28 28)" />
      </svg>
      <div>
        <p className="overline with-icon">
          <Target size={14} /> {t('This week')}
        </p>
        <strong>{t('{done} of {goal} outings', { done: Math.min(done, goal), goal })}</strong>
        <p className="small muted">
          {done >= goal ? t('Goal reached — well done!') : t('Tap “We went today” on a place to count an outing.')}
        </p>
      </div>
    </section>
  )
}

// Points out an activity the child has just become old enough for (or soon will).
export function MilestoneNudge() {
  const { t } = useT()
  const { months, name } = useChild()
  if (months === null) return null
  const next = activities()
    .filter((a) => a.fromMonths > 0 && a.fromMonths >= months - 1 && a.fromMonths <= months + 2)
    .sort((a, b) => a.fromMonths - b.fromMonths)[0]
  if (!next) return null
  const Icon = ACTIVITY_ICON[next.key]
  const who = name || t('your child')
  return (
    <Link to={`/activity/${next.key}`} className="nudge">
      <span className="activity-icon">{Icon ? <Icon size={20} /> : <Sparkles size={20} />}</span>
      <span>
        <strong>{next.fromMonths <= months ? t('New for {name}: {activity}', { name: who, activity: next.name }) : t('Coming up for {name}: {activity}', { name: who, activity: next.name })}</strong>
        <small>{t('From {age} — see how to start', { age: formatAge(next.fromMonths) })}</small>
      </span>
      <ChevronRight size={18} />
    </Link>
  )
}

// Events first listed after the user's last visit to the Events tab.
export function useNewEvents() {
  const [seen, setSeen] = useStored<string>(KEYS.eventsSeen, '')
  const now = Date.now()
  const fresh = events.filter((e) => e.firstSeen && seen && e.firstSeen > seen && new Date(e.end ?? e.start).getTime() >= now)
  const markSeen = useCallback(() => setSeen(dayKey(new Date())), [setSeen])
  return { fresh, seen, markSeen }
}
