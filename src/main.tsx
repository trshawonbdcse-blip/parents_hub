import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts served from the app itself (no request to Google Fonts → no visitor IPs shared).
// Nunito: headings and big numbers. Figtree: body text (Nunito also covers Cyrillic body text).
import '@fontsource/figtree/400.css'
import '@fontsource/figtree/500.css'
import '@fontsource/figtree/600.css'
import '@fontsource/figtree/700.css'
import '@fontsource/figtree/800.css'
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import '@fontsource/nunito/900.css'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'
import { isNative } from './lib/native'
import { startAnalytics } from './lib/analytics'

startAnalytics()

// Installed apps on phones stay open for days, so look for a new version every hour
// and whenever the app comes back to the foreground; the page reloads itself when found.
// The iOS app ships its files inside the app; the service worker is only for the website.
if (!isNative) registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    setInterval(() => registration.update(), 60 * 60 * 1000)
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && registration.update())
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
