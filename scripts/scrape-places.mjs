// One-off research helper (run in GitHub Actions): visits each place's official website
// and collects contact details, price lines and the site's own preview image, plus
// freely licensed photos taken near the place from Wikimedia Commons.
// Output: scrape-output/scrape.json, reviewed by hand before anything enters places.json.
import fs from 'node:fs'

const places = JSON.parse(fs.readFileSync(new URL('../src/data/places.json', import.meta.url), 'utf8'))
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; ParentsHubBot/1.0; +https://trshawonbdcse-blip.github.io/parents_hub/)', 'accept-language': 'et,en;q=0.8' }

const fetchText = async (url) => {
  const r = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error(`${r.status}`)
  if (!/html|xml|text/.test(r.headers.get('content-type') ?? '')) throw new Error('not html')
  return { url: r.url, html: await r.text() }
}

const decode = (s) =>
  s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&euro;/g, '€').replace(/&#(x?)([0-9a-f]+);/gi, (_, x, n) => String.fromCodePoint(parseInt(n, x ? 16 : 10)))

const textLines = (html) =>
  decode(
    html
      .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<(br|\/p|\/li|\/tr|\/h\d|\/div|\/td|\/th)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

function extract(html, baseUrl) {
  const phones = new Set()
  for (const m of html.matchAll(/href="tel:([^"]+)"/gi)) phones.add(decodeURIComponent(m[1]).replace(/[^\d+]/g, ''))
  for (const m of decode(html.replace(/<[^>]+>/g, ' ')).matchAll(/(\+372[\s-]?\d{3,4}[\s-]?\d{3,4})/g)) phones.add(m[1].replace(/[^\d+]/g, ''))
  const emails = new Set()
  for (const m of html.matchAll(/href="mailto:([^"?]+)/gi)) emails.add(decodeURIComponent(m[1]).trim().toLowerCase())
  for (const m of html.matchAll(/[\w.+-]+@[\w-]+\.(?:ee|com|eu|net|org)\b/gi)) if (!/\.(png|jpe?g|webp|svg)$/i.test(m[0])) emails.add(m[0].toLowerCase())
  const og = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image/i) || [])[1]
  const lines = textLines(html)
  const priceLines = []
  lines.forEach((l, i) => {
    if (/(€|\beur\b|\btasuta\b|\bfree\b|\bбесплатн)/i.test(l) && l.length < 220) priceLines.push([lines[i - 1], l].filter(Boolean).join(' | ').slice(0, 260))
  })
  const links = [...html.matchAll(/<a[^>]+href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map(([, href, label]) => {
      try {
        return { url: new URL(decode(href), baseUrl).href, label: decode(label.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().toLowerCase() }
      } catch {
        return null
      }
    })
    .filter((l) => l && new URL(l.url).host === new URL(baseUrl).host)
  return { phones: [...phones], emails: [...emails], og: og ? new URL(decode(og), baseUrl).href : null, priceLines, links }
}

const PRICE_LINK = /(hind|hinna|pilet|ticket|price|pricing|tariff|цен|билет|külasta|visit|avamis|opening|kontakt|contact)/i

async function scrapeSite(place) {
  const out = { id: place.id, website: place.website, finalUrl: null, ogImage: null, phones: [], emails: [], priceLines: [], pages: [], error: null }
  try {
    const home = await fetchText(place.website)
    out.finalUrl = home.url
    const first = extract(home.html, home.url)
    out.ogImage = first.og
    out.phones.push(...first.phones)
    out.emails.push(...first.emails)
    out.priceLines.push(...first.priceLines)
    out.pages.push(home.url)
    const extra = [...new Map(first.links.filter((l) => PRICE_LINK.test(`${l.url} ${l.label}`)).map((l) => [l.url, l])).values()].slice(0, 3)
    for (const l of extra) {
      try {
        const page = await fetchText(l.url)
        const e = extract(page.html, page.url)
        out.phones.push(...e.phones)
        out.emails.push(...e.emails)
        out.priceLines.push(...e.priceLines.map((p) => `[${l.label.slice(0, 30)}] ${p}`))
        out.pages.push(page.url)
      } catch {
        // Ignore individual subpages that fail.
      }
    }
  } catch (e) {
    out.error = e.message
  }
  out.phones = [...new Set(out.phones)].filter((p) => p.replace(/\D/g, '').length >= 7).slice(0, 5)
  out.emails = [...new Set(out.emails)].slice(0, 5)
  out.priceLines = [...new Set(out.priceLines)].slice(0, 25)
  return out
}

async function commonsPhotos(place) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch' +
    `&ggscoord=${place.lat}|${place.lng}&ggsradius=${place.setting === 'outdoor' ? 400 : 150}&ggslimit=20&ggsnamespace=6` +
    '&prop=imageinfo&iiprop=url|extmetadata|mime|size&iiurlwidth=900'
  try {
    const j = await (await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) })).json()
    return Object.values(j.query?.pages ?? {})
      .map((p) => ({ title: p.title, info: p.imageinfo?.[0] }))
      .filter(({ title, info }) => info && info.mime === 'image/jpeg' && info.width >= 800 && !/(map|kaart|logo|plan|scheme|diagram|coat of arms)/i.test(title))
      .slice(0, 6)
      .map(({ title, info }) => ({
        src: info.thumburl,
        page: info.descriptionurl,
        title: title.replace(/^File:/, '').replace(/\.jpe?g$/i, ''),
        author: (info.extmetadata?.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 80) || null,
        license: info.extmetadata?.LicenseShortName?.value ?? null,
      }))
  } catch {
    return []
  }
}

const results = []
const queue = [...places]
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const p = queue.shift()
      const [site, photos] = await Promise.all([scrapeSite(p), commonsPhotos(p)])
      results.push({ ...site, name: p.name, commons: photos })
      console.log(`${p.id}: phones=${site.phones.length} emails=${site.emails.length} prices=${site.priceLines.length} og=${site.ogImage ? 1 : 0} commons=${photos.length}${site.error ? ' ERR ' + site.error : ''}`)
    }
  }),
)
fs.mkdirSync(new URL('../scrape-output/', import.meta.url), { recursive: true })
results.sort((a, b) => a.id.localeCompare(b.id))
fs.writeFileSync(new URL('../scrape-output/scrape.json', import.meta.url), JSON.stringify(results, null, 1))
console.log('done', results.length)
