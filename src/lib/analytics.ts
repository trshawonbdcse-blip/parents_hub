import { isNative } from './native'

// Plausible: cookie-free visitor counts, no personal data. Switched on by setting the
// repository variable PLAUSIBLE_SCRIPT to the site's script URL from the Plausible dashboard
// (e.g. https://plausible.io/js/pa-XXXX.js). Empty → nothing is loaded and nothing is sent.
const SCRIPT = import.meta.env.VITE_PLAUSIBLE_SCRIPT as string | undefined

type Plausible = ((event: string, options?: { props?: Record<string, string> }) => void) & {
  q?: unknown[]
  o?: unknown
  init?: (options?: Record<string, unknown>) => void
}

declare global {
  interface Window {
    plausible?: Plausible
  }
}

export const analyticsOn = Boolean(SCRIPT) && !isNative

export function startAnalytics() {
  if (!analyticsOn || window.plausible) return
  const p: Plausible = function (...args: unknown[]) {
    ;(p.q = p.q || []).push(args)
  } as Plausible
  p.init = (options) => {
    p.o = options || {}
  }
  window.plausible = p
  // The app uses #/ routes, so each screen change counts as a page view.
  p.init({ hashBasedRouting: true })
  const s = document.createElement('script')
  s.async = true
  s.src = SCRIPT!
  document.head.appendChild(s)
}

// A few anonymous counts that show whether the app helps: no ids of people, only the place.
export function track(event: string, props?: Record<string, string>) {
  if (!analyticsOn) return
  try {
    window.plausible?.(event, props ? { props } : undefined)
  } catch {
    // Analytics must never break the app.
  }
}
