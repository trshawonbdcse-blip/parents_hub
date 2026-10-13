// One-off survey: licence and access details of open datasets we may use.
// Prints the raw metadata it finds so a person can read the licence fields.
const tryFetch = async (url, opts = {}) => {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'ParentsHub-survey/1.0', Accept: 'application/json, text/html;q=0.9, */*;q=0.5' }, ...opts })
    const text = await r.text()
    return { status: r.status, type: r.headers.get('content-type'), text }
  } catch (e) {
    return { status: 0, text: e.message }
  }
}
const strip = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const around = (text, words, n = 400) => {
  const out = []
  for (const w of words) {
    const re = new RegExp(w, 'gi')
    let m, k = 0
    while ((m = re.exec(text)) && k < 3) { out.push(`…${text.slice(Math.max(0, m.index - n / 2), m.index + n / 2)}…`); k++ }
  }
  return out
}
const lines = ['# Dataset licences (raw findings)', '']
const report = (title, r, words = ['litsents', 'license', 'licence', 'CC BY', 'CC-BY', 'avaandmete', 'tingimus', 'terms']) => {
  lines.push(`## ${title}`, `HTTP ${r.status} ${r.type ?? ''}`)
  const text = r.type?.includes('json') ? r.text : strip(r.text)
  const hits = around(text, words)
  lines.push(...(hits.length ? hits.slice(0, 6).map((h) => `- ${h}`) : [`- (no licence words found) ${text.slice(0, 300)}`]), '')
}

// Estonian open data portal (andmed.eesti.ee): find datasets, then read each one's licence fields.
const seen = new Set()
for (const q of ['turism', 'vaatamisväärsus', 'puhkaeestis', 'Ettevõtluse ja Innovatsiooni', 'supluskoh', 'spordirajatis', 'spordiregister', 'matkarada', 'RMK', 'Riigimetsa', 'muuseum', 'üritus', 'kultuur']) {
  const r = await tryFetch(`https://andmed.eesti.ee/api/datasets?search=${encodeURIComponent(q)}&limit=10`)
  let list = []
  try { list = JSON.parse(r.text).data ?? [] } catch { /* not JSON */ }
  lines.push(`### search "${q}": ${list.length} datasets`)
  for (const d of list) {
    if (seen.has(d.id)) continue
    seen.add(d.id)
    const det = await tryFetch(`https://andmed.eesti.ee/api/datasets/${d.id}`)
    let info = ''
    try {
      const j = JSON.parse(det.text)
      const flat = JSON.stringify(j)
      const lic = [...flat.matchAll(/"[^"]*licen[cs]e[^"]*"\s*:\s*("[^"]*"|\{[^}]*\}|null)/gi)].map((m) => m[0]).slice(0, 4).join(' ; ')
      const org = j.organization?.name ?? j.data?.organization?.name ?? ''
      const upd = j.updateIntervalUnit ?? j.data?.updateIntervalUnit ?? ''
      info = `org: ${org} · update: ${upd} · ${lic || 'licence field not found: ' + flat.slice(0, 300)}`
    } catch { info = `HTTP ${det.status}` }
    lines.push(`- **${d.title}** (${d.slug}) — ${info}`)
  }
}
lines.push('')

const pages = {
  'Visit Estonia open data (info)': 'https://www.visitestonia.com/en/open-data',
  'Visit Estonia API (puhkaeestis)': 'https://www.puhkaeestis.ee/et/avaandmed',
  'Sports register open data': 'https://www.spordiregister.ee/et/avaandmed',
  'RMK data use terms': 'https://www.rmk.ee/rmk/rmk-avaandmed',
  'Land Board open data licence': 'https://geoportaal.maaamet.ee/est/Andmed-ja-kaardid/Litsentsitingimused-p694.html',
  'Fienta API docs': 'https://fienta.com/api',
  'Fienta terms': 'https://fienta.com/terms',
  'Stebby terms': 'https://stebby.eu/terms',
}
for (const [title, url] of Object.entries(pages)) report(`${title} — ${url}`, await tryFetch(url))

import fs from 'node:fs'
const md = lines.join('\n')
console.log(md)
fs.writeFileSync('licences.md', md)
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.slice(0, 60000) + '\n')
