// Calendar feeds of kids' events per town (public/ics/<town>.ics and all.ics), so parents can
// subscribe once and see new events in their phone calendar. Runs after fetch-events.mjs.
import fs from 'node:fs'

const { events } = JSON.parse(fs.readFileSync('src/data/events.json', 'utf8'))
const towns = JSON.parse(fs.readFileSync('src/data/towns.json', 'utf8')).towns.map(([, hub]) => hub)
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^a-z]+/g, '-')
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => `\\${m}`)
const stamp = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const day = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Europe/Tallinn' }).replace(/-/g, '')
const APP = 'https://trshawonbdcse-blip.github.io/parents_hub/'

function feed(name, list) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kuhu Minna//Kids events//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(name)}`, 'X-WR-TIMEZONE:Europe/Tallinn', 'REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H']
  for (const e of list) {
    lines.push('BEGIN:VEVENT', `UID:${esc(e.id)}@parents-hub`, `DTSTAMP:${stamp(Date.now())}`)
    if (e.allDay) lines.push(`DTSTART;VALUE=DATE:${day(e.start)}`)
    else {
      lines.push(`DTSTART:${stamp(e.start)}`)
      lines.push(`DTEND:${stamp(e.end && new Date(e.end) > new Date(e.start) ? e.end : new Date(new Date(e.start).getTime() + 3600e3))}`)
    }
    lines.push(`SUMMARY:${esc(e.title)}`)
    const where = [e.venue, e.address].filter(Boolean).join(', ')
    if (where) lines.push(`LOCATION:${esc(where)}`)
    lines.push(`DESCRIPTION:${esc(`${e.price ? e.price + '\n' : ''}${APP}#/event/${encodeURIComponent(e.id)}`)}`)
    lines.push(`URL:${APP}#/event/${encodeURIComponent(e.id)}`, 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  // Fold long lines (RFC 5545: 75 octets).
  return lines.map((l) => l.match(/.{1,70}/gu).join('\r\n ')).join('\r\n') + '\r\n'
}

fs.mkdirSync('public/ics', { recursive: true })
fs.writeFileSync('public/ics/all.ics', feed('Kuhu Minna — kids’ events in Estonia', events))
for (const town of new Set(towns)) {
  const list = events.filter((e) => !e.city || e.city === town)
  fs.writeFileSync(`public/ics/${slug(town)}.ics`, feed(`Kuhu Minna — kids’ events, ${town}`, list))
}
console.log(`Calendar feeds written for ${new Set(towns).size} towns`)
