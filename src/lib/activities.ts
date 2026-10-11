import {
  BookOpen,
  Dumbbell,
  MountainSnow,
  Music,
  Palette,
  PersonStanding,
  Snowflake,
  Trees,
  Volleyball,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import raw from '../data/activities.json'
import tr from '../data/i18n/activities.json'
import type { Place } from '../types'
import { getLang } from './i18n'
import { places } from './places'

export interface Activity {
  key: string
  name: string
  fromMonths: number
  toMonths: number
  summary: string
  why: string[]
  steps: string[]
  bring: string[]
  price: string
  howOften: string
  tips: string[]
}

export const ACTIVITY_ICON: Record<string, LucideIcon> = {
  swimming: Waves,
  music: Music,
  gym: Dumbbell,
  dance: PersonStanding,
  art: Palette,
  skating: Snowflake,
  skiing: MountainSnow,
  ball: Volleyball,
  nature: Trees,
  language: BookOpen,
}

const TABLES = tr as Record<string, Record<string, Partial<Activity>>>

// Activity guides in the current language (English fallback per field).
export function activities(): Activity[] {
  const t = TABLES[getLang()] ?? {}
  return (raw as Activity[]).map((a) => ({ ...a, ...t[a.key], key: a.key, fromMonths: a.fromMonths, toMonths: a.toMonths }))
}

export const activityByKey = (key: string) => activities().find((a) => a.key === key)

export type Fit = 'now' | 'soon' | 'later' | 'older' | 'unknown'
export function fitFor(a: Activity, months: number | null): Fit {
  if (months === null) return 'unknown'
  if (months > a.toMonths) return 'older'
  if (months >= a.fromMonths) return 'now'
  return a.fromMonths - months <= 6 ? 'soon' : 'later'
}

// Courses and groups that teach this activity.
export const providersOf = (key: string, pool: Place[] = places) => pool.filter((p) => p.activities?.includes(key))

// Places to practise on your own, without a course.
export function practiceFor(key: string, pool: Place[] = places): Place[] {
  const own = (p: Place) => !p.activities?.length
  switch (key) {
    case 'swimming':
      return pool.filter((p) => p.category === 'swimming' && own(p))
    case 'language':
      return pool.filter((p) => p.category === 'library')
    case 'skating':
      return pool.filter((p) => p.category === 'winter-fun' && /rink|uisu|skat/i.test(`${p.id} ${p.name}`))
    case 'skiing':
      return pool.filter((p) => p.category === 'winter-fun' && /ski|suusa/i.test(`${p.id} ${p.name}`))
    case 'nature':
      return pool.filter((p) => p.category === 'park' && /trail|bog|forest|matk|raba|nature/i.test(`${p.id} ${p.name} ${p.description}`))
    case 'gym':
      return pool.filter((p) => p.category === 'indoor-play')
    default:
      return []
  }
}
