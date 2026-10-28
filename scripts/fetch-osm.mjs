// Places across Estonia from OpenStreetMap: family places (playgrounds, parks, libraries, museums, pools,
// beaches, ice rinks…) and, for "Just me" mode, gyms, cinemas, theatres, galleries and nature spots, via the Overpass API. These complement the hand-checked places in
// places.json: anything near a hand-checked place of the same kind is skipped.
// Writes public/data/osm-places.json (compact keys, loaded by the app on demand).
// Data © OpenStreetMap contributors, ODbL — the app shows the attribution.
import fs from 'node:fs'

const OUT = 'public/data/osm-places.json'
const UA = 'KuhuMinnaBot/1.0 (https://trshawonbdcse-blip.github.io/parents_hub/)'
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']
const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null
const VERSION = 3

// Refresh weekly; in between the cached file is reused.
const fresh = previous?.updatedAt && previous.version === VERSION && Date.now() - new Date(previous.updatedAt).getTime() < 6 * 864e5
if (fresh && !process.env.OSM_FORCE) {
  console.log(`OSM: data from ${previous.updatedAt} (${previous.places.length} places) is recent; skipping`)
  process.exit(0)
}

// The whole import gets at most 15 minutes, so a slow map server never holds up a deploy.
// Whatever didn't arrive in time keeps its previous places and is tried again next deploy.
const DEADLINE = Date.now() + 15 * 60000
const timeLeft = () => DEADLINE - Date.now()

async function overpass(query) {
  // The public Overpass servers are often busy: try each one, a few rounds, before giving up.
  for (let round = 0; round < 3; round++) {
    for (const url of ENDPOINTS) {
      if (timeLeft() < 20000) throw new Error('out of time')
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query),
          signal: AbortSignal.timeout(Math.min(240000, timeLeft())),
        })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const j = await r.json()
        // A query that runs out of time or memory still answers 200, with the error in "remark".
        if (/error|timed out|out of memory/i.test(j.remark ?? '')) throw new Error(j.remark.slice(0, 120))
        return j.elements ?? []
      } catch (e) {
        console.warn(`${url}: ${e.message}`)
      }
    }
    await new Promise((res) => setTimeout(res, Math.min(30000 * (round + 1), Math.max(0, timeLeft() - 20000))))
  }
  throw new Error('all Overpass endpoints failed')
}

const AREA = 'area["ISO3166-1"="EE"][admin_level=2]->.ee;'
const NOT_PRIVATE = '["access"!~"^(private|customers|no|permissive_school)$"]'
// Split into small queries so one busy server or slow query doesn't lose everything.
// If a group fails, its places from the previous run are kept.
const GROUPS = [
  // Sights for visitors: only well-known ones (with a Wikidata entry), plus named viewpoints.
  // Split in three small queries; a heavy one makes the map server give up.
  { cats: ['viewpoint'], q: `nwr["tourism"="viewpoint"]["name"](area.ee);nwr["man_made"="tower"]["tower:type"="observation"]["name"](area.ee);` },
  { cats: ['sight'], q: `nwr["historic"~"^(castle|manor|fort|city_gate|city_walls|monastery|ruins|church|lighthouse|windmill)$"]["name"]["wikidata"](area.ee);nwr["man_made"="lighthouse"]["name"]["wikidata"](area.ee);` },
  { cats: ['sight'], q: `nwr["tourism"="attraction"]["name"]["wikidata"](area.ee);nwr["amenity"="place_of_worship"]["name"]["wikidata"]["heritage"](area.ee);` },
  { cats: ['playground', 'indoor-play'], q: `nwr["leisure"="playground"]${NOT_PRIVATE}(area.ee);nwr["leisure"="indoor_play"](area.ee);` },
  { cats: ['library', 'museum', 'zoo-farm'], q: `nwr["amenity"="library"](area.ee);nwr["tourism"="museum"]["name"](area.ee);nwr["tourism"="gallery"]["name"](area.ee);nwr["tourism"="zoo"](area.ee);` },
  { cats: ['swimming', 'winter-fun'], q: `nwr["leisure"="water_park"](area.ee);nwr["leisure"="sports_centre"]["sport"~"swimming"](area.ee);nwr["leisure"="swimming_pool"]["name"]${NOT_PRIVATE}["indoor"!="no"](area.ee);nwr["leisure"="ice_rink"](area.ee);` },
  { cats: ['park', 'beach'], q: `nwr["tourism"="theme_park"](area.ee);nwr["leisure"="park"]["name"](area.ee);nwr["natural"="beach"]["name"](area.ee);nwr["leisure"="beach_resort"](area.ee);` },
  { cats: ['gym', 'cinema', 'theatre'], q: `nwr["leisure"="fitness_centre"]["name"](area.ee);nwr["amenity"="cinema"]["name"](area.ee);nwr["amenity"~"^(theatre|concert_hall|music_venue)$"]["name"](area.ee);` },
  { cats: ['nature'], q: `nwr["leisure"="nature_reserve"]["name"](area.ee);relation["route"="hiking"]["name"](area.ee);` },
]
const groupQuery = (g) => `[out:json][timeout:170];${AREA}(${g.q});out center tags;`
const PLACES = `[out:json][timeout:120];${AREA}node["place"~"^(city|town|village|suburb|quarter|neighbourhood|borough)$"]["name"](area.ee);out;`

function category(t) {
  if (t.leisure === 'playground') return 'playground'
  if (t.leisure === 'indoor_play') return 'indoor-play'
  if (t.amenity === 'library') return 'library'
  if (t.tourism === 'museum') return 'museum'
  if (t.leisure === 'water_park' || t.leisure === 'swimming_pool' || (t.leisure === 'sports_centre' && /swimming/.test(t.sport ?? ''))) return 'swimming'
  if (t.tourism === 'zoo') return 'zoo-farm'
  if (t.tourism === 'theme_park') return 'park'
  if (t.leisure === 'park') return 'park'
  if (t.natural === 'beach' || t.leisure === 'beach_resort') return 'beach'
  if (t.leisure === 'ice_rink') return 'winter-fun'
  // "Just me" mode (adults)
  if (t.leisure === 'fitness_centre') return 'gym'
  if (t.amenity === 'cinema') return 'cinema'
  if (['theatre', 'concert_hall', 'music_venue'].includes(t.amenity)) return 'theatre'
  if (t.tourism === 'gallery') return 'museum'
  if (t.tourism === 'viewpoint' || (t.man_made === 'tower' && t['tower:type'] === 'observation')) return 'viewpoint'
  if (t.leisure === 'nature_reserve' || t.route === 'hiking') return 'nature'
  // Sights
  if (t.historic || t.tourism === 'attraction' || t.amenity === 'place_of_worship' || t.man_made === 'lighthouse') return 'sight'
  return null
}

const HUBS = {
  Tallinn: [59.437, 24.7536], Tartu: [58.378, 26.729], Pärnu: [58.385, 24.497], Narva: [59.377, 28.19], Jõhvi: [59.359, 27.421],
  Rakvere: [59.346, 26.355], Viljandi: [58.363, 25.59], Haapsalu: [58.943, 23.541], Kuressaare: [58.253, 22.485], Kärdla: [58.997, 22.749],
  Paide: [58.885, 25.557], Rapla: [59.007, 24.793], Võru: [57.834, 27.019], Valga: [57.777, 26.047], Põlva: [58.06, 27.069],
  Jõgeva: [58.746, 26.394], Otepää: [58.058, 26.496],
}
const km = (a1, o1, a2, o2) => {
  const r = Math.PI / 180
  const x = (o2 - o1) * r * Math.cos(((a1 + a2) / 2) * r)
  const y = (a2 - a1) * r
  return Math.sqrt(x * x + y * y) * 6371
}
const nearestHub = (la, lo) => Object.entries(HUBS).reduce((b, [n, [a, o]]) => (km(la, lo, a, o) < b.d ? { n, d: km(la, lo, a, o) } : b), { n: 'Tallinn', d: Infinity }).n

let placeNodes
// Place names first: without them nothing can be labelled, so they get the time first.
try {
  placeNodes = await overpass(PLACES)
} catch (e) {
  // Never block a deploy on a busy map server: keep the previous list and try again next run.
  console.warn(`OSM: ${e.message}; keeping the previous file`)
  if (!previous) fs.writeFileSync(OUT, JSON.stringify({ version: VERSION, updatedAt: null, places: [] }) + '\n')
  process.exit(0)
}
const elements = []
const failedCats = []
for (const g of GROUPS) {
  try {
    const found = await overpass(groupQuery(g))
    console.log(`OSM: group ${g.cats.join('/')}: ${found.length} features`)
    elements.push(...found)
  } catch (e) {
    console.warn(`OSM: group ${g.cats.join('/')} failed (${e.message}); keeping its previous places`)
    failedCats.push(...g.cats)
  }
}
console.log(`OSM: ${elements.length} features, ${placeNodes.length} place names`)
if (elements.length < 300 && failedCats.length === GROUPS.flatMap((g) => g.cats).length) {
  console.warn('OSM: suspiciously few features; keeping previous file')
  if (!previous) fs.writeFileSync(OUT, JSON.stringify({ version: VERSION, updatedAt: null, places: [] }) + '\n')
  process.exit(0)
}

// Area name: the nearest district/neighbourhood if close, else the nearest town or village.
const local = placeNodes.filter((n) => ['suburb', 'quarter', 'neighbourhood', 'borough'].includes(n.tags.place))
const towns = placeNodes.filter((n) => ['city', 'town', 'village'].includes(n.tags.place))
function areaOf(la, lo, t) {
  const tagged = t['addr:suburb'] ?? t['addr:district']
  if (tagged) return tagged
  let best = null
  for (const n of local) {
    const d = km(la, lo, n.lat, n.lon)
    if (d < 1.5 && (!best || d < best.d)) best = { name: n.tags.name, d }
  }
  if (best) return best.name
  for (const n of towns) {
    const d = km(la, lo, n.lat, n.lon)
    if (!best || d < best.d) best = { name: n.tags.name, d }
  }
  return t['addr:city'] ?? t['addr:place'] ?? best?.name ?? null
}

const curated = JSON.parse(fs.readFileSync('src/data/places.json', 'utf8'))
const clash = (cat, la, lo) => curated.some((p) => { const d = km(la, lo, p.lat, p.lng); return d < 0.06 || (d < 0.15 && p.category === cat) })

const seen = new Set()
const out = []
for (const e of elements) {
  const t = e.tags ?? {}
  const cat = category(t)
  const la = e.lat ?? e.center?.lat
  const lo = e.lon ?? e.center?.lon
  if (!cat || la == null || lo == null) continue
  if (clash(cat, la, lo)) continue
  // The same thing mapped twice (node + area) — keep one per kind per ~30 m.
  const key = `${cat}:${la.toFixed(3)}:${lo.toFixed(3)}:${t.name ?? ''}`
  if (seen.has(key)) continue
  seen.add(key)
  const rec = { i: `${e.type[0]}${e.id}`, c: cat, la: +la.toFixed(5), lo: +lo.toFixed(5), h: nearestHub(la, lo) }
  const add = (k, v) => { if (v != null && v !== '') rec[k] = v }
  add('n', t['name:et'] ?? t.name)
  add('en', t['name:en'])
  add('ru', t['name:ru'])
  add('a', areaOf(la, lo, t))
  add('ad', [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ') || null)
  add('f', t.fee === 'no' ? 0 : t.fee === 'yes' ? 1 : null)
  add('oh', t.opening_hours)
  add('w', t.website ?? t['contact:website'])
  add('p', t.phone ?? t['contact:phone'])
  add('em', t.email ?? t['contact:email'])
  add('wc', t.wheelchair)
  add('ct', t.changing_table)
  add('to', t.toilets)
  add('in', t.indoor === 'yes' || t.leisure === 'indoor_play' ? 1 : null)
  add('lit', t.lit === 'yes' ? 1 : null)
  out.push(rec)
}

// Groups that failed this time keep their places from the last good run.
if (failedCats.length && previous?.places) {
  const have = new Set(out.map((r) => r.i))
  out.push(...previous.places.filter((r) => failedCats.includes(r.c) && !have.has(r.i)))
}

const byCat = out.reduce((m, r) => ({ ...m, [r.c]: (m[r.c] ?? 0) + 1 }), {})
console.log(`OSM: ${out.length} places after de-duplication`, byCat)
fs.mkdirSync('public/data', { recursive: true })
// A partial run is not marked fresh, so the next deploy tries the missing groups again.
fs.writeFileSync(OUT, JSON.stringify({ version: VERSION, updatedAt: failedCats.length ? null : new Date().toISOString(), places: out }) + '\n')
