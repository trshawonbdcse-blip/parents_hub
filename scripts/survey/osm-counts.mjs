// One-off survey: how many OpenStreetMap places per "Just me" category and city.
// Run in GitHub Actions (Overpass is reachable there): node scripts/survey/osm-counts.mjs
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']

const CATEGORIES = {
  'Nature: hiking routes (relations)': 'relation["route"="hiking"]',
  'Nature: nature reserves': 'nwr["leisure"="nature_reserve"]',
  'Nature: viewpoints & towers': 'nwr["tourism"="viewpoint"]',
  'Gym': 'nwr["leisure"="fitness_centre"]',
  'Swimming pool (public)': 'nwr["leisure"="swimming_pool"]["access"!~"private|customers|no"]["name"]',
  'Water park': 'nwr["leisure"="water_park"]',
  'Spa (amenity/shop/leisure)': 'nwr["leisure"~"^(spa)$"]',
  'Sauna / public bath': 'nwr["leisure"="sauna"]',
  'Public bath': 'nwr["amenity"="public_bath"]',
  'Cinema': 'nwr["amenity"="cinema"]',
  'Theatre': 'nwr["amenity"="theatre"]',
  'Concert hall / music venue': 'nwr["amenity"~"^(concert_hall|music_venue)$"]',
  'Arts centre': 'nwr["amenity"="arts_centre"]',
  'Nightclub': 'nwr["amenity"="nightclub"]',
  'Yoga': 'nwr["sport"="yoga"]',
  'Museum': 'nwr["tourism"="museum"]',
  'Gallery': 'nwr["tourism"="gallery"]',
  'Beach (named)': 'nwr["natural"="beach"]["name"]',
  'Cycling routes (relations)': 'relation["route"="bicycle"]',
  'Ice rink': 'nwr["leisure"="ice_rink"]',
  'Ski pistes (nordic/downhill)': 'nwr["piste:type"]',
  'Climbing': 'nwr["sport"="climbing"]',
  'Padel': 'nwr["sport"="padel"]',
  'Tennis courts': 'nwr["sport"="tennis"]',
  'Bowling': 'nwr["leisure"="bowling_alley"]',
  'Escape room': 'nwr["leisure"="escape_game"]',
  'Sports centre (any)': 'nwr["leisure"="sports_centre"]',
}

// City boxes (south, west, north, east): good enough for a survey count.
const BOXES = {
  Tallinn: [59.35, 24.55, 59.51, 24.93],
  Tartu: [58.33, 26.64, 58.42, 26.81],
  Pärnu: [58.34, 24.43, 58.43, 24.6],
  Narva: [59.34, 28.13, 59.41, 28.23],
  'Ida-Viru (east)': [58.95, 26.9, 59.5, 28.25],
}

async function overpass(q) {
  for (let attempt = 0; attempt < 5; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ParentsHub-survey/1.0' }, signal: AbortSignal.timeout(400000) })
        if (r.ok) return await r.json()
        console.warn(url, r.status)
      } catch (e) {
        console.warn(url, e.message)
      }
    }
    await new Promise((r) => setTimeout(r, 30000 * (attempt + 1)))
  }
  throw new Error('Overpass unavailable')
}

// One download of everything (centre points + tags), then count per category and city locally.
const names = Object.keys(CATEGORIES)
const q = `[out:json][timeout:360];area["ISO3166-1"="EE"][admin_level=2]->.a;(${names.map((n) => `${CATEGORIES[n]}(area.a);`).join('')});out tags center;`
const j = await overpass(q)
console.log(`downloaded ${j.elements.length} elements`)
const matchers = Object.fromEntries(
  names.map((n) => {
    const sel = CATEGORIES[n]
    const type = sel.startsWith('relation') ? 'relation' : null
    const conds = [...sel.matchAll(/\["([^"]+)"(?:(=|!~|~)"([^"]*)")?\]/g)].map(([, k, op, v]) => ({ k, op, v }))
    return [n, (e) => (!type || e.type === type) && conds.every(({ k, op, v }) => {
      const val = e.tags?.[k]
      if (!op) return val !== undefined
      if (op === '=') return val === v
      if (op === '~') return val !== undefined && new RegExp(v).test(val)
      return val === undefined || !new RegExp(v).test(val)
    })]
  }),
)
const where = (e) => {
  const lat = e.center?.lat ?? e.lat, lon = e.center?.lon ?? e.lon
  return Object.entries(BOXES).filter(([, [s, w, n, ea]]) => lat >= s && lat <= n && lon >= w && lon <= ea).map(([k]) => k)
}
const areasList = ['Estonia', ...Object.keys(BOXES)]
const table = Object.fromEntries(areasList.map((a) => [a, Object.fromEntries(names.map((n) => [n, 0]))]))
for (const e of j.elements) {
  const inAreas = ['Estonia', ...where(e)]
  for (const n of names) if (matchers[n](e)) for (const a of inAreas) table[a][n]++
}

const areas = areasList
const md = ['# OSM counts per category and area', '', `| Category | ${areas.join(' | ')} |`, `|---|${areas.map(() => '---:').join('|')}|`, ...names.map((n) => `| ${n} | ${areas.map((a) => table[a][n] ?? '–').join(' | ')} |`)].join('\n')
console.log(md)
import fs from 'node:fs'
fs.writeFileSync('osm-counts.md', md)
fs.writeFileSync('osm-counts.json', JSON.stringify(table, null, 1))
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n\n')
