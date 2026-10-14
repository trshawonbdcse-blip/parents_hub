// Concerts, theatre and other events for adults ("Just me" mode) into public/data/events-adult.json.
// Sources (both public and free to reuse):
//   - Piletimaailm open event feed (Estonian Drama Theatre foundation; open data, CC BY-SA 3.0)
//     https://www.piletimaailm.com/performances/feed.json
//   - Fienta public events API (already used for kids' events)
// Children's and family events are left out (they are in events.json). If a source fails, the
// others still update; if everything fails, the previous file is kept.
import fs from 'node:fs'

const OUT = 'public/data/events-adult.json'
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; KuhuMinnaBot/1.0; +https://trshawonbdcse-blip.github.io/parents_hub/)', 'accept-language': 'et,en;q=0.8' }
const DAY = 864e5
const now = Date.now()
const HORIZON = now + 60 * DAY
const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { events: [] }

// Kids' and family events belong to the Family list.
const KIDS = /(\blastele\b|\blaste(hommik|tuba|etendus|kontsert|kino|pidu|teater|ring)|\bbeebi|väikelap|\bmudila|\bkogupere|\bperepäev|\bnukulavastus|\bnukuteater|\blaste(etendus|lavastus|muusikal|ooper)|\bpere(etendus|lavastus|kontsert|lavastus)|noore(le|mate) vaataja|\blastelavastus|\b(alates|vanusele) [2-9] |\b[3-9]\+|\bmuinasjut|для детей|\bдетск|\bмалыш|\bkids?\b|\bchildren|\bfamily (day|show|concert)|\btoddler)/i
const NOT_EVENT = /(kinkekaart|gift ?card|hooajapilet|season pass|abonement|kinkepilet)/i
const KIND = [
  ['concert', /(kontsert|concert|концерт|orkester|orchestra|ooper|opera|опера|jazz|džäss|festival|bänd|band|dj\b|klaver|piano|koor|choir|музык)/i],
  ['theatre', /(teater|teatri|lavastus|etendus|theatre|theater|театр|спектакл|balett|ballet|балет|tants|dance|танц|muusikal|musical|мюзикл|komöödia|comedy|комеди|stand-?up)/i],
]
const TOWNS = JSON.parse(fs.readFileSync('src/data/towns.json', 'utf8')).towns.map(([re, hub]) => [new RegExp(`(^|[^\\p{L}])(${re})`, 'iu'), hub])
const townOf = (text) => TOWNS.find(([re]) => re.test(text ?? ''))?.[1] ?? null

const get = async (url) => {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(45000) })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r
}
const stripHtml = (s) =>
  String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&([a-z]+);/gi, (m, n) => ({ auml: 'ä', ouml: 'ö', uuml: 'ü', otilde: 'õ', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', Otilde: 'Õ', scaron: 'š', zcaron: 'ž', quot: '"', laquo: '«', raquo: '»', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”' })[n] ?? m)
    .replace(/&#(x?)([0-9a-f]+);/gi, (_, x, n) => String.fromCodePoint(parseInt(n, x ? 16 : 10)))
    .replace(/\s+/g, ' ')
    .trim()
const clip = (s, n = 180) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s || null)
const kindOf = (text) => KIND.find(([, re]) => re.test(text))?.[0] ?? 'other'
const pick = (o, ...keys) => keys.map((k) => o?.[k]).find((v) => v != null && v !== '')
// "2026/10/14 11:00:00 +0300" → ISO
const isoFromFeed = (s) => {
  const m = String(s).match(/(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2}) ([+-]\d{2})(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7]}:${m[8]}` : new Date(s).toISOString()
}
const tallinnIso = (local) => {
  const d = new Date(local.replace(' ', 'T') + 'Z')
  const off = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Tallinn', timeZoneName: 'shortOffset' }).formatToParts(d).find((p) => p.type === 'timeZoneName').value.replace('GMT', '') || '+0'
  const sign = off.startsWith('-') ? '-' : '+'
  return `${local.replace(' ', 'T').slice(0, 19)}${sign}${String(Math.abs(parseInt(off, 10))).padStart(2, '0')}:00`
}

async function piletimaailm() {
  const list = await (await get('https://www.piletimaailm.com/performances/feed.json')).json()
  if (Array.isArray(list)) {
    const tally = (k) => Object.entries(list.reduce((m, e) => ({ ...m, [e[k]]: (m[e[k]] ?? 0) + 1 }), {})).map(([v, n]) => `${v}: ${n}`).join(' · ')
    console.log('piletimaailm categories:', tally('category'))
    console.log('piletimaailm states:', tally('state'))
  }
  return (Array.isArray(list) ? list : [])
    .map((e) => {
      const title = stripHtml(pick(e, 'name', 'name_en'))
      const desc = stripHtml(pick(e, 'full_description', 'description', 'short_description'))
      const venue = [stripHtml(e.location_venue_name), stripHtml(e.location_venue_hall_name)].filter(Boolean).join(', ') || null
      const address = stripHtml(e.location_address_address) || null
      const city = address
      const category = stripHtml(e.category)
      const priceMin = pick(e, 'min_price', 'price_min', 'price_from', 'price')
      return {
        id: `piletimaailm-${e.id}`,
        title,
        titleEn: e.name_en && e.name_en !== e.name ? stripHtml(e.name_en) : undefined,
        start: isoFromFeed(e.date),
        end: null,
        allDay: false,
        venue,
        address,
        url: e.buy_ticket_url || e.info_url,
        source: 'Piletimaailm',
        organizer: stripHtml(e.organizer_name) || null,
        price: priceMin != null && !isNaN(parseFloat(priceMin)) ? `From €${parseFloat(priceMin)}` : null,
        free: null,
        image: e.image_url || null,
        summary: clip(desc),
        description: clip(desc, 1500),
        kind: kindOf(`${category} ${title} ${desc.slice(0, 300)} ${e.organizer_name ?? ''}`),
        cityHint: city,
        soldOut: e.free_seat_count === 0 || undefined,
        kidsText: `${category} ${title} ${desc.slice(0, 600)}`,
        cancelled: /cancel|tühist/i.test(String(e.state ?? '')),
      }
    })
    .filter((e) => e.title && !e.cancelled && !KIDS.test(e.kidsText) && !NOT_EVENT.test(e.title))
    .map(({ kidsText, cancelled, ...e }) => e)
}

async function fienta() {
  const j = await (await get('https://fienta.com/api/v1/public/events?country=EE')).json()
  return (j.events ?? [])
    .filter((e) => e.is_public !== false && e.event_status === 'scheduled' && e.attendance_mode !== 'online')
    .map((e) => {
      const title = stripHtml(e.title)
      const desc = stripHtml(e.description)
      return {
        id: `fienta-${e.id}`,
        title,
        start: tallinnIso(e.starts_at),
        end: e.ends_at ? tallinnIso(e.ends_at) : null,
        allDay: false,
        venue: e.venue || null,
        address: e.address || null,
        url: e.url,
        source: 'Fienta',
        organizer: null,
        price: e.price_from_string ? e.price_from_string.replace(/^from\s+/i, 'From ') : null,
        free: /^0(\.0+)? /.test(e.price_from_string ?? '') ? true : null,
        image: e.image_small_url || null,
        summary: clip(desc),
        description: clip(desc, 1500),
        kind: kindOf(`${title} ${desc.slice(0, 300)}`),
      }
    })
    // Leave out work events, courses and day tickets to permanent attractions (museums etc.).
    .filter(
      (e) =>
        !KIDS.test(`${e.title} ${e.summary ?? ''}`) &&
        !NOT_EVENT.test(e.title) &&
        !/(webinar|вебинар|online|koolitus|training|konverents|conference|seminar|töötuba|workshop|мастер-класс|tehisaru|бизнес|business|ettevõtja|muuseum|museum|музей|inspiratsioonipäev)/i.test(e.title) &&
        !(e.end && new Date(e.end) - new Date(e.start) > 2 * DAY),
    )
}

const sources = { piletimaailm, fienta }
const results = await Promise.allSettled(Object.values(sources).map((f) => f()))
let ok = 0
const collected = []
Object.keys(sources).forEach((name, i) => {
  const r = results[i]
  if (r.status === 'fulfilled') {
    ok++
    console.log(`${name}: ${r.value.length} events`)
    collected.push(...r.value)
  } else console.warn(`${name}: failed — ${r.reason?.message ?? r.reason}`)
})
if (!ok) {
  console.warn('adult events: all sources failed; keeping the previous file')
  fs.mkdirSync('public/data', { recursive: true })
  if (!fs.existsSync(OUT)) fs.writeFileSync(OUT, JSON.stringify({ updatedAt: null, events: [] }) + '\n')
  process.exit(0)
}

const seen = new Set()
const events = collected
  .filter((e) => {
    const t = new Date(e.start).getTime()
    return t >= now - DAY / 2 && t <= HORIZON
  })
  .map(({ cityHint, ...e }) => ({ ...e, city: townOf(cityHint) ?? townOf(`${e.venue ?? ''} ${e.address ?? ''}`) ?? townOf(`${e.title} ${e.organizer ?? ''}`) }))
  // One entry per show and time (the same performance can be listed twice).
  .filter((e) => {
    const key = `${e.title.toLowerCase()}|${e.start}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  .sort((a, b) => a.start.localeCompare(b.start))
  .map((e) => ({ ...e, firstSeen: previous.events.find((p) => p.id === e.id)?.firstSeen ?? new Date().toISOString().slice(0, 10) }))

fs.mkdirSync('public/data', { recursive: true })
fs.writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), events }) + '\n')
const byKind = events.reduce((m, e) => ({ ...m, [e.kind]: (m[e.kind] ?? 0) + 1 }), {})
const byCity = events.reduce((m, e) => ({ ...m, [e.city ?? '?']: (m[e.city ?? '?'] ?? 0) + 1 }), {})
console.log(`Wrote ${events.length} adult events`, byKind, byCity)
for (const e of events.slice(0, 15)) console.log(` - ${e.start.slice(0, 16)} [${e.source}/${e.kind}] ${e.city ?? '?'} · ${e.venue ?? ''} · ${e.title}`)
