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

// --- Key points ------------------------------------------------------------------
// Event texts come in Estonian, Russian or English and are often long. These turn them
// into a few plain facts parents scan for: what kind of event, who it's for, language.
const KINDS: [RegExp, string][] = [
  [/nuku(lavastus|teater|etendus)|puppet|кукол/i, 'Puppet show'],
  [/sensory|meeleline/i, 'Sensory play'],
  [/mänguhommik|lastehommik|perehommik|play ?morning|mängutuba|playroom/i, 'Play morning'],
  [/kontsert|concert|muusika|music|laul(ud|uhommik)?\b|концерт/i, 'Music'],
  [/töötuba|meisterdamis|workshop|loovtuba|craft|мастер-класс/i, 'Workshop'],
  [/etendus|lavastus|teater|theatre|theater|show\b|спектакл/i, 'Theatre show'],
  [/kino|cinema|film|movie/i, 'Cinema'],
  [/raamatukogu|library|lugemis|story ?time|ettelugemine/i, 'Story time'],
  [/muuseum|museum|näitus|exhibition/i, 'Museum'],
  [/talu|farm|loomad|animals|zoo|loomaaed/i, 'Animals & farm'],
  [/laat|fair|market|turg/i, 'Market'],
  [/ujumi|swim/i, 'Swimming'],
]

export function eventKind(e: KidEvent): string | null {
  const text = `${e.title} ${e.summary ?? ''}`
  return KINDS.find(([re]) => re.test(text))?.[1] ?? null
}

export function eventAudience(e: KidEvent): string | null {
  const text = `${e.title} ${e.description ?? e.summary ?? ''}`.slice(0, 600)
  const monthsToYears = text.match(/(\d{1,2})\s*(kuud?|months?)\s*(kuni|to|[-–])\s*(\d{1,2})\s*(a\b|aasta|years?)/i)
  if (monthsToYears) return `${monthsToYears[1]} months – ${monthsToYears[4]} years`
  const range = text.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(a\b|aastat|years?|yrs?|г\.?|лет)/i)
  if (range) return `Ages ${range[1]}–${range[2]}`
  const months = text.match(/(\d{1,2})\s*(kuud?|kuused|months?)\b/i)
  if (months) return `From ${months[1]} months`
  const plus = text.match(/(?:^|\s)(\d{1,2})\+/)
  if (plus) return `Ages ${plus[1]}+`
  if (/beebi|baby|babies|малыш/i.test(text)) return 'Babies & toddlers'
  if (/väikelap|toddler|mudila|põnni/i.test(text)) return 'Toddlers'
  if (/kogupere|family|perele|семейн/i.test(text)) return 'Whole family'
  if (/lastele|laste|kids|children|детск|для детей/i.test(text)) return 'Children'
  return null
}

export function eventLanguage(e: KidEvent): string {
  const text = `${e.title} ${e.summary ?? ''}`
  if (/[а-яё]/i.test(text)) return 'Russian'
  if (/[õäöü]|\b(ja|ning|lastele|kell|toimub)\b/i.test(text)) return 'Estonian'
  return 'English'
}

export function eventDuration(e: KidEvent): string | null {
  if (!e.end || e.allDay) return null
  const mins = Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000)
  if (mins <= 0 || mins > 12 * 60) return null
  return mins < 60 ? `${mins} min` : `${Math.round((mins / 60) * 10) / 10} h`
}

// First sentence (or ~160 characters) as a one-line summary.
export function eventSummaryLine(e: KidEvent): string | null {
  const text = (e.description ?? e.summary ?? '').trim()
  if (!text) return null
  const first = text.split(/(?<=[.!?])\s+/)[0]
  return first.length <= 180 ? first : `${first.slice(0, 170).trimEnd()}…`
}

export const cleanPrice = (p: string | null) => (p ? p.replace(/^from\s+from\s+/i, 'From ').replace(/^from\s+/i, 'From ') : null)
