// Which of our hand-added places need a fresh look at prices and opening hours?
// Usage: node scripts/qa/freshness.mjs [report.md] [--json]
// A place counts as out of date 180 days after its last check (the app then shows a warning).
import fs from 'node:fs'

const STALE_DAYS = 180
const SOON_DAYS = 150
const places = JSON.parse(fs.readFileSync('src/data/places.json', 'utf8'))
const now = Date.now()
const age = (d) => Math.floor((now - new Date(d).getTime()) / 864e5)
// Places parents see most: with reviewed photos (shown first and in Featured), then the rest.
const popular = (p) => (p.photos?.length ? 0 : 1)

const rows = places.map((p) => ({ id: p.id, name: p.name, city: p.city, website: p.website, days: p.lastVerified ? age(p.lastVerified) : null, popular: popular(p) }))
const stale = rows.filter((r) => r.days !== null && r.days > STALE_DAYS).sort((a, b) => a.popular - b.popular || b.days - a.days)
const soon = rows.filter((r) => r.days !== null && r.days > SOON_DAYS && r.days <= STALE_DAYS).sort((a, b) => b.days - a.days)
const never = rows.filter((r) => r.days === null).sort((a, b) => a.popular - b.popular || a.name.localeCompare(b.name))

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ stale, soon, never }, null, 1))
  process.exit(0)
}

const line = (r) => `- ${r.name} (${r.city}) · \`${r.id}\`${r.days !== null ? ` · checked ${r.days} days ago` : ''}${r.website ? ` · ${r.website}` : ''}`
const md = [
  '# Place freshness',
  '',
  `${places.length} places added by hand: ${rows.length - never.length - stale.length} up to date, ${stale.length} out of date (over ${STALE_DAYS} days), ${soon.length} due within a month, ${never.length} never checked.`,
  '',
  stale.length ? `## Out of date (the app shows a warning)\n${stale.map(line).join('\n')}\n` : '',
  soon.length ? `## Due within a month\n${soon.map(line).join('\n')}\n` : '',
  never.length ? `## Never checked (most visible first, top 30)\n${never.slice(0, 30).map(line).join('\n')}\n` : '',
].join('\n')
const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null
if (out) fs.writeFileSync(out, md)
console.log(md.split('\n').slice(0, 3).join('\n'))
