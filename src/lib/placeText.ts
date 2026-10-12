import { useEffect, useSyncExternalStore } from 'react'
import type { Place } from '../types'
import { getLang, type Lang } from './i18n'

interface PlaceTranslation {
  description?: string
  tips?: string | null
  hours?: string
  priceNote?: string | null
  discounts?: string[]
  parkingNote?: string | null
}

// Place texts in Estonian/Russian are downloaded only for the language in use
// (they are about a third of the app's size). English is built in.
const TABLES: Partial<Record<Lang, Record<string, PlaceTranslation>>> = {}
const LOADERS = {
  et: () => import('../data/i18n/places.et.json'),
  ru: () => import('../data/i18n/places.ru.json'),
}
let version = 0
const listeners = new Set<() => void>()

function load(lang: Lang) {
  if (lang === 'en' || TABLES[lang]) return
  TABLES[lang] = {}
  LOADERS[lang]()
    .then((m) => {
      TABLES[lang] = m.default as Record<string, PlaceTranslation>
      version++
      listeners.forEach((l) => l())
    })
    .catch(() => {
      delete TABLES[lang]
    })
}

// Call near the top of the app: loads the current language's texts and re-renders when ready.
export function usePlaceTexts(lang: Lang) {
  useEffect(() => load(lang), [lang])
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => version,
  )
}

// A place's free-text fields in the current language, falling back to English.
export function placeText(p: Place) {
  const tr = TABLES[getLang()]?.[p.id] ?? {}
  return {
    description: tr.description || p.description,
    tips: tr.tips ?? p.tips,
    hours: tr.hours || p.hours,
    priceNote: tr.priceNote ?? p.price.note,
    discounts: tr.discounts?.length ? tr.discounts : p.discounts,
    parkingNote: tr.parkingNote ?? p.parkingInfo?.note ?? null,
  }
}
