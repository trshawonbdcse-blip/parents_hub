import { getLang } from './i18n'
import { places } from './places'
import { useStored } from './storage'
import type { Place } from '../types'

// Hub towns places are grouped under. Coordinates are used for the weather and
// for picking the nearest town from the phone's location.
export const HUBS: Record<string, { lat: number; lng: number }> = {
  Tallinn: { lat: 59.437, lng: 24.7536 },
  Tartu: { lat: 58.378, lng: 26.729 },
  Pärnu: { lat: 58.385, lng: 24.497 },
  Narva: { lat: 59.377, lng: 28.19 },
  Jõhvi: { lat: 59.359, lng: 27.421 },
  Rakvere: { lat: 59.346, lng: 26.355 },
  Viljandi: { lat: 58.363, lng: 25.59 },
  Haapsalu: { lat: 58.943, lng: 23.541 },
  Kuressaare: { lat: 58.253, lng: 22.485 },
  Kärdla: { lat: 58.997, lng: 22.749 },
  Paide: { lat: 58.885, lng: 25.557 },
  Rapla: { lat: 59.007, lng: 24.793 },
  Võru: { lat: 57.834, lng: 27.019 },
  Valga: { lat: 57.777, lng: 26.047 },
  Põlva: { lat: 58.06, lng: 27.069 },
  Jõgeva: { lat: 58.746, lng: 26.394 },
  Otepää: { lat: 58.058, lng: 26.496 },
}

export const ALL = 'all'

// Towns that have places, biggest first.
export const CITIES: { name: string; count: number }[] = Object.entries(
  places.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.city]: (acc[p.city] ?? 0) + 1 }), {}),
)
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'et'))

export const cityCoords = (city: string) => HUBS[city] ?? HUBS.Tallinn

export function nearestCity(lat: number, lng: number) {
  let best = CITIES[0]?.name ?? 'Tallinn'
  let bestD = Infinity
  for (const { name } of CITIES) {
    const h = cityCoords(name)
    const d = (h.lat - lat) ** 2 + ((h.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2
    if (d < bestD) [best, bestD] = [name, d]
  }
  return best
}

export const placesIn = (city: string, list: Place[] = places) => (city === ALL ? list : list.filter((p) => p.city === city))

// Towns with their number of places, biggest first.
export function cityCounts(list: Place[]) {
  const m = list.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.city]: (acc[p.city] ?? 0) + 1 }), {})
  return CITIES.map((c) => ({ name: c.name, count: m[c.name] ?? 0 })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'et'))
}

export function useCity(): [string, (c: string) => void] {
  const [city, setCity] = useStored<string>('ph.city', 'Tallinn')
  const valid = city === ALL || CITIES.some((c) => c.name === city) ? city : 'Tallinn'
  return [valid, setCity]
}

const RU: Record<string, string> = {
  Tallinn: 'Таллинн',
  Tartu: 'Тарту',
  Pärnu: 'Пярну',
  Narva: 'Нарва',
  Jõhvi: 'Йыхви',
  Rakvere: 'Раквере',
  Viljandi: 'Вильянди',
  Haapsalu: 'Хаапсалу',
  Kuressaare: 'Курессааре',
  Kärdla: 'Кярдла',
  Paide: 'Пайде',
  Rapla: 'Рапла',
  Võru: 'Выру',
  Valga: 'Валга',
  Põlva: 'Пылва',
  Jõgeva: 'Йыгева',
  Otepää: 'Отепя',
}

// Town name as shown to the user (Russian uses Cyrillic names).
export const cityName = (city: string) => (getLang() === 'ru' ? (RU[city] ?? city) : city)
