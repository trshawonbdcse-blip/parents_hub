import { useCallback, useSyncExternalStore } from 'react'

// Everything is stored in this browser only for now. A shared family account
// (so both parents see the same lists) needs a backend and comes later.

const listeners = new Set<() => void>()
const cache = new Map<string, unknown>()

function read<T>(key: string, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T
  let value = fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw !== null) value = JSON.parse(raw) as T
  } catch {
    // Private mode or blocked storage: fall back to defaults.
  }
  cache.set(key, value)
  return value
}

function write<T>(key: string, value: T) {
  if (cache.has(key) && Object.is(cache.get(key), value)) return
  cache.set(key, value)
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Keep the in-memory value even if it can't be persisted.
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useStored<T>(key: string, fallback: T): [T, (value: T) => void] {
  const value = useSyncExternalStore(subscribe, () => read(key, fallback))
  const set = useCallback((v: T) => write(key, v), [key])
  return [value, set]
}

export const KEYS = {
  favorites: 'ph.favorites',
  wishlist: 'ph.wishlist',
  visits: 'ph.visits',
  notes: 'ph.notes',
  childBirthDate: 'ph.childBirthDate',
  childName: 'ph.childName',
  napStart: 'ph.napStart',
  eventsSeen: 'ph.eventsSeen',
  weeklyGoal: 'ph.weeklyGoal',
} as const

const EMPTY: string[] = []
const EMPTY_NOTES: Record<string, string> = {}

export function useIdList(key: string) {
  const [ids, setIds] = useStored<string[]>(key, EMPTY)
  const has = (id: string) => ids.includes(id)
  const toggle = (id: string) =>
    setIds(has(id) ? ids.filter((x) => x !== id) : [...ids, id])
  return { ids, has, toggle }
}

export function useNotes() {
  const [notes, setNotes] = useStored<Record<string, string>>(KEYS.notes, EMPTY_NOTES)
  const setNote = (id: string, text: string) => setNotes({ ...notes, [id]: text })
  return { notes, setNote }
}
