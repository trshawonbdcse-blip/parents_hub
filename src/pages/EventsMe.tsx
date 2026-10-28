import { CalendarX, ChevronRight, MapPin } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CityPicker } from '../components/CityPicker'
import { ModeSwitch } from '../components/ModeSwitch'
import { kindLabel, upcomingAdult, useAdultEvents } from '../lib/adultEvents'
import { useCity } from '../lib/city'
import { cleanPrice, dayKey, dayLabel, eventCity } from '../lib/events'
import { useT } from '../lib/i18n'
import type { AdultEvent } from '../types'

type Kind = 'all' | AdultEvent['kind']
type Range = 'week' | 'month' | 'all'
const TZ = 'Europe/Tallinn'


// Events in "Just me" mode: concerts, theatre and more for adults.
export function EventsMe() {
  const { t, locale } = useT()
  const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  const [city] = useCity()
  const [kind, setKind] = useState<Kind>('all')
  const [range, setRange] = useState<Range>('month')
  const { list, status, updatedAt } = useAdultEvents()
  const week = upcomingAdult(list, city, 7)
  const events = upcomingAdult(list, city, range === 'week' ? 7 : range === 'month' ? 31 : 3650).filter((e) => kind === 'all' || e.kind === kind)
  const groups = new Map<string, AdultEvent[]>()
  for (const e of events) {
    const key = new Date(e.start) < new Date() ? dayKey(new Date()) : dayKey(new Date(e.start))
    groups.set(key, [...(groups.get(key) ?? []), e])
  }

  return (
    <div className="page">
      <div className="title-row">
        <h1 className="page-title">{t('Events')}</h1>
        <div className="top-chips">
            <ModeSwitch />
            <CityPicker />
          </div>
      </div>
      <section className="hero">
        <div className="hero-stack">
          <span className="hero-number">{week.length}</span>
          <span className="hero-label">{t('concerts, shows and more in the next 7 days')}</span>
        </div>
        <p className="hero-sub">
          {t('Collected every morning')}
          {updatedAt ? ` · ${t('updated {date}', { date: new Date(updatedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) })}` : ''}
        </p>
      </section>

      <div className="chip-row" role="group" aria-label={t('Type')}>
        {(
          [
            ['all', 'All'],
            ['concert', 'Concerts'],
            ['theatre', 'Theatre'],
            ['other', 'Other'],
          ] as const
        ).map(([key, label]) => (
          <button key={key} className={`chip ${kind === key ? 'on' : ''}`} aria-pressed={kind === key} onClick={() => setKind(key)}>
            {t(label)}
          </button>
        ))}
      </div>
      <div className="chip-row" role="group" aria-label={t('Show')}>
        {(
          [
            ['week', 'This week'],
            ['month', '30 days'],
            ['all', 'All'],
          ] as const
        ).map(([key, label]) => (
          <button key={key} className={`chip ${range === key ? 'on' : ''}`} aria-pressed={range === key} onClick={() => setRange(key)}>
            {t(label)}
          </button>
        ))}
      </div>

      {[...groups.entries()].map(([key, items]) => (
        <section key={key} className="event-day">
          <h2>{dayLabel(key)}</h2>
          <ul className="list-card">
            {items.map((e) => (
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
                      <span className="badge badge-brand">{t(kindLabel(e.kind))}</span>
                      {e.soldOut && <span className="badge">{t('Sold out')}</span>}
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

      {status === 'loading' && <p className="muted">{t('Loading events…')}</p>}
      {status !== 'loading' && !events.length && (
        <div className="empty">
          <CalendarX size={32} aria-hidden="true" />
          <p>{status === 'failed' ? t('Events could not be loaded. Check your connection and try again.') : t('No events found for this period yet.')}</p>
          {status !== 'failed' && (range !== 'all' || kind !== 'all') && (
            <button
              className="button secondary"
              onClick={() => {
                setRange('all')
                setKind('all')
              }}
            >
              {t('Show all upcoming events')}
            </button>
          )}
        </div>
      )}

      <p className="footnote">
        {t('Event data: Piletimaailm (CC BY-SA 3.0) and Fienta. Collected automatically — confirm details with the organiser before you go.')}
      </p>
    </div>
  )
}
