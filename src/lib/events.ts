import rawEvents from '../data/events.json'
import type { KidEvent } from '../types'

const data = rawEvents as { updatedAt: string | null; events: KidEvent[] }

export const events = data.events
export const eventsUpdatedAt = data.updatedAt
export const eventById = (id: string) => events.find((e) => e.id === id)

export const TZ = 'Europe/Tallinn'

const DAY = 864e5
export const eventEndsAt = (e: KidEvent) => new Date(e.end ?? e.start).getTime() + (e.allDay ? DAY : 0)

// iCalendar file so the event can be added to the phone's own calendar without leaving the app.
export function icsFor(e: KidEvent): string {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const dateOnly = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ }).replace(/-/g, '')
  const start = new Date(e.start)
  const end = e.end ? new Date(e.end) : new Date(start.getTime() + (e.allDay ? DAY : 90 * 60 * 1000))
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Parents Hub Tallinn//EN',
    'BEGIN:VEVENT',
    `UID:${e.id}@parents-hub`,
    `DTSTAMP:${stamp(new Date())}`,
    e.allDay ? `DTSTART;VALUE=DATE:${dateOnly(start)}` : `DTSTART:${stamp(start)}`,
    e.allDay ? `DTEND;VALUE=DATE:${dateOnly(end)}` : `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    e.venue || e.address ? `LOCATION:${esc([e.venue, e.address].filter(Boolean).join(', '))}` : '',
    e.summary ? `DESCRIPTION:${esc(e.summary)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  return lines.join('\r\n')
}
