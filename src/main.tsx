import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'
import { isNative } from './lib/native'

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
