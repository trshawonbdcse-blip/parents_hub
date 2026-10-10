import { useState } from 'react'
import rawEvents from '../data/events.json'
import type { KidEvent } from '../types'

const data = rawEvents as { updatedAt: string | null; events: KidEvent[] }

type Range = 'week' | 'month' | 'all'

const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Tallinn' })
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Tallinn' })

function upcoming(range: Range, now = new Date()) {
  const limit = range === 'week' ? 7 : range === 'month' ? 31 : 3650
  const until = now.getTime() + limit * 864e5
  return data.events
    .filter((e) => {
      const end = new Date(e.end ?? e.start).getTime()
      return end >= now.getTime() && new Date(e.start).getTime() <= until
    })
    .sort((a, b) => a.start.localeCompare(b.start))
}

export function Events() {
  const [range, setRange] = useState<Range>('month')
  const events = upcoming(range)

  return (
    <div className="page">
      <header className="page-header">
        <h1>Events</h1>
        <p className="muted small">
          Kids' and family events collected automatically every day
          {data.updatedAt ? ` · updated ${dayFmt.format(new Date(data.updatedAt))}` : ''}.
        </p>
      </header>

      <div className="chips" role="group" aria-label="Time range">
        {(
          [
            ['week', 'This week'],
            ['month', 'Next 30 days'],
            ['all', 'All'],
          ] as const
        ).map(([key, label]) => (
          <button key={key} className={`chip ${range === key ? 'on' : ''}`} onClick={() => setRange(key)}>
            {label}
          </button>
        ))}
      </div>

      <p className="small muted">{events.length} events</p>

      <div className="stack">
        {events.map((e) => (
          <a key={e.id} className="card event-card" href={e.url} target="_blank" rel="noreferrer">
            <div className="event-date">
              <strong>{dayFmt.format(new Date(e.start))}</strong>
              <span className="small muted">{e.allDay ? 'All day' : timeFmt.format(new Date(e.start))}</span>
            </div>
            <div className="event-body">
              <h3>{e.title}</h3>
              {e.venue && <p className="small muted">📍 {e.venue}</p>}
              {e.summary && <p className="small event-summary">{e.summary}</p>}
              <div className="tags">
                {e.free ? <span className="tag tag-free">Free</span> : e.price && <span className="tag">{e.price}</span>}
                <span className="tag">via {e.source}</span>
              </div>
            </div>
          </a>
        ))}
      </div>

      {!events.length && <p className="muted">No events found for this period yet.</p>}

      <p className="small muted">
        Facebook events can't be collected automatically (Facebook blocks it). Always check the event page before going.
      </p>
    </div>
  )
}
