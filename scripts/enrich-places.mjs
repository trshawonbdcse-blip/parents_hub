// Checks newly added places from a machine with open internet (GitHub Actions):
//  - geocodes the address with OpenStreetMap Nominatim and reports how far it is from our coordinates
//  - reads the official website for og:image / large images, phone and e-mail links
//  - searches Wikimedia Commons for photos of the place
// Writes scripts/enrich/report.json for manual review. Nothing here changes app data.
// usage: node scripts/enrich-places.mjs [ids file, default scripts/photos/review-ids.txt]
import fs from 'node:fs'

const idsFile = process.argv[2] ?? 'scripts/photos/review-ids.txt'
const ids = new Set(fs.readFileSync(idsFile, 'utf8').split(/\s+/).filter(Boolean))
const places = JSON.parse(fs.readFileSync('src/data/places.json', 'utf8')).filter((p) => ids.has(p.id))
const UA = 'ParentsHubBot/1.0 (https://trshawonbdcse-blip.github.io/parents_hub/; data check)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function get(url, type = 'text') {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'et,en' }, signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error(`${r.status}`)
  return type === 'json' ? r.json() : r.text()
}

const km = (a, b) => {
  const r = Math.PI / 180
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r)
  const y = (b.lat - a.lat) * r
  return Math.round(Math.sqrt(x * x + y * y) * 6371 * 1000) / 1000
}

async function geocode(q) {
  const j = await get(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&countrycodes=ee&q=${encodeURIComponent(q)}`, 'json')
  return j.map((x) => ({ lat: Number(x.lat), lng: Number(x.lon), name: x.display_name, type: `${x.category}/${x.type}` }))
}

function fromHtml(html, base) {
  const abs = (u) => {
    try {
      return new URL(u.replace(/&amp;/g, '&'), base).href
    } catch {
      return null
    }
  }
  const og = [...html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)/gi)].map((m) => abs(m[1]))
  const imgs = [...html.matchAll(/<img[^>]+(?:data-src|src)=["']([^"']+\.(?:jpe?g|webp|png)(?:\?[^"']*)?)["']/gi)]
    .map((m) => abs(m[1]))
    .filter((u) => u && !/logo|icon|sprite|flag|avatar|banner-ad|placeholder/i.test(u))
  const phones = [...new Set([...html.matchAll(/href=["']tel:([^"']+)/gi)].map((m) => decodeURIComponent(m[1]).replace(/\s+/g, ' ').trim()))]
  const emails = [...new Set([...html.matchAll(/href=["']mailto:([^"'?]+)/gi)].map((m) => decodeURIComponent(m[1]).trim()))]
  return { og: [...new Set(og.filter(Boolean))], images: [...new Set(imgs)].slice(0, 12), phones, emails }
}

async function commons(q) {
  const j = await get(
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=${encodeURIComponent(q)}&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=960`,
    'json',
  )
  return Object.values(j.query?.pages ?? {})
    .map((p) => {
      const ii = p.imageinfo?.[0]
      if (!ii || !/\.(jpe?g|png|webp)$/i.test(ii.url) || ii.width < 600) return null
      const md = ii.extmetadata ?? {}
      const author = (md.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 60)
      return { src: ii.thumburl ?? ii.url, credit: `${author || 'Wikimedia Commons'} · ${md.LicenseShortName?.value ?? ''}`.trim(), page: ii.descriptionurl, title: p.title }
    })
    .filter(Boolean)
}

const report = {}
for (const p of places) {
  const r = { name: p.name, address: p.address, ours: { lat: p.lat, lng: p.lng } }
  for (const q of [`${p.nameLocal ?? p.name}, ${p.area}`, p.address, p.name]) {
    try {
      const hits = await geocode(q)
      await sleep(1100)
      if (hits.length) {
        r.geocode = { query: q, ...hits[0], offKm: km(p, hits[0]) }
        break
      }
    } catch (e) {
      r.geocodeError = String(e.message ?? e)
    }
  }
  if (p.website) {
    try {
      r.site = fromHtml(await get(p.website), p.website)
    } catch (e) {
      r.siteError = String(e.message ?? e)
    }
  }
  try {
    r.commons = await commons(p.nameLocal ?? p.name)
    if (!r.commons.length && p.nameLocal) r.commons = await commons(p.name)
  } catch (e) {
    r.commonsError = String(e.message ?? e)
  }
  report[p.id] = r
  console.log(`${p.id}: geo ${r.geocode ? r.geocode.offKm + ' km' : 'none'} · og ${r.site?.og.length ?? '-'} · imgs ${r.site?.images.length ?? '-'} · commons ${r.commons?.length ?? '-'}`)
}
fs.mkdirSync('scripts/enrich', { recursive: true })
fs.writeFileSync('scripts/enrich/report.json', JSON.stringify(report, null, 1) + '\n')
