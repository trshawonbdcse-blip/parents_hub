import data from '../data/stebby.json'
import type { Place } from '../types'
import { useStored } from './storage'

// Stebby is an Estonian employee wellbeing budget that can be spent at partner venues.
// stebby.json is refreshed by scripts/fetch-stebby.mjs from Stebby's public search.
type Match = { hash: string; name: string; distanceM: number; categories: string[]; from: number | null }
const matches = data.matches as Record<string, Match>
const checked = new Set<string>(data.checked)

// Partner details, false when checked and not found, null when not checked yet.
export function stebbyInfo(p: Place): Match | false | null {
  if (matches[p.id]) return matches[p.id]
  return checked.has(p.id) ? false : null
}

export const acceptsStebby = (p: Place) => Boolean(matches[p.id])

export const stebbyUrl = (m: Match) => `https://app.stebby.eu/pos/${m.hash}`

export function useStebby(): [boolean, (on: boolean) => void] {
  return useStored<boolean>('ph.stebby', false)
}
