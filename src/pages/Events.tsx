import { CalendarPlus, CalendarX, ChevronRight, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CityPicker } from '../components/CityPicker'
import { useNewEvents } from '../components/Engage'
import { useCity } from '../lib/city'
import { cleanPrice, eventAudience, eventCity, eventInCity, eventKind, events as allEvents, eventsUpdatedAt } from '../lib/events'
import type { KidEvent } from '../types'
import { localeOf, translate as tr, useT } from '../lib/i18n'

type Range = 'week' | 'month' | 'all'

const TZ = 'Europe/Tallinn'
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ })

function dayLabel(key: string) {
  const today = dayKey(new Date())
  const tomorrow = dayKey(new Date(Date.now() + 864e5))
  if (key === today) return tr('Today')
  if (key === tomorrow) return tr('Tomorrow')
  return new Date(`${key}T12:00:00`).toLocaleDateString(localeOf(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })
}

function upcoming(range: Range, city: string, now = new Date()) {
  const limit = range === 'week' ? 7 : range === 'month' ? 31 : 3650
  const until = now.getTime() + limit * 864e5
  return allEvents
    .filter((e) => new Date(e.end ?? e.start).getTime() + (e.allDay ? 864e5 : 0) >= now.getTime() && new Date(e.start).getTime() <= until)
    .filter((e) => eventInCity(e, city))
    .sort((a, b) => a.start.localeCompare(b.start))
}

const townSlug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^a-z]+/g, '-')

// One-time calendar subscription: new events then appear in the phone's own calendar.
function SubscribeCard({ city }: { city: string }) {
  const { t } = useT()
  const [copied, setCopied] = useState(false)
  const file = city === 'all' ? 'all' : townSlug(city)
  const https = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}ics/${file}.ics`
  const webcal = https.replace(/^https?:/, 'webcal:')
  return (
    <section className="subscribe-card">
      <CalendarPlus size={22} />
      <div>
        <strong>{t('Get new events in your calendar')}</strong>
        <p className="small">{t('Subscribe once — new kids’ events for your town appear automatically.')}</p>
        <div className="chip-row">
          <a className="chip" href={webcal}>
            {t('iPhone / Mac')}
          </a>
          <a className="chip" href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer">
            Google Calendar
          </a>
          <button
            className="chip"
            onClick={() => navigator.clipboard?.writeText(https).then(() => setCopied(true), () => {})}
          >
            {copied ? t('Copied') : t('Copy link')}
          </button>
        </div>
      </div>
    </section>
  )
}

export function Events() {
  const { t, locale } = useT()
  const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  const [range, setRange] = useState<Range>('month')
  const [city] = useCity()
  const events = upcoming(range, city)
  // Remember which events were new when the page opened, then mark everything as seen.
  const { fresh, markSeen } = useNewEvents()
  const [newIds] = useState(() => new Set(fresh.map((e) => e.id)))
  useEffect(() => markSeen(), [markSeen])
  const groups = new Map<string, KidEvent[]>()
  for (const e of events) {
    // Events that already started (multi-day) are listed under today.
    const key = new Date(e.start) < new Date() ? dayKey(new Date()) : dayKey(new Date(e.start))
    groups.set(key, [...(groups.get(key) ?? []), e])
  }

  return (
    <div className="page">
      <div className="title-row">
        <h1 className="page-title">{t('Events')}</h1>
        <CityPicker />
      </div>
      <p className="muted small">
        {t("Kids' and family events, collected every morning")}
        {eventsUpdatedAt ? ` · ${t('updated {date}', { date: new Date(eventsUpdatedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) })}` : ''}
      </p>

      <div className="segmented wide">
        {(
          [
            ['week', 'This week'],
            ['month', '30 days'],
            ['all', 'All'],
          ] as const
        ).map(([key, label]) => (
          <button key={key} className={range === key ? 'on' : ''} onClick={() => setRange(key)}>
            {t(label)}
          </button>
        ))}
      </div>

      {[...groups.entries()].map(([key, list]) => (
        <section key={key} className="event-day">
          <h2>{dayLabel(key)}</h2>
          <ul className="list-card">
            {list.map((e) => (
              <li key={e.id}>
                <Link className="event-row" to={`/event/${encodeURIComponent(e.id)}`}>
                  <span className="event-time">{e.allDay ? t('All day') : timeOf(e.start)}</span>
                  <span className="row-text">
                    <strong>{e.title}</strong>
                    {(e.venue || (city === 'all' && eventCity(e))) && (
                      <small className="with-icon">
                        <MapPin size={13} /> {[e.venue, city === 'all' && eventCity(e) && !e.venue?.includes(eventCity(e)!) ? eventCity(e) : null].filter(Boolean).join(', ')}
                      </small>
                    )}
                    <span className="event-meta">
                      {newIds.has(e.id) && <span className="badge badge-new">{t('New')}</span>}
                      {eventKind(e) && <span className="badge badge-brand">{eventKind(e)}</span>}
                      {eventAudience(e) && <span className="badge">{eventAudience(e)}</span>}
                      {e.free ? <span className="badge badge-free">{t('Free')}</span> : e.price && <span className="badge">{cleanPrice(e.price)}</span>}
                    </span>
                  </span>
                  <ChevronRight size={18} className="muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!events.length && (
        <div className="empty">
          <CalendarX size={32} />
          <p>{t('No events found for this period yet.')}</p>
        </div>
      )}

      <SubscribeCard city={city} />

      <p className="footnote">{t('Events are collected automatically every morning. Confirm details with the organiser before you go.')}</p>
    </div>
  )
}
