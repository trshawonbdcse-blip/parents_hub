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

const AREAS = {
  Estonia: 'area["ISO3166-1"="EE"][admin_level=2]',
  Tallinn: 'area["name"="Tallinn"]["boundary"="administrative"]',
  Tartu: 'area["name"="Tartu linn"]["boundary"="administrative"]',
  Pärnu: 'area["name"="Pärnu linn"]["boundary"="administrative"]',
  Narva: 'area["name"="Narva linn"]["boundary"="administrative"]',
  'Ida-Viru county': 'area["name"="Ida-Viru maakond"]["boundary"="administrative"]',
}

async function overpass(q) {
  for (const url of ENDPOINTS) {
    try {
      const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ParentsHub-survey/1.0' } })
      if (r.ok) return await r.json()
      console.warn(url, r.status)
    } catch (e) {
      console.warn(url, e.message)
    }
  }
  throw new Error('Overpass unavailable')
}

const names = Object.keys(CATEGORIES)
const table = {}
for (const [areaName, areaSel] of Object.entries(AREAS)) {
  const q = `[out:json][timeout:180];${areaSel}->.a;` + names.map((n) => `${CATEGORIES[n].replace(/^(nwr|relation)/, '$1')}(area.a);out count;`).join('')
  const j = await overpass(q)
  const counts = j.elements.filter((e) => e.type === 'count').map((e) => Number(e.tags.total))
  table[areaName] = Object.fromEntries(names.map((n, i) => [n, counts[i] ?? null]))
  console.log(`done ${areaName}`)
  await new Promise((r) => setTimeout(r, 3000))
}

const areas = Object.keys(AREAS)
const md = ['# OSM counts per category and area', '', `| Category | ${areas.join(' | ')} |`, `|---|${areas.map(() => '---:').join('|')}|`, ...names.map((n) => `| ${n} | ${areas.map((a) => table[a][n] ?? '–').join(' | ')} |`)].join('\n')
console.log(md)
import fs from 'node:fs'
fs.writeFileSync('osm-counts.md', md)
fs.writeFileSync('osm-counts.json', JSON.stringify(table, null, 1))
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n\n')
