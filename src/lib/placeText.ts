import et from '../data/i18n/places.et.json'
import ru from '../data/i18n/places.ru.json'
import type { Place } from '../types'
import { getLang } from './i18n'

interface PlaceTranslation {
  description?: string
  tips?: string | null
  hours?: string
  priceNote?: string | null
  discounts?: string[]
  parkingNote?: string | null
}

const TABLES: Record<string, Record<string, PlaceTranslation>> = { et, ru }

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
