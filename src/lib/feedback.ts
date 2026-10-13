import { WEB_URL } from './native'

// Where "Report a mistake" e-mails go. Set the repository variable CONTACT_EMAIL to turn it on;
// without it the button is hidden.
export const CONTACT_EMAIL = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || ''

// A pre-filled e-mail about one place or event, so the report says exactly what it is about.
export function mistakeMail(subject: string, path: string, prompt: string) {
  const body = `${prompt}\n\n\n—\n${WEB_URL}#${path}`
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Parents Hub: ${subject}`)}&body=${encodeURIComponent(body)}`
}
