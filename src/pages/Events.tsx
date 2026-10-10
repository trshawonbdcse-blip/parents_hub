import { CalendarX, ChevronRight, MapPin } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { events as allEvents, eventsUpdatedAt } from '../lib/events'
import type { KidEvent } from '../types'

type Range = 'week' | 'month' | 'all'

const TZ = 'Europe/Tallinn'
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ })
const dayLabelFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ })

function dayLabel(key: string) {
  const today = dayKey(new Date())
  const tomorrow = dayKey(new Date(Date.now() + 864e5))
  if (key === today) return 'Today'
  if (key === tomorrow) return 'Tomorrow'
  return dayLabelFmt.format(new Date(`${key}T12:00:00`))
}

function upcoming(range: Range, now = new Date()) {
  const limit = range === 'week' ? 7 : range === 'month' ? 31 : 3650
  const until = now.getTime() + limit * 864e5
  return allEvents
    .filter((e) => new Date(e.end ?? e.start).getTime() + (e.allDay ? 864e5 : 0) >= now.getTime() && new Date(e.start).getTime() <= until)
    .sort((a, b) => a.start.localeCompare(b.start))
}

export function Events() {
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
      <h1 className="page-title">Events</h1>
      <p className="muted small">
        Kids' and family events, collected every morning
        {eventsUpdatedAt ? ` · updated ${new Date(eventsUpdatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
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
            {label}
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
                  <span className="event-time">{e.allDay ? 'All day' : timeFmt.format(new Date(e.start))}</span>
                  <span className="row-text">
                    <strong>{e.title}</strong>
                    {e.venue && (
                      <small className="with-icon">
                        <MapPin size={13} /> {e.venue}
                      </small>
                    )}
                    <span className="event-meta">
                      {e.free ? <span className="badge badge-free">Free</span> : e.price && <span className="badge">{e.price}</span>}
                      <span className="source">{e.source}</span>
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
          <p>No events found for this period yet.</p>
        </div>
      )}

      <p className="footnote">Events are collected automatically every morning. Confirm details with the organiser before you go.</p>
    </div>
  )
}
