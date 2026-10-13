// QA: checks that every website, photo and event link answers (run where there is internet,
// e.g. GitHub Actions). Writes a Markdown report; exits 0 — broken links are reported, not fatal.
// usage: node scripts/qa/check-links.mjs [report.md]
import fs from 'node:fs'

const out = process.argv[2] ?? 'link-report.md'
const places = JSON.parse(fs.readFileSync('src/data/places.json', 'utf8'))
const events = fs.existsSync('src/data/events.json') ? JSON.parse(fs.readFileSync('src/data/events.json', 'utf8')).events ?? [] : []
const UA = 'Mozilla/5.0 (compatible; KuhuMinnaLinkCheck/1.0; +https://trshawonbdcse-blip.github.io/parents_hub/)'

const jobs = []
for (const p of places) {
  if (p.website) jobs.push({ kind: 'website', id: p.id, url: p.website })
  for (const ph of p.photos ?? []) jobs.push({ kind: 'photo', id: p.id, url: ph.src })
}
for (const e of events) if (e.url) jobs.push({ kind: 'event', id: e.id, url: e.url })

async function check(j) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const r = await fetch(j.url, { method, redirect: 'follow', headers: { 'User-Agent': UA, Accept: '*/*' }, signal: AbortSignal.timeout(20000) })
      if (r.ok) return { ...j, status: r.status, type: r.headers.get('content-type') ?? '' }
      if (method === 'GET') return { ...j, status: r.status }
    } catch (e) {
      if (method === 'GET') return { ...j, status: 0, error: e.cause?.code ?? e.message }
    }
  }
}

const results = []
let i = 0
await Promise.all(
  [...Array(8)].map(async () => {
    while (i < jobs.length) results.push(await check(jobs[i++]))
  }),
)
const broken = results.filter((r) => !(r.status >= 200 && r.status < 400) || (r.kind === 'photo' && r.type && !r.type.startsWith('image/')))
const lines = [`# Link check`, '', `Checked ${results.length} links: ${results.length - broken.length} OK, ${broken.length} problems.`, '']
if (broken.length) {
  lines.push('| Kind | Place / event | Status | URL |', '|---|---|---|---|')
  for (const b of broken.sort((a, c) => a.kind.localeCompare(c.kind) || a.id.localeCompare(c.id)))
    lines.push(`| ${b.kind} | ${b.id} | ${b.status || b.error}${b.kind === 'photo' && b.type && !b.type.startsWith('image/') ? ` (${b.type})` : ''} | ${b.url} |`)
}
fs.writeFileSync(out, lines.join('\n') + '\n')
console.log(lines.slice(0, 4).join('\n'))
for (const b of broken) console.log(`  ✗ ${b.kind} ${b.id}: ${b.status || b.error} ${b.url}`)
