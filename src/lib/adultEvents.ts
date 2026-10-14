import { useEffect, useSyncExternalStore } from 'react'
import type { AdultEvent } from '../types'
import { DATA_BASE } from './native'
import { eventEndsAt, eventInCity } from './events'

// Concerts, theatre and other events for "Just me" mode. Collected daily from open feeds
// (Piletimaailm, Fienta) into data/events-adult.json and downloaded only when needed.
let list: AdultEvent[] = []
let updatedAt: string | null = null
let state: 'idle' | 'loading' | 'ready' | 'failed' = 'idle'
const listeners = new Set<() => void>()

function load() {
  if (state !== 'idle') return
  state = 'loading'
  fetch(`${DATA_BASE}data/events-adult.json`, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((j: { updatedAt: string | null; events: AdultEvent[] }) => {
      list = j.events ?? []
      updatedAt = j.updatedAt
      state = 'ready'
    })
    .catch(() => {
      state = 'failed'
    })
    .finally(() => listeners.forEach((l) => l()))
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useAdultEvents(enabled = true) {
  useEffect(() => {
    if (enabled) load()
  }, [enabled])
  const status = useSyncExternalStore(subscribe, () => state)
  return { list: status === 'ready' ? list : [], status, updatedAt }
}

export const adultEventById = (id: string) => list.find((e) => e.id === id)
export const isAdultEventId = (id: string) => id.startsWith('piletimaailm-') || (id.startsWith('fienta-') && list.some((e) => e.id === id))

export const kindLabel = (k: AdultEvent['kind']) => (k === 'concert' ? 'Concert' : k === 'theatre' ? 'Theatre' : 'Event')

export function upcomingAdult(list: AdultEvent[], city: string, days: number, now = Date.now()) {
  const until = now + days * 864e5
  return list.filter((e) => eventEndsAt(e) >= now && new Date(e.start).getTime() <= until && eventInCity(e, city)).sort((a, b) => a.start.localeCompare(b.start))
}
