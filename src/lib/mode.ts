import { translate as tr } from './i18n'
import { useStored } from './storage'
import type { Category, Place } from '../types'

// Who the user is planning for: the family (child's age, naps) or "Just me" (an adult going alone).
export type Mode = 'family' | 'me'

export const MODE_KEY = 'ph.mode'

// null = not chosen yet (first open).
export function useMode(): [Mode | null, (m: Mode) => void] {
  return useStored<Mode | null>(MODE_KEY, null)
}

// Places that only make sense for adults are hidden in Family mode.
const ADULT_ONLY: Category[] = ['gym', 'cinema', 'nature']
// Everything an adult can enjoy alone, in the order shown. Only places made for small
// children (playgrounds, indoor play, kids' classes and shows) stay in Family mode.
export const ME_CATEGORIES: Category[] = ['nature', 'park', 'swimming', 'museum', 'zoo-farm', 'cinema', 'theatre', 'gym', 'beach', 'winter-fun', 'library']

// Hand-checked children's shows and classes are not "Just me" ideas.
export const forMode = (mode: Mode, list: Place[]) =>
  mode === 'me'
    ? list.filter((p) => ME_CATEGORIES.includes(p.category) && !(p.category === 'theatre' && !p.osm) && !p.activities?.length)
    : list.filter((p) => !ADULT_ONLY.includes(p.category))

// Category names in "Just me" mode (broader than the family wording).
const ME_LABEL: Partial<Record<Category, string>> = {
  nature: 'Nature walks',
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
