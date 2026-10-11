import { Capacitor } from '@capacitor/core'

// True inside the iOS app (Capacitor), false on the website.
export const isNative = Capacitor.isNativePlatform()

export const WEB_URL = 'https://trshawonbdcse-blip.github.io/parents_hub/'

// Live data (events, OpenStreetMap places) comes from the website, so the app stays
// current between App Store releases.
export const DATA_BASE = isNative ? WEB_URL : import.meta.env.BASE_URL

// Public link to a page of the app (the iOS app's own URL isn't shareable).
export const shareUrl = (hashPath: string) => (isNative ? `${WEB_URL}#${hashPath}` : location.href)

export async function shareContent(opts: { title: string; text: string; url: string }) {
  if (isNative) {
    const { Share } = await import('@capacitor/share')
    await Share.share({ title: opts.title, text: opts.text, url: opts.url, dialogTitle: opts.title })
    return
  }
  if (navigator.share) await navigator.share(opts)
  else await navigator.clipboard.writeText(`${opts.text}\n${opts.url}`)
}

const WEEKEND_ID = 1001

// Weekly "weekend plan" reminder on Thursday evening (iOS app only; no server needed).
export async function setWeekendReminder(on: boolean, title: string, body: string): Promise<boolean> {
  if (!isNative) return false
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.cancel({ notifications: [{ id: WEEKEND_ID }] })
  if (!on) return false
  const perm = await LocalNotifications.requestPermissions()
  if (perm.display !== 'granted') return false
  await LocalNotifications.schedule({
    notifications: [{ id: WEEKEND_ID, title, body, schedule: { on: { weekday: 5, hour: 18, minute: 0 }, allowWhileIdle: true } }],
  })
  return true
}
