export type Category =
  | 'playground'
  | 'park'
  | 'museum'
  | 'indoor-play'
  | 'library'
  | 'swimming'
  | 'zoo-farm'
  | 'beach'
  | 'mall'
  | 'cafe'
  | 'theatre'
  | 'class'
  | 'winter-fun'

export type Setting = 'indoor' | 'outdoor' | 'both'
export type Season = 'all-year' | 'summer' | 'winter'

export interface Price {
  free: boolean
  adult: number | null
  child: number | null
  childFreeUnderMonths: number | null
  family: number | null
  note: string | null
}

export interface Facilities {
  stroller: boolean | null
  changingTable: boolean | null
  feedingRoom: boolean | null
  cafe: boolean | null
  toilet: boolean | null
  parking: boolean | null
}

export interface ParkingInfo {
  available: boolean | null
  cost: 'free' | 'paid' | 'mixed' | null
  operator: string | null
  pargiSupported: boolean | null
  zone: string | null
  note: string | null
}

export interface Photo {
  src: string
  // Where the photo comes from, shown as a credit (e.g. "Official website" or "Jane Doe · CC BY-SA 4.0").
  credit: string
  page: string
}

export interface Place {
  id: string
  name: string
  nameLocal: string | null
  category: Category
  setting: Setting
  season: Season
  area: string
  city: string
  address: string
  lat: number
  lng: number
  ageMinMonths: number
  ageMaxMonths: number
  description: string
  tips: string | null
  price: Price
  discounts: string[]
  hours: string
  durationMinutes: number
  facilities: Facilities
  parkingInfo?: ParkingInfo
  transport: string | null
  language: string | null
  website: string
  phone?: string | null
  email?: string | null
  photos?: Photo[]
  // From OpenStreetMap (not hand-checked).
  osm?: boolean
  // Activity guides this place teaches (see activities.json), for classes and courses.
  activities?: string[]
  sources?: string[]
  lastVerified: string | null
  confidence: 'high' | 'medium' | 'low'
}

export interface MoneyTip {
  title: string
  detail: string
  source: string
  confidence: 'high' | 'medium' | 'low'
}

export interface Visit {
  id: string
  placeId: string
  date: string
  note: string
}

export interface EventSource {
  name: string
  url: string
  what: string
  language: string
  free: boolean
}

export interface KidEvent {
  id: string
  title: string
  start: string
  end: string | null
  allDay?: boolean
  venue: string | null
  address: string | null
  url: string
  source: string
  price: string | null
  free: boolean | null
  image: string | null
  summary: string | null
  // Longer text shown on the in-app event page.
  description?: string | null
  // Hub town (see towns.json); null when unknown.
  city?: string | null
  // Date (YYYY-MM-DD) the collector first listed it.
  firstSeen?: string
}
