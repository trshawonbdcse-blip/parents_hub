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

// Exactly the query app.stebby.eu sends.
const QUERY = "query searchQuery($filters: SearchFiltersGraphQLInputType, $limit: Int, $page: Int, $orderBy: SearchOrderByTypeGraphQLEnumType, $direction: DirectionTypeEnum, $country_abbr: String, $language_abbr: String) {\n  data: SearchQuery(\n    filters: $filters\n    limit: $limit\n    page: $page\n    order_by: $orderBy\n    direction: $direction\n    country_abbr: $country_abbr\n    language_abbr: $language_abbr\n  ) {\n    data {\n      ...UserSearchResult\n      __typename\n    }\n    total\n    totals {\n      pos\n      service\n      event\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment UserSearchResult on SphinxResultGraphQLType {\n  id\n  hash\n  type\n  name\n  latitude\n  longitude\n  mobile_cover_url\n  description\n  open_by_prior\n  is_virtual\n  open_status\n  open_from\n  open_to\n  address\n  city\n  country_code\n  is_campaign\n  is_compensated\n  pos_name\n  pos_hash\n  ticket_starting_from\n  service_categories\n  distance_from_user\n  is_est_tax_exemption\n  start_at\n  end_at\n  is_favourite\n  __typename\n}"

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
      orderBy: null,
      direction: null,
      page: 1,
      limit: 20,
      language_abbr: 'et-ee',
      country_abbr: null,
    },
  })
  const headers = { 'User-Agent': UA, 'Content-Type': 'application/json', Accept: 'application/json', Origin: 'https://app.stebby.eu', Referer: 'https://app.stebby.eu/', 'Accept-Language': 'et-ee', 'web-client-version': '86ff721' }
  if (cookie) headers.Cookie = cookie
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf
  const r = await fetch(API, { method: 'POST', headers, body, signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 300)}`)
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
      .filter((w) => w.length > 2 && !['the', 'and', 'park', 'centre', 'center', 'keskus', 'spa', 'mtü', 'tallinn', 'tartu', 'pärnu', 'parnu', 'narva'].includes(w)),
  )
// The partner's own name must start with a word from our place's name ("Aura Keskus" ↔ "Aura water
// park"), so shops and clinics in the same building or street don't count.
const firstWord = (s) => [...words(s)][0]
const sameName = (p, s) => {
  const w = firstWord(s.pos_name ?? s.name)
  return Boolean(w) && words(`${p.name} ${p.nameLocal ?? ''}`).has(w)
}
// A brand-like name ("Garantbaby", "MyFitness", two shared words like "elamus" + "mustamae") is
// specific enough to accept a partner further away — our coordinates or theirs can be off.
const strongName = (p, s) => {
  const ours = words(`${p.name} ${p.nameLocal ?? ''}`)
  const shared = [...words(`${s.name} ${s.pos_name ?? ''}`)].filter((w) => ours.has(w))
  return sameName(p, s) && (shared.length >= 2 || shared.some((w) => w.length >= 6))
}
// Stebby is a sport and wellbeing budget: only check places where it can realistically apply.
const RELEVANT = new Set(['swimming', 'class', 'winter-fun', 'indoor-play'])
// Bump when the matching rules change, so the next build re-checks everything.
const VERSION = 3
// Matches confirmed by hand ({ placeId: { hash, name } }), for partners the search can't pair up.
const OVERRIDES = fs.existsSync('scripts/stebby/overrides.json') ? JSON.parse(fs.readFileSync('scripts/stebby/overrides.json', 'utf8')) : {}

// Short search words: the local name, the English name, and the name without generic words.
const queries = (p) =>
  [...new Set([p.nameLocal, p.name, [...words(p.nameLocal ?? p.name)].slice(0, 2).join(' '), [...words(p.name)][0]].filter((q) => q && q.length > 2))]

// The partner list changes slowly: a full check once a week is enough.
const fresh = previous?.updatedAt && Date.now() - new Date(previous.updatedAt).getTime() < 6 * 864e5
if (fresh && previous.version === VERSION && places.every((p) => previous.checked.includes(p.id)) && !process.env.STEBBY_FORCE) {
  console.log(`Stebby: list from ${previous.updatedAt} is recent; skipping`)
  process.exit(0)
}

await session()
const matches = {}
const checked = []
let failures = 0
for (const p of places) {
  if (!RELEVANT.has(p.category)) {
    checked.push(p.id)
    continue
  }
  let best = null
  const seen = new Map()
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
      seen.set(s.pos_hash ?? s.hash, `${s.pos_name ?? s.name} (${d} m)`)
      if ((d <= 400 && sameName(p, s)) || (d <= 3000 && strongName(p, s))) {
        if (!best || d < best.distanceM) {
          best = { hash: s.pos_hash ?? s.hash, name: s.pos_name ?? s.name, distanceM: d, categories: s.service_categories ?? [], from: s.ticket_starting_from ?? null }
        }
      }
    }
    await sleep(400)
  }
  if (failures > 15) break
  checked.push(p.id)
  if (OVERRIDES[p.id]) best = { distanceM: 0, categories: [], from: null, ...OVERRIDES[p.id] }
  if (!best) console.log(`· ${p.id}: no match; nearest results: ${[...seen.values()].sort((a, b) => parseInt(a.split('(').pop()) - parseInt(b.split('(').pop())).slice(0, 4).join(' | ') || 'none'}`)
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
fs.writeFileSync(OUT, JSON.stringify({ version: VERSION, updatedAt: new Date().toISOString(), checked, matches }, null, 1) + '\n')
console.log(`Stebby: ${Object.keys(matches).length} of ${checked.length} places are partners`)
