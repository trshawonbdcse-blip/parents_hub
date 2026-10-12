import { useEffect, useState } from 'react'
import { translate as tr } from './i18n'

// "updated 3 min ago", refreshed every minute so the label stays honest.
export function useAgo() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return (at: Date | number) => {
    const min = Math.max(0, Math.round((now - new Date(at).getTime()) / 60_000))
    if (min < 1) return tr('updated just now')
    if (min < 60) return tr('updated {n} min ago', { n: min })
    return tr('updated {n} h ago', { n: Math.round(min / 60) })
  }
}
