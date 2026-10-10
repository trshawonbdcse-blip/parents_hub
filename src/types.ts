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
