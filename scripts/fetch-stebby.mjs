// Checks which places are Stebby partners using Stebby's public search (the same API
// app.stebby.eu/search uses, no login). A place matches when a Stebby point of sale
// with a similar name is within a few hundred metres. Writes src/data/stebby.json.
// Runs before each build; on failure the previous file is kept.
import fs from 'node:fs'

const OUT = 'src/data/stebby.json'
const API = 'https://api.stebby.eu/graphql/user'
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'
const places = JSON.parse(fs.readFileSync('src/data/places.json', 'utf8'))
const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const QUERY = `query searchQuery($filters: SearchFiltersGraphQLInputType, $limit: Int, $page: Int, $language_abbr: String) {
  data: SearchQuery(filters: $filters, limit: $limit, page: $page, language_abbr: $language_abbr) {
    data { id hash type name latitude longitude address city pos_name pos_hash service_categories ticket_starting_from }
    total
  }
}`

let cookie = ''
let xsrf = ''
async function session() {
  // Laravel-style CSRF cookie, in case the API asks for it.
  try {
    const r = await fetch('https://api.stebby.eu/sanctum/csrf-cookie', { headers: { 'User-Agent': UA, Origin: 'https://app.stebby.eu' } })
    const set = r.headers.getSetCookie?.() ?? []
    cookie = set.map((c) => c.split(';')[0]).join('; ')
    const t = set.find((c) => c.startsWith('XSRF-TOKEN='))
    if (t) xsrf = decodeURIComponent(t.split(';')[0].slice('XSRF-TOKEN='.length))
  } catch {
    // Not needed if the search answers without it.
  }
}

async function search(keyword) {
  const body = JSON.stringify({
    operationName: 'searchQuery',
    query: QUERY,
    variables: {
      filters: { categories: [], countries: [], cities: [], boolean_filters: [], distance_from_user: null, location: null, type: null, area: null, price_from: null, price_to: null, keyword },
      page: 1,
      limit: 20,
      language_abbr: 'et-ee',
    },
  })
  const headers = { 'User-Agent': UA, 'Content-Type': 'application/json', Accept: 'application/json', Origin: 'https://app.stebby.eu', Referer: 'https://app.stebby.eu/', 'Accept-Language': 'et-ee' }
  if (cookie) headers.Cookie = cookie
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf
  const r = await fetch(API, { method: 'POST', headers, body, signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const j = await r.json()
  if (j.errors?.length) throw new Error(j.errors[0].message)
  return j.data?.data?.data ?? []
}

const metres = (a, b) => {
  const r = Math.PI / 180
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r)
  const y = (b.lat - a.lat) * r
  return Math.round(Math.sqrt(x * x + y * y) * 6371000)
}
const words = (s) =>
  new Set(
    (s ?? '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\d ]+/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['the', 'and', 'park', 'centre', 'center', 'keskus', 'tallinn', 'tartu', 'pärnu', 'parnu'].includes(w)),
  )
const shareWord = (a, b) => [...words(a)].some((w) => words(b).has(w))

// Short search words: the local name, the English name, and the name without generic words.
const queries = (p) => [...new Set([p.nameLocal, p.name, [...words(p.nameLocal ?? p.name)].slice(0, 2).join(' ')].filter((q) => q && q.length > 2))]

// The partner list changes slowly: a full check once a week is enough.
const fresh = previous?.updatedAt && Date.now() - new Date(previous.updatedAt).getTime() < 6 * 864e5
if (fresh && places.every((p) => previous.checked.includes(p.id)) && !process.env.STEBBY_FORCE) {
  console.log(`Stebby: list from ${previous.updatedAt} is recent; skipping`)
  process.exit(0)
}

await session()
const matches = {}
const checked = []
let failures = 0
for (const p of places) {
  let best = null
  for (const q of queries(p)) {
    let results
    try {
      results = await search(q)
    } catch (e) {
      failures++
      console.warn(`${p.id}: "${q}" failed — ${e.message}`)
      if (failures > 15) break
      continue
    }
    for (const s of results) {
      if (!s.latitude || !s.longitude) continue
      const d = metres(p, { lat: Number(s.latitude), lng: Number(s.longitude) })
      const named = shareWord(`${p.name} ${p.nameLocal ?? ''}`, `${s.name} ${s.pos_name ?? ''}`)
      // Same building (very close) or similar name nearby.
      if (d <= 60 || (named && d <= 400)) {
        if (!best || d < best.distanceM) {
          best = { hash: s.pos_hash ?? s.hash, name: s.pos_name ?? s.name, distanceM: d, categories: s.service_categories ?? [], from: s.ticket_starting_from ?? null }
        }
      }
    }
    await sleep(400)
  }
  if (failures > 15) break
  checked.push(p.id)
  if (best) {
    matches[p.id] = best
    console.log(`✓ ${p.id} → ${best.name} (${best.distanceM} m)`)
  }
}

if (failures > 15 || checked.length < places.length * 0.8) {
  console.warn(`Stebby check incomplete (${checked.length}/${places.length}, ${failures} failures); keeping previous file`)
  if (!previous) fs.writeFileSync(OUT, JSON.stringify({ updatedAt: null, checked: [], matches: {} }, null, 1) + '\n')
  process.exit(0)
}
fs.writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), checked, matches }, null, 1) + '\n')
console.log(`Stebby: ${Object.keys(matches).length} of ${checked.length} places are partners`)
