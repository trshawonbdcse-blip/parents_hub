import rawEvents from '../data/events.json'
import towns from '../data/towns.json'
import type { KidEvent } from '../types'
import { useEffect, useSyncExternalStore } from 'react'
import { translate as tr } from './i18n'
import { DATA_BASE } from './native'

const data = rawEvents as { updatedAt: string | null; events: KidEvent[] }

// Bundled at build time, then refreshed from the website (the iOS app ships less often
// than events change). Live bindings: importers see the refreshed list.
export let events = data.events
export let eventsUpdatedAt = data.updatedAt
let version = 0
let started = false
const listeners = new Set<() => void>()

function refresh() {
  if (started) return
  started = true
  fetch(`${DATA_BASE}data/events.json`, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((j: { updatedAt: string | null; events: KidEvent[] }) => {
      if (!j.updatedAt || (eventsUpdatedAt && j.updatedAt <= eventsUpdatedAt)) return
      events = j.events
      eventsUpdatedAt = j.updatedAt
      version++
      listeners.forEach((l) => l())
    })
    .catch(() => {})
}

// Call once near the top of the app: re-renders everything when fresher events arrive.
export function useLiveEvents() {
  useEffect(refresh, [])
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => version,
  )
}
export const eventById = (id: string) => events.find((e) => e.id === id)

export const TZ = 'Europe/Tallinn'

const TOWNS = towns.towns.map(([re, hub]) => [new RegExp(`(^|[^\\p{L}])(${re})`, 'iu'), hub] as const)
const townOf = (text: string) => TOWNS.find(([re]) => re.test(text))?.[1] ?? null

// Hub town of an event (saved by the collector; guessed for older entries).
export const eventCity = (e: KidEvent) =>
  e.city !== undefined ? e.city : (townOf(`${e.venue ?? ''} ${e.address ?? ''}`) ?? townOf(`${e.title} ${e.source}`))

// Events whose town is unknown are shown everywhere.
export function eventInCity(e: KidEvent, city: string) {
  if (city === 'all') return true
  const c = eventCity(e)
  return c === null || c === city
}

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
    'PRODID:-//Kuhu Minna//EN',
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
  const kind = KINDS.find(([re]) => re.test(text))?.[1]
  return kind ? tr(kind) : null
}

export function eventAudience(e: KidEvent): string | null {
  const text = `${e.title} ${e.description ?? e.summary ?? ''}`.slice(0, 600)
  const monthsToYears = text.match(/(\d{1,2})\s*(kuud?|months?)\s*(kuni|to|[-–])\s*(\d{1,2})\s*(a\b|aasta|years?)/i)
  if (monthsToYears) return tr('{m} months – {y} years', { m: monthsToYears[1], y: monthsToYears[4] })
  const range = text.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(a\b|aastat|years?|yrs?|г\.?|лет)/i)
  if (range) return tr('Ages {a}–{b}', { a: range[1], b: range[2] })
  const months = text.match(/(\d{1,2})\s*(kuud?|kuused|months?)\b/i)
  if (months) return tr('From {n} months', { n: months[1] })
  const plus = text.match(/(?:^|\s)(\d{1,2})\+/)
  if (plus) return tr('Ages {a}+', { a: plus[1] })
  if (/beebi|baby|babies|малыш/i.test(text)) return tr('Babies & toddlers')
  if (/väikelap|toddler|mudila|põnni/i.test(text)) return tr('Toddlers')
  if (/kogupere|family|perele|семейн/i.test(text)) return tr('Whole family')
  if (/lastele|laste|kids|children|детск|для детей/i.test(text)) return tr('Children')
  return null
}

export function eventLanguage(e: KidEvent): string {
  const text = `${e.title} ${e.summary ?? ''}`
  if (/[а-яё]/i.test(text)) return tr('Russian')
  if (/[õäöü]|\b(ja|ning|lastele|kell|toimub)\b/i.test(text)) return tr('Estonian')
  return tr('English')
}

export function eventDuration(e: KidEvent): string | null {
  if (!e.end || e.allDay) return null
  const mins = Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000)
  if (mins <= 0 || mins > 12 * 60) return null
  return mins < 60 ? tr('{n} min', { n: mins }) : tr('{n} h', { n: Math.round((mins / 60) * 10) / 10 })
}

// First sentence (or ~160 characters) as a one-line summary.
export function eventSummaryLine(e: KidEvent): string | null {
  const text = (e.description ?? e.summary ?? '').trim()
  if (!text) return null
  const first = text.split(/(?<=[.!?])\s+/)[0]
  return first.length <= 180 ? first : `${first.slice(0, 170).trimEnd()}…`
}

export const cleanPrice = (p: string | null) => (p ? p.replace(/^from\s+from\s+/i, 'From ').replace(/^from\s+/i, 'From ') : null)
