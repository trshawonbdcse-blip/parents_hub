import tips from '../data/i18n/tips.json'
import type { MoneyTip } from '../types'
import { getLang } from './i18n'

type Table = Record<string, { money?: { title: string; detail: string }[]; parking?: { title: string; detail: string }[] }>

// Money and parking tips in the current language (same order as the English source).
export function localizedTips(kind: 'money' | 'parking', source: MoneyTip[]): MoneyTip[] {
  const list = (tips as Table)[getLang()]?.[kind]
  if (!list || list.length !== source.length) return source
  return source.map((t, i) => ({ ...t, title: list[i].title || t.title, detail: list[i].detail || t.detail }))
}
