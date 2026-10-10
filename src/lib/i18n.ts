import { useSyncExternalStore } from 'react'
import { DICT } from './dict'

export type Lang = 'en' | 'et' | 'ru'
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'et', label: 'Eesti' },
  { code: 'ru', label: 'Русский' },
]

const KEY = 'ph.lang'

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'et' || saved === 'ru') return saved
  } catch {
    // Storage blocked: fall back to the phone's language.
  }
  const nav = (navigator.languages?.[0] ?? navigator.language ?? 'en').toLowerCase()
  if (nav.startsWith('et')) return 'et'
  if (nav.startsWith('ru')) return 'ru'
  return 'en'
}

let current: Lang = detect()
const listeners = new Set<() => void>()
document.documentElement.lang = current

export function setLang(lang: Lang) {
  current = lang
  document.documentElement.lang = lang
  try {
    localStorage.setItem(KEY, lang)
  } catch {
    // Keep the choice for this session only.
  }
  listeners.forEach((l) => l())
}

export const getLang = () => current

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

// English text is the key; missing translations fall back to English.
// {name} placeholders are filled from vars.
export function translate(text: string, vars?: Record<string, string | number>, lang: Lang = current): string {
  const out = lang === 'en' ? text : (DICT[text]?.[lang] ?? text)
  return vars ? out.replace(/\{(\w+)\}/g, (_: string, k: string) => String(vars[k] ?? '')) : out
}

// Re-renders the component when the language changes.
export function useT() {
  const lang = useSyncExternalStore(subscribe, getLang)
  const t = (text: string, vars?: Record<string, string | number>) => translate(text, vars, lang)
  return { t, lang, locale: lang === 'et' ? 'et-EE' : lang === 'ru' ? 'ru-RU' : 'en-GB' }
}

export const localeOf = (lang: Lang = current) => (lang === 'et' ? 'et-EE' : lang === 'ru' ? 'ru-RU' : 'en-GB')
