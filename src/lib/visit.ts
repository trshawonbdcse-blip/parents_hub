import type { Place } from '../types'
import { distanceKm, fitsSeason } from './places'
import type { OutdoorMode } from './weather'

// Tallinn Card prices for adults (visittallinn.ee, 2026). Includes public transport in Tallinn
// and one free entry to 40+ museums and sights.
export const TALLINN_CARD = { 1: 45, 2: 65, 3: 78 } as const
export const TALLINN_CARD_URL = 'https://www.visittallinn.ee/eng/visitor/tallinn-card'

// A hand-checked Tallinn place whose ticket is free with the Tallinn Card.
export const withTallinnCard = (p: Place) => p.city === 'Tallinn' && p.discounts.some((d) => /tallinn card/i.test(d) && /free|tasuta/i.test(d))

// Affiliate links (GetYourGuide) only when a partner id is configured at build time.
const GYG = import.meta.env.VITE_GYG_PARTNER_ID as string | undefined
export const toursUrl = (query: string) => (GYG ? `https://www.getyourguide.com/s/?q=${encodeURIComponent(query)}&partner_id=${encodeURIComponent(GYG)}` : null)

// How much a visitor would pay at the door for the paid stops, versus the card.
export function cardSaving(stops: Place[], days: 1 | 2 | 3) {
  const tickets = stops.filter((p) => withTallinnCard(p) && (p.price.adult ?? 0) > 0).reduce((s, p) => s + (p.price.adult ?? 0), 0)
  const card = TALLINN_CARD[days]
  return { tickets, card, saving: tickets - card }
}

const WEIGHT: Partial<Record<Place['category'], number>> = { sight: 10, viewpoint: 8, museum: 7, 'zoo-farm': 5, park: 5, nature: 4, swimming: 3, beach: 3, 'winter-fun': 2 }

export interface Stop {
  place: Place
  start: number // minutes from midnight
  // How you get here from the previous stop.
  travel: { minutes: number; walk: boolean } | null
}

// A simple day plan: the best-known places for the weather, in a walkable order.
// Opening hours are not checked (the text varies too much), so the screen says so.
export function planDays(pool: Place[], weather: OutdoorMode, days: number, stopsPerDay: number, startAt = 10 * 60, endBy = 19 * 60): Stop[][] {
  const score = (p: Place) => {
    let s = WEIGHT[p.category] ?? 0
    if (!p.osm) s += 4
    if (p.photos?.length) s += 2
    if (weather === 'indoor') s += p.setting === 'outdoor' ? -6 : 3
    else if (weather === 'outdoor') s += p.setting === 'indoor' ? -1 : 2
    return s
  }
  const left = pool.filter((p) => WEIGHT[p.category] !== undefined && fitsSeason(p) && score(p) > 4).sort((a, b) => score(b) - score(a))
  const out: Stop[][] = []
  for (let d = 0; d < days && left.length; d++) {
    const day: Stop[] = []
    let time = startAt
    let at = left.shift()!
    day.push({ place: at, start: time, travel: null })
    time += at.durationMinutes
    while (day.length < stopsPerDay && left.length) {
      // The best next place, preferring ones close by. Places right next to a stop already in
      // the plan (Town Hall Square inside the Old Town) are part of that visit.
      let best = -1
      let bestValue = -Infinity
      left.forEach((p, i) => {
        const km = distanceKm(at.lat, at.lng, p.lat, p.lng)
        if (km > 12 || day.some((s) => distanceKm(s.place.lat, s.place.lng, p.lat, p.lng) < 0.3)) return
        const value = score(p) - km * 2
        if (value > bestValue) {
          bestValue = value
          best = i
        }
      })
      if (best < 0) break
      const km = distanceKm(at.lat, at.lng, left[best].lat, left[best].lng)
      const walk = km <= 2
      const minutes = walk ? Math.max(5, Math.round(((km / 4.5) * 60) / 5) * 5) : 20
      if (time + minutes >= endBy) break
      const next = left.splice(best, 1)[0]
      time += minutes
      day.push({ place: next, start: time, travel: { minutes, walk } })
      time += next.durationMinutes
      at = next
    }
    out.push(day)
  }
  return out
}

export const clock = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
