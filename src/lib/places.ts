import rawPlaces from '../data/places.json'
import rawTips from '../data/money-tips.json'
import type { Category, MoneyTip, Place } from '../types'
import type { Weather } from './weather'

export const places = rawPlaces as Place[]
export const moneyTips = rawTips as MoneyTip[]

export const placeById = (id: string) => places.find((p) => p.id === id)

export const CATEGORY_LABEL: Record<Category, { label: string; emoji: string }> = {
  playground: { label: 'Playground', emoji: '🛝' },
  park: { label: 'Park', emoji: '🌳' },
  museum: { label: 'Museum', emoji: '🏛️' },
  'indoor-play': { label: 'Indoor play', emoji: '🧸' },
  library: { label: 'Library', emoji: '📚' },
  swimming: { label: 'Swimming', emoji: '🏊' },
  'zoo-farm': { label: 'Zoo & farm', emoji: '🦒' },
  beach: { label: 'Beach', emoji: '🏖️' },
  mall: { label: 'Mall', emoji: '🛍️' },
  cafe: { label: 'Café', emoji: '☕' },
}

export function ageInMonths(birthDate: string | null, today = new Date()): number | null {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return null
  let months = (today.getFullYear() - b.getFullYear()) * 12 + today.getMonth() - b.getMonth()
  if (today.getDate() < b.getDate()) months -= 1
  return Math.max(0, months)
}

export function formatAge(months: number): string {
  if (months < 24) return `${months} months`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m ? `${y} y ${m} m` : `${y} years`
}

export const fitsAge = (p: Place, months: number | null) =>
  months === null || (months >= p.ageMinMonths && months <= p.ageMaxMonths)

// Summer here means roughly May–September, when outdoor-only places make sense.
export const isSummer = (d = new Date()) => d.getMonth() >= 4 && d.getMonth() <= 8

export const fitsSeason = (p: Place, d = new Date()) =>
  p.season === 'all-year' || (p.season === 'summer') === isSummer(d)

export function priceLabel(p: Place, months: number | null): string {
  const { price } = p
  if (price.free) return 'Free'
  const childFree =
    months !== null && price.childFreeUnderMonths !== null && months < price.childFreeUnderMonths
  if (price.adult !== null) {
    return childFree ? `€${fmt(price.adult)} adult · child free` : `from €${fmt(price.adult)}`
  }
  if (price.child !== null) return childFree ? 'Child free' : `€${fmt(price.child)} child`
  return 'Paid · check price'
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Small deterministic hash so "today's picks" rotate daily but stay stable within a day.
function dailyNoise(id: string, day: string) {
  let h = 0
  for (const c of id + day) h = (h * 31 + c.charCodeAt(0)) | 0
  return (Math.abs(h) % 1000) / 1000
}

export function todaysPicks(opts: {
  months: number | null
  weather: Weather | null
  visitedRecently: Set<string>
  favorites: Set<string>
  count?: number
}): Place[] {
  const today = new Date()
  const day = today.toISOString().slice(0, 10)
  const indoorOnly = opts.weather ? !opts.weather.goodForOutdoor : !isSummer(today)

  return places
    .filter((p) => fitsAge(p, opts.months) && fitsSeason(p, today))
    .filter((p) => !indoorOnly || p.setting !== 'outdoor')
    .map((p) => {
      let score = dailyNoise(p.id, day)
      if (opts.favorites.has(p.id)) score += 0.4
      if (opts.visitedRecently.has(p.id)) score -= 0.6
      if (p.price.free) score += 0.2
      if (!indoorOnly && p.setting !== 'indoor') score += 0.3
      return { p, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.count ?? 3)
    .map((x) => x.p)
}

export function settingLabel(s: Place['setting']) {
  return s === 'indoor' ? '🏠 Indoor' : s === 'outdoor' ? '🌤️ Outdoor' : '🏠🌤️ In & out'
}
