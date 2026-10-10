import { CalendarX, ExternalLink, MapPin } from 'lucide-react'
import { useState } from 'react'
import rawEvents from '../data/events.json'
import type { KidEvent } from '../types'

const data = rawEvents as { updatedAt: string | null; events: KidEvent[] }

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
  return data.events
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
        {data.updatedAt ? ` · updated ${new Date(data.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
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
                <a className="event-row" href={e.url} target="_blank" rel="noreferrer">
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
                  <ExternalLink size={16} className="muted" />
                </a>
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

      <p className="footnote">Facebook events can’t be collected automatically. Always check the event page before going.</p>
    </div>
  )
}
