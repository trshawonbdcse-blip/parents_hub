import { useEffect, useState } from 'react'
import type { Category, Place } from '../types'
import { dailyNoise, fitsAge, fitsSeason } from './places'
import { translate as tr } from './i18n'
import type { Weather } from './weather'

// What kind of moment it is outside, judged differently for an adult and for a small child
// (who gets cold sooner and can't walk far in the wind).
export type SceneKey = 'hot' | 'mild' | 'cold' | 'rain' | 'rain-later' | 'snow' | 'windy' | 'evening'

export interface Scene {
  key: SceneKey
  // When rain is expected later today ("15:00").
  rainFrom: string | null
  // Outdoor places are fine right now.
  outdoorNow: boolean
}

const tallinnHour = (d = new Date()) => Number(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Tallinn', hour: '2-digit', hourCycle: 'h23' }).format(d))
const isSnow = (code: number) => (code >= 71 && code <= 77) || code === 85 || code === 86

export function sceneOf(w: Weather | null, adult: boolean, now = new Date()): Scene {
  const hour = tallinnHour(now)
  const hhmm = `${String(hour).padStart(2, '0')}:00`
  const evening = hour >= 18 || hour < 6 || (w?.sunset ? hhmm >= w.sunset && hour >= 16 : false)
  // Without weather: a calm guess from the season.
  if (!w) {
    const m = now.getMonth()
    return { key: evening ? 'evening' : m >= 5 && m <= 7 ? 'mild' : 'cold', rainFrom: null, outdoorNow: !evening }
  }
  const later = w.hours.slice(1).find((h) => h.rain >= 50)
  if (evening) return { key: 'evening', rainFrom: null, outdoorNow: false }
  if (isSnow(w.code)) return { key: 'snow', rainFrom: null, outdoorNow: adult || w.feelsLike > -5 }
  if (w.code >= 51 || (w.hours[0]?.rain ?? 0) >= 60) return { key: 'rain', rainFrom: null, outdoorNow: false }
  if (w.windSpeed >= (adult ? 45 : 35)) return { key: 'windy', rainFrom: null, outdoorNow: false }
  if (!adult && w.feelsLike <= 0) return { key: 'cold', rainFrom: null, outdoorNow: false }
  if (later) return { key: 'rain-later', rainFrom: later.time, outdoorNow: true }
  if (w.feelsLike >= 22) return { key: 'hot', rainFrom: null, outdoorNow: true }
  if (w.feelsLike >= (adult ? 8 : 10)) return { key: 'mild', rainFrom: null, outdoorNow: true }
  return { key: 'cold', rainFrom: null, outdoorNow: adult }
}

// How well each kind of place fits the moment (added to the daily score).
const FIT: Record<SceneKey, Partial<Record<Category, number>>> = {
  hot: { beach: 1, swimming: 0.6, park: 0.6, nature: 0.5, playground: 0.5, viewpoint: 0.3, 'zoo-farm': 0.3, museum: -0.2, 'indoor-play': -0.4, 'winter-fun': -1 },
  mild: { nature: 0.6, viewpoint: 0.5, sight: 0.5, park: 0.5, 'zoo-farm': 0.4, playground: 0.4, beach: 0.1, 'winter-fun': -0.5 },
  'rain-later': { viewpoint: 0.6, sight: 0.5, nature: 0.5, park: 0.5, playground: 0.4, 'zoo-farm': 0.3 },
  cold: { museum: 0.5, swimming: 0.5, sight: 0.4, viewpoint: 0.2, 'indoor-play': 0.4, library: 0.3, cinema: 0.2, beach: -1 },
  rain: { museum: 0.6, swimming: 0.6, 'indoor-play': 0.6, cinema: 0.5, library: 0.4, theatre: 0.3, gym: 0.3, mall: 0.2 },
  snow: { 'winter-fun': 1, swimming: 0.6, museum: 0.3, park: 0.2, sight: 0.2, beach: -1 },
  windy: { museum: 0.6, swimming: 0.6, 'indoor-play': 0.5, cinema: 0.4, library: 0.3, beach: -1, viewpoint: -1 },
  evening: { swimming: 0.7, cinema: 0.7, theatre: 0.5, gym: 0.4, 'winter-fun': 0.2 },
}
// Kinds of place that make no sense at that moment.
const OUT: Partial<Record<SceneKey, Category[]>> = {
  windy: ['beach', 'viewpoint'],
  evening: ['beach', 'nature', 'park', 'playground', 'zoo-farm', 'museum', 'library', 'indoor-play', 'mall', 'cafe'],
  snow: ['beach'],
  cold: ['beach'],
}

// Places for this moment: indoor ones when it's not a day to be out, and what suits the
// weather first. `shuffle` moves on to other ideas.
export function scenePicks(opts: {
  pool: Place[]
  scene: Scene
  months: number | null
  favorites: Set<string>
  visitedRecently: Set<string>
  count: number
  shuffle?: number
  indoor?: boolean
}): Place[] {
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Tallinn' })
  const { scene } = opts
  const indoor = opts.indoor ?? !scene.outdoorNow
  const fit = FIT[scene.key]
  return opts.pool
    .filter((p) => fitsAge(p, opts.months) && fitsSeason(p) && !p.activities?.length)
    .filter((p) => !OUT[scene.key]?.includes(p.category))
    .filter((p) => (indoor ? p.setting !== 'outdoor' : opts.indoor === false ? p.setting !== 'indoor' : true))
    .map((p) => {
      let score = dailyNoise(p.id, `${day}:${opts.shuffle ?? 0}`) + (fit[p.category] ?? 0)
      if (opts.favorites.has(p.id)) score += 0.4
      if (opts.visitedRecently.has(p.id)) score -= 0.6
      if (p.price.free) score += 0.15
      if (p.photos?.length) score += 0.25
      if (!p.osm) score += 0.2
      return { p, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.count)
    .map((x) => x.p)
}

// Sea temperature (Open-Meteo Marine, free), only fetched on warm days for beach ideas.
export function useSeaTemperature(lat: number, lng: number, enabled: boolean) {
  const [temp, setTemp] = useState<number | null>(null)
  useEffect(() => {
    if (!enabled) return
    const c = new AbortController()
    fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=sea_surface_temperature`, { signal: c.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setTemp(typeof d.current?.sea_surface_temperature === 'number' ? Math.round(d.current.sea_surface_temperature) : null))
      .catch(() => setTemp(null))
    return () => c.abort()
  }, [lat, lng, enabled])
  return enabled ? temp : null
}

// One short reason why a place suits this moment, for the chips on the best idea.
export function sceneReason(scene: Scene, p: Place, sea?: number | null): string | null {
  const inside = p.setting !== 'outdoor'
  switch (scene.key) {
    case 'hot':
      return p.category === 'beach' && sea != null ? tr('Sea {n}°', { n: sea }) : inside ? null : tr('Warm and sunny')
    case 'mild':
      return inside ? null : tr('Dry: good to be outside')
    case 'rain-later':
      return inside ? tr('Indoors when the rain comes') : tr('Dry until {time}', { time: scene.rainFrom ?? '' })
    case 'cold':
      return inside ? tr('Warm inside on a chilly day') : tr('Dry: dress warm')
    case 'rain':
      return tr('Indoors — right for today’s weather')
    case 'snow':
      return p.category === 'winter-fun' ? tr('Snowy day') : p.category === 'swimming' ? tr('Warm up after the cold') : null
    case 'windy':
      return tr('Out of the wind')
    case 'evening':
      return tr('Good for the evening')
  }
}
