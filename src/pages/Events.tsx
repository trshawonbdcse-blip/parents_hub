import { CalendarX, ChevronRight, MapPin } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cleanPrice, eventAudience, eventKind, events as allEvents, eventsUpdatedAt } from '../lib/events'
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

function upcoming(range: Range, now = new Date()) {
  const limit = range === 'week' ? 7 : range === 'month' ? 31 : 3650
  const until = now.getTime() + limit * 864e5
  return allEvents
    .filter((e) => new Date(e.end ?? e.start).getTime() + (e.allDay ? 864e5 : 0) >= now.getTime() && new Date(e.start).getTime() <= until)
    .sort((a, b) => a.start.localeCompare(b.start))
}

export function Events() {
  const { t, locale } = useT()
  const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  const [range, setRange] = useState<Range>('month')
  const events = upcoming(range)
  const groups = new Map<string, KidEvent[]>()
  for (const e of events) {
    // Events that already started (multi-day) are listed under today.
    const key = new Date(e.start) < new Date() ? dayKey(new Date()) : dayKey(new Date(e.start))
    groups.set(key, [...(groups.get(key) ?? []), e])
  }

  return (
    <div className="page">
      <h1 className="page-title">{t('Events')}</h1>
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
                    {e.venue && (
                      <small className="with-icon">
                        <MapPin size={13} /> {e.venue}
                      </small>
                    )}
                    <span className="event-meta">
                      {eventKind(e) && <span className="badge badge-brand">{eventKind(e)}</span>}
                      {eventAudience(e) && <span className="badge">{eventAudience(e)}</span>}
                      {e.free ? <span className="badge badge-free">Free</span> : e.price && <span className="badge">{cleanPrice(e.price)}</span>}
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

      <p className="footnote">{t('Events are collected automatically every morning. Confirm details with the organiser before you go.')}</p>
    </div>
  )
}
