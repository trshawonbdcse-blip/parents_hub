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

// Estonian open data portal (andmed.eesti.ee): try its API and the search page.
for (const q of ['turismi', 'Visit Estonia', 'supluskoh', 'spordiregister', 'RMK']) {
  for (const url of [`https://andmed.eesti.ee/api/datasets?search=${encodeURIComponent(q)}&limit=5`, `https://andmed.eesti.ee/api/v1/datasets?q=${encodeURIComponent(q)}`, `https://andmed.eesti.ee/datasets?search=${encodeURIComponent(q)}`]) {
    const r = await tryFetch(url)
    if (r.status === 200) { report(`andmed.eesti.ee "${q}" — ${url}`, r); break }
    lines.push(`- ${url} → HTTP ${r.status}`)
  }
}
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
