import rawPlaces from '../data/places.json'
import rawTips from '../data/money-tips.json'
import rawEventSources from '../data/event-sources.json'
import rawParkingRules from '../data/parking-rules.json'
import type { Category, EventSource, MoneyTip, Place } from '../types'
import type { Weather } from './weather'
import { translate as tr } from './i18n'

export const places = rawPlaces as Place[]
export const moneyTips = rawTips as MoneyTip[]
export const eventSources = rawEventSources as EventSource[]
export const parkingRules = rawParkingRules as MoneyTip[]

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
  theatre: { label: 'Theatre & shows', emoji: '🎭' },
  class: { label: 'Class', emoji: '🎵' },
  'winter-fun': { label: 'Winter fun', emoji: '🛷' },
}

export const categoryLabel = (c: Category) => tr(CATEGORY_LABEL[c].label)

export function ageInMonths(birthDate: string | null, today = new Date()): number | null {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return null
  let months = (today.getFullYear() - b.getFullYear()) * 12 + today.getMonth() - b.getMonth()
  if (today.getDate() < b.getDate()) months -= 1
  return Math.max(0, months)
}

export function formatAge(months: number): string {
  if (months < 24) return tr('{n} months', { n: months })
  const y = Math.floor(months / 12)
  const m = months % 12
  return m ? tr('{y} y {m} m', { y, m }) : tr('{y} years', { y })
}

export const fitsAge = (p: Place, months: number | null) =>
  months === null || (months >= p.ageMinMonths && months <= p.ageMaxMonths)

// Summer here means roughly May–September, when outdoor-only places make sense.
export const hasParking = (p: Place) => p.parkingInfo?.available ?? p.facilities.parking ?? false
export const hasFreeParking = (p: Place) =>
  hasParking(p) && (p.parkingInfo?.cost === 'free' || p.parkingInfo?.cost === 'mixed')

export function parkingLabel(p: Place): string | null {
  const info = p.parkingInfo
  if (!info || info.available === null) return p.facilities.parking ? tr('Parking') : null
  if (!info.available) return tr('No parking')
  if (info.cost === 'free') return tr('Free parking')
  if (info.cost === 'mixed') return tr('Free/paid parking')
  if (info.cost === 'paid') return info.pargiSupported ? tr('Paid · Pargi ✓') : tr('Paid parking')
  return tr('Parking')
}

export const isSummer = (d = new Date()) => d.getMonth() >= 4 && d.getMonth() <= 8

export const fitsSeason = (p: Place, d = new Date()) =>
  p.season === 'all-year' || (p.season === 'summer') === isSummer(d)

export function priceLabel(p: Place, months: number | null): string {
  const { price } = p
  if (price.free) return p.category === 'cafe' || p.category === 'mall' ? 'Free entry' : 'Free'
  const childFree =
    months !== null && price.childFreeUnderMonths !== null && months < price.childFreeUnderMonths
  if (price.adult !== null && price.adult > 0) {
    return childFree ? `€${fmt(price.adult)} adult · child free` : `from €${fmt(price.adult)}`
  }
  if (price.child !== null) return childFree || price.child === 0 ? 'Child free' : `€${fmt(price.child)} child`
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
  const mode = opts.weather?.mode ?? (isSummer(today) ? 'outdoor' : 'indoor')
  const indoorOnly = mode === 'indoor'

  return places
    .filter((p) => fitsAge(p, opts.months) && fitsSeason(p, today))
    .filter((p) => !indoorOnly || p.setting !== 'outdoor')
    .map((p) => {
      let score = dailyNoise(p.id, day)
      if (opts.favorites.has(p.id)) score += 0.4
      if (opts.visitedRecently.has(p.id)) score -= 0.6
      if (p.price.free) score += 0.2
      if (p.photos?.length) score += 0.25
      if (mode === 'outdoor' && p.setting !== 'indoor') score += 0.3
      // Chilly but dry: mostly indoor ideas, with the odd short outdoor one.
      if (mode === 'mixed' && p.setting !== 'outdoor') score += 0.3
      return { p, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.count ?? 3)
    .map((x) => x.p)
}

export function settingLabel(s: Place['setting']) {
  return s === 'indoor' ? '🏠 Indoor' : s === 'outdoor' ? '🌤️ Outdoor' : '🏠🌤️ In & out'
}

const euroText = (n: number) => `€${Number.isInteger(n) ? n : n.toFixed(2)}`

// What one adult pays, as plain text for the price boxes.
export function adultPriceText(p: Place): string | null {
  if (p.price.free || p.price.adult === 0) return tr('Free')
  return p.price.adult !== null ? euroText(p.price.adult) : null
}

// What this family's child pays, taking the free-under-age rule into account.
export function childPriceText(p: Place, months: number | null): string | null {
  const { price } = p
  if (price.free || price.child === 0) return tr('Free')
  if (price.childFreeUnderMonths !== null && months !== null && months < price.childFreeUnderMonths) return tr('Free')
  if (price.child !== null) return euroText(price.child)
  if (price.childFreeUnderMonths !== null && months === null) return tr('Free under {age}', { age: formatAge(price.childFreeUnderMonths) })
  return null
}

// One-line price for cards: what an adult and this family's child pay, with
// typical prices (marked ≈) filling any gaps.
export function priceSummary(place: Place, months: number | null) {
  if (place.price.free) return tr('Free entry')
  const adult = adultPriceText(place) ?? estimatedAdultText(place)
  const child = childPriceText(place, months) ?? estimatedChildText(place, months)
  if (!adult && !child) return tr('Price on request')
  return tr('Adult {a} · Child {c}', { a: adult ?? '?', c: child ?? '?' })
}

// --- Estimated prices --------------------------------------------------------
// When a place doesn't publish a price, show what similar places in Tallinn
// usually charge so families can still plan. Always labelled as an estimate.
const median = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 2) / 2
}

// Typical Tallinn prices used when we have fewer than two real prices for a category.
// 0 means "usually free" (e.g. a parent joining a baby class, toddlers at museums).
const TYPICAL: Partial<Record<Category, { adult: number; child: number }>> = {
  'indoor-play': { adult: 2, child: 10 },
  museum: { adult: 12, child: 0 },
  'zoo-farm': { adult: 12, child: 6 },
  class: { adult: 0, child: 18 },
  swimming: { adult: 20, child: 7 },
  theatre: { adult: 13, child: 13 },
  park: { adult: 8, child: 4 },
  'winter-fun': { adult: 7, child: 5 },
  library: { adult: 0, child: 0 },
  cafe: { adult: 0, child: 0 },
  mall: { adult: 0, child: 0 },
}

const categoryPrices = (() => {
  const out = new Map<Category, { adult: number | null; child: number | null }>()
  for (const cat of Object.keys(CATEGORY_LABEL) as Category[]) {
    const paid = places.filter((p) => p.category === cat && !p.price.free)
    const adults = paid.map((p) => p.price.adult).filter((n): n is number => n !== null && n > 0)
    const children = paid.map((p) => p.price.child).filter((n): n is number => n !== null && n > 0)
    out.set(cat, {
      adult: adults.length >= 2 ? median(adults) : (TYPICAL[cat]?.adult ?? null),
      child: children.length >= 2 ? median(children) : (TYPICAL[cat]?.child ?? null),
    })
  }
  return out
})()

const estimateText = (n: number | null) => (n === null ? null : n === 0 ? tr('Usually free') : `≈ ${euroText(n)}`)

export function estimatedAdultText(p: Place): string | null {
  if (adultPriceText(p) !== null) return null
  return estimateText(categoryPrices.get(p.category)?.adult ?? null)
}

export function estimatedChildText(p: Place, months: number | null): string | null {
  if (childPriceText(p, months) !== null) return null
  // Museums in Tallinn are generally free for pre-school children.
  if (p.category === 'museum' && months !== null && months >= 84) return estimateText(6)
  return estimateText(categoryPrices.get(p.category)?.child ?? null)
}
