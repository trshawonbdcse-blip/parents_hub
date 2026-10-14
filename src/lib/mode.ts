import { translate as tr } from './i18n'
import { useStored } from './storage'
import type { Category, Place } from '../types'

// Who the user is planning for: the family (child's age, naps), "Just me" (an adult going alone)
// or "Visiting" (someone on a trip to Estonia).
export type Mode = 'family' | 'me' | 'visit'

// Adults alone and visitors get the same grown-up wording, prices and descriptions.
export const isAdult = (m: Mode | null) => m === 'me' || m === 'visit'

export const MODE_KEY = 'ph.mode'

// null = not chosen yet (first open).
export function useMode(): [Mode | null, (m: Mode) => void] {
  return useStored<Mode | null>(MODE_KEY, null)
}

// Places that only make sense for adults are hidden in Family mode.
const ADULT_ONLY: Category[] = ['gym', 'cinema', 'nature']
// Everything an adult can enjoy alone, in the order shown. Only places made for small
// children (playgrounds, indoor play, kids' classes and shows) stay in Family mode.
export const ME_CATEGORIES: Category[] = ['sight', 'viewpoint', 'nature', 'park', 'swimming', 'museum', 'zoo-farm', 'cinema', 'theatre', 'gym', 'beach', 'winter-fun', 'library']

// What a visitor looks for first: sights, views, museums and nature. Everyday places
// (gyms, libraries, cinemas) are left out.
export const VISIT_CATEGORIES: Category[] = ['sight', 'viewpoint', 'museum', 'nature', 'park', 'zoo-farm', 'swimming', 'beach', 'theatre', 'winter-fun']
export const categoriesFor = (mode: Mode) => (mode === 'visit' ? VISIT_CATEGORIES : ME_CATEGORIES)

// Hand-checked children's shows and classes are not "Just me" ideas.
export const forMode = (mode: Mode, list: Place[]) =>
  isAdult(mode)
    ? list.filter((p) => categoriesFor(mode).includes(p.category) && !(p.category === 'theatre' && !p.osm) && !p.activities?.length)
    : list.filter((p) => !ADULT_ONLY.includes(p.category))

// Category names in "Just me" mode (broader than the family wording).
const ME_LABEL: Partial<Record<Category, string>> = {
  nature: 'Nature walks',
  sight: 'Sights',
  viewpoint: 'Viewpoints',
  gym: 'Gyms',
  swimming: 'Swimming & spa',
  cinema: 'Cinema',
  theatre: 'Concerts & theatre',
  museum: 'Museums & galleries',
  park: 'Parks & gardens',
  'zoo-farm': 'Zoo & animals',
  beach: 'Beaches',
  'winter-fun': 'Ice skating',
  library: 'Libraries',
}
export const meCategoryLabel = (c: Category) => tr(ME_LABEL[c] ?? c)
