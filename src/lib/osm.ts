import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { Category, Place } from '../types'
import { translate as tr, useT, type Lang } from './i18n'
import { DATA_BASE } from './native'
import { categoryLabel, placeById, places } from './places'

// Compact record written by scripts/fetch-osm.mjs (data © OpenStreetMap contributors, ODbL).
interface Rec {
  i: string
  c: Category
  la: number
  lo: number
  h: string
  n?: string
  en?: string
  ru?: string
  a?: string
  ad?: string
  f?: 0 | 1
  oh?: string
  w?: string
  p?: string
  em?: string
  wc?: string
  ct?: string
  to?: string
  in?: 1
  lit?: 1
}

let records: Rec[] = []
let state: 'idle' | 'loading' | 'ready' | 'failed' = 'idle'
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

// Loaded once, on first use; the service worker keeps a copy for offline use.
function load() {
  if (state !== 'idle') return
  state = 'loading'
  fetch(`${DATA_BASE}data/osm-places.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((j: { places: Rec[] }) => {
      records = j.places ?? []
      state = 'ready'
      notify()
    })
    .catch(() => {
      state = 'failed'
      notify()
    })
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

// Whether the community (OpenStreetMap) list is still loading or could not be loaded.
export function useOsmStatus() {
  return useSyncExternalStore(subscribe, () => state)
}

const DESCRIPTION: Record<Category, string> = {
  playground: 'A public playground. Free to use — check the equipment suits your child’s age.',
  park: 'A public park — free, good for a walk with the stroller.',
  library: 'A public library — free to visit. Most have a children’s corner with picture books.',
  museum: 'A museum. Check its website for family tickets and children’s programmes.',
  swimming: 'A swimming pool or water park. Check children’s pool times and prices before you go.',
  'zoo-farm': 'Animals to visit — check opening times before you go.',
  beach: 'A public beach — free. Best for sand play in summer.',
  'winter-fun': 'An ice rink — check the season and skate hire before you go.',
  'indoor-play': 'An indoor play area — check prices and age limits before you go.',
  mall: '',
  cafe: '',
  theatre: '',
  class: '',
  gym: 'A gym. Check day-pass prices and opening hours before you go.',
  cinema: 'A cinema. See today’s films and times on its website.',
  nature: 'A nature spot or trail, free to visit. Wear good shoes and check the season.',
}

// The same kinds of place, described for an adult going alone ("Just me" mode).
const DESCRIPTION_ME: Partial<Record<Category, string>> = {
  park: 'A public park, free to visit. Good for a walk, some fresh air or a quiet bench.',
  library: 'A public library, free to visit. A quiet place to read, work or borrow books.',
  museum: 'A museum or gallery. Check its website for current exhibitions and tickets.',
  swimming: 'A swimming pool or water park. Check lane times and adult tickets before you go.',
  'zoo-farm': 'Animals to see, at your own pace. Check opening times before you go.',
  beach: 'A public beach, free. Good for a swim or a walk by the water in summer.',
  'winter-fun': 'An ice rink. Check the season, opening times and skate hire before you go.',
}

const FREE_KINDS: Category[] = ['playground', 'park', 'beach', 'library', 'nature']
const DURATION: Partial<Record<Category, number>> = { playground: 60, park: 60, library: 45, museum: 90, swimming: 120, beach: 120, 'winter-fun': 60, 'indoor-play': 120, 'zoo-farm': 120, gym: 75, cinema: 120, nature: 120, theatre: 120 }
const yesNo = (v?: string) => (v === 'yes' ? true : v === 'no' ? false : null)

function toPlace(r: Rec, lang: Lang): Place {
  const area = r.a ?? r.h
  const named = (lang === 'ru' && r.ru) || (lang === 'en' && r.en) || r.n
  const indoor = r.in === 1 || ['library', 'museum', 'indoor-play', 'gym', 'cinema', 'theatre'].includes(r.c)
  const free = r.f === 0 || (r.f !== 1 && FREE_KINDS.includes(r.c))
  return {
    id: `osm-${r.i}`,
    osm: true,
    name: named || `${categoryLabel(r.c)} · ${area}`,
    nameLocal: named && r.n !== named ? (r.n ?? null) : null,
    category: r.c,
    setting: indoor ? 'indoor' : r.c === 'swimming' || r.c === 'zoo-farm' ? 'both' : 'outdoor',
    season: r.c === 'beach' ? 'summer' : r.c === 'winter-fun' && !indoor ? 'winter' : 'all-year',
    area,
    city: r.h,
    address: [r.ad, area].filter(Boolean).join(', '),
    lat: r.la,
    lng: r.lo,
    ageMinMonths: 0,
    ageMaxMonths: 144,
    description: tr(DESCRIPTION[r.c], undefined, lang),
    descriptionMe: DESCRIPTION_ME[r.c] ? tr(DESCRIPTION_ME[r.c]!, undefined, lang) : undefined,
    tips: null,
    price: { free, adult: free ? 0 : null, child: free ? 0 : null, childFreeUnderMonths: null, family: null, note: null },
    discounts: [],
    hours: r.oh ?? '',
    durationMinutes: DURATION[r.c] ?? 60,
    facilities: { stroller: r.wc === 'yes' ? true : null, changingTable: yesNo(r.ct), feedingRoom: null, cafe: null, toilet: yesNo(r.to), parking: null },
    transport: null,
    language: null,
    website: r.w ?? '',
    phone: r.p ?? null,
    email: r.em ?? null,
    sources: [`https://www.openstreetmap.org/${{ n: 'node', w: 'way', r: 'relation' }[r.i[0]]}/${r.i.slice(1)}`],
    lastVerified: null,
    confidence: 'low',
  }
}

// OpenStreetMap places in the current language (empty until loaded).
export function useOsmPlaces(): { list: Place[]; status: typeof state } {
  const { lang } = useT()
  useEffect(load, [])
  const status = useSyncExternalStore(subscribe, () => state)
  const list = useMemo(() => (status === 'ready' ? records.map((r) => toPlace(r, lang)) : []), [status, lang])
  return { list, status }
}

// Hand-checked places first, then OpenStreetMap ones.
export function useAllPlaces(): Place[] {
  const { list } = useOsmPlaces()
  return useMemo(() => [...places, ...list], [list])
}

export function usePlace(id: string): { place: Place | undefined; loading: boolean } {
  const curated = placeById(id)
  const { list, status } = useOsmPlaces()
  if (curated) return { place: curated, loading: false }
  return { place: list.find((p) => p.id === id), loading: id.startsWith('osm-') && (status === 'idle' || status === 'loading') }
}
