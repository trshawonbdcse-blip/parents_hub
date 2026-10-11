import type { Place } from '../types'
import { useStored } from './storage'

// Stebby is an Estonian employee wellbeing budget that can be spent at partner venues.
// Families who have it want to see where it works.
export const acceptsStebby = (p: Place) => p.stebby?.accepted === true

export function useStebby(): [boolean, (on: boolean) => void] {
  return useStored<boolean>('ph.stebby', false)
}
