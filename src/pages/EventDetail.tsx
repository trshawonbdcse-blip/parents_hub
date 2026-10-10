import { ArrowLeft, Baby, CalendarPlus, CalendarX, Clock, Languages, MapPin, Navigation, Share2, Sparkles, Tag, Ticket, Timer } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  cleanPrice,
  eventAudience,
  eventById,
  eventDuration,
  eventEndsAt,
  eventKind,
  eventLanguage,
  eventSummaryLine,
  icsFor,
  TZ,
} from '../lib/events'

const dateFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ })

export function EventDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const event = eventById(decodeURIComponent(id))
  const [imgFailed, setImgFailed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  if (!event) {
    return (
      <div className="page">
        <div className="empty">
          <CalendarX size={32} />
          <p>This event is no longer listed.</p>
          <Link to="/events" className="button primary">
            See upcoming events
          </Link>
        </div>
      </div>
    )
  }

  const start = new Date(event.start)
  const past = eventEndsAt(event) < Date.now()
  const where = [event.venue, event.address].filter(Boolean).join(', ')
  const directions = where ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}` : null
  const hasTickets = event.source === 'Fienta' || event.source === 'Piletilevi'
  const kind = eventKind(event)
  const audience = eventAudience(event)
  const duration = eventDuration(event)
  const language = eventLanguage(event)
  const price = event.free ? 'Free' : (cleanPrice(event.price) ?? 'Price not listed')
  const summary = eventSummaryLine(event)
  const fullText = event.description ?? event.summary
  const time = event.allDay
    ? 'Time not published'
    : `${timeFmt.format(start)}${event.end && new Date(event.end).toDateString() === start.toDateString() ? ` – ${timeFmt.format(new Date(event.end))}` : ''}`

  const addToCalendar = () => {
    const blob = new Blob([icsFor(event)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.title.slice(0, 40).replace(/[^\w\s-]/g, '').trim() || 'event'}.ics`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const share = async () => {
    const text = `${event.title} — ${dateFmt.format(start)}${event.allDay ? '' : ` ${timeFmt.format(start)}`}${where ? `, ${where}` : ''}`
    try {
      if (navigator.share) await navigator.share({ title: event.title, text, url: location.href })
      else await navigator.clipboard.writeText(`${text}\n${location.href}`)
    } catch {
      // User cancelled the share sheet.
    }
  }

  return (
    <div className="detail">
      <div className="detail-media event-media">
        {event.image && !imgFailed ? (
          <img className="img-cover" src={event.image} alt="" referrerPolicy="no-referrer" onError={() => setImgFailed(true)} />
        ) : (
          <div className="img-fallback event-fallback">
            <span className="event-fallback-day">{start.toLocaleDateString('en-GB', { day: 'numeric', timeZone: TZ })}</span>
            <span>{start.toLocaleDateString('en-GB', { month: 'long', timeZone: TZ })}</span>
          </div>
        )}
        <button className="float-button left" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/events'))} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <button className="float-button right" onClick={share} aria-label="Share">
          <Share2 size={20} />
        </button>
      </div>

      <div className="detail-body">
        <header className="detail-header">
          <div className="chip-line">
            {kind && <span className="badge badge-brand">{kind}</span>}
            {audience && <span className="badge">{audience}</span>}
            {event.free && <span className="badge badge-free">Free</span>}
          </div>
          <h1 className="event-title">{event.title}</h1>
          {past && <span className="status bad">This event has ended</span>}
        </header>

        <section className="keypoints">
          <div>
            <Clock size={18} />
            <span>
              <strong>{dateFmt.format(start)}</strong>
              <small>{time}</small>
            </span>
          </div>
          {where && (
            <div>
              <MapPin size={18} />
              <span>
                <strong>{event.venue ?? event.address}</strong>
                {event.venue && event.address && <small>{event.address}</small>}
              </span>
            </div>
          )}
          <div>
            <Tag size={18} />
            <span>
              <strong>{price}</strong>
              {!event.free && !event.price && <small>Ask the organiser</small>}
            </span>
          </div>
          {audience && (
            <div>
              <Baby size={18} />
              <span>
                <strong>{audience}</strong>
                <small>Who it’s for</small>
              </span>
            </div>
          )}
          {duration && (
            <div>
              <Timer size={18} />
              <span>
                <strong>{duration}</strong>
                <small>Duration</small>
              </span>
            </div>
          )}
          <div>
            <Languages size={18} />
            <span>
              <strong>{language}</strong>
              <small>Language of the event</small>
            </span>
          </div>
        </section>

        {summary && (
          <section className="block">
            <h2 className="with-icon">
              <Sparkles size={18} /> In short
            </h2>
            <p className="lead">{summary}</p>
            {fullText && fullText.length > summary.length + 20 && (
              <>
                {expanded && <p className="small muted pre-line more-text">{fullText}</p>}
                <button className="link-button" onClick={() => setExpanded(!expanded)}>
                  {expanded ? 'Show less' : 'Read the full description'}
                </button>
              </>
            )}
          </section>
        )}

        <div className="event-actions">
          <button className="button secondary" onClick={addToCalendar}>
            <CalendarPlus size={18} /> Add to calendar
          </button>
          {hasTickets && !past && (
            <a className="button secondary" href={event.url} target="_blank" rel="noreferrer">
              <Ticket size={18} /> Tickets
            </a>
          )}
        </div>

        <footer className="verify">From {event.source}, collected automatically. Confirm with the organiser before you go.</footer>
      </div>

      <div className="action-bar">
        <button className="button secondary" onClick={share}>
          <Share2 size={18} /> Share
        </button>
        {directions && (
          <a className="button primary" href={directions} target="_blank" rel="noreferrer">
            <Navigation size={18} /> Directions
          </a>
        )}
      </div>
    </div>
  )
}
