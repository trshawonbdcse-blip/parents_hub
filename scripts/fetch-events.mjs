// Collects upcoming kids' and family events from public sources into src/data/events.json.
// Runs in GitHub Actions before each build (daily schedule + every push). Each source is
// independent: if one fails, the others still update. If everything fails, the previous
// file is kept so the site never loses its events.
import fs from 'node:fs'

const OUT = new URL('../src/data/events.json', import.meta.url)
const FB_LIST = new URL('./facebook-events.txt', import.meta.url)
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; ParentsHubBot/1.0; +https://trshawonbdcse-blip.github.io/parents_hub/)', 'accept-language': 'et,en;q=0.8' }
const DAY = 864e5
const now = Date.now()
const HORIZON = now + 90 * DAY

// Words that signal an event is made for small children or families (Estonian, Russian, English).
const KID_WORDS = /(\blastele\b|\blaste(hommik|tuba|etendus|kontsert|kino|pidu|teater|ring)|\bbeebi|väikelap|\bmudila|\bpõnni|\bkogupere|\bperepäev|\bperehommik|\bnukulavastus|\bnukuteater|\bmuinasjut|\bmänguhommik|\bmängutuba|\bmeisterdamistuba lastele|\bдля детей|\bдетск|\bмалыш|\bсемейн|\bkids?\b|\bchildren|\bfamily (day|show|concert|event)|\bbab(y|ies)\b|\btoddler|\bsensory play)/i
const BLOCK_WORDS = /(webinar|вебинар|online|kinkekaart|gift ?card|18\+|stand-?up|kabaree|õhtusöök|konverents|conference|koolitus|training|breathwork|human design|lasteaedades töötamise|infoõhtu|infotund|vahetusõpila|koolikontsert|algklass|noortegrupp|dog show|koerte|lapsepõlve)/i
const ET_MONTHS = { jaanuar: 1, veebruar: 2, märts: 3, aprill: 4, mai: 5, juuni: 6, juuli: 7, august: 8, september: 9, oktoober: 10, november: 11, detsember: 12 }
const NEAR_TALLINN = /(tallinn|harju|keila|saue|maardu|viimsi|rae|saku|kiili|harku|jõelähtme|kohila|tabasalu|laagri|peetri)/i

const get = async (url) => {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r
}
const stripHtml = (s) =>
  (s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(x?)([0-9a-f]+);/gi, (_, x, n) => String.fromCodePoint(parseInt(n, x ? 16 : 10)))
    .replace(/\s+/g, ' ')
    .trim()
const clip = (s, n = 180) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s || null)
// "2026-10-11 14:00:00" in Tallinn time → ISO with offset.
const tallinnIso = (local) => {
  const d = new Date(local.replace(' ', 'T') + 'Z')
  const offsetH = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Tallinn', timeZoneName: 'shortOffset' })
    .formatToParts(d)
    .find((p) => p.type === 'timeZoneName')
    .value.replace('GMT', '') || '+0'
  const sign = offsetH.startsWith('-') ? '-' : '+'
  const hh = String(Math.abs(parseInt(offsetH, 10))).padStart(2, '0')
  return `${local.replace(' ', 'T').slice(0, 19)}${sign}${hh}:00`
}

// --- Fienta: public JSON API, with a "family" category -----------------------------------
async function fienta() {
  const j = await (await get('https://fienta.com/api/v1/public/events?country=EE')).json()
  return (j.events ?? [])
    .filter((e) => e.is_public !== false && e.event_status === 'scheduled' && e.attendance_mode !== 'online')
    .filter((e) => NEAR_TALLINN.test(e.address ?? ''))
    .filter((e) => {
      const text = `${e.title} ${stripHtml(e.description).slice(0, 400)}`
      return KID_WORDS.test(text) && !BLOCK_WORDS.test(text)
    })
    .map((e) => ({
      id: `fienta-${e.id}`,
      title: stripHtml(e.title),
      start: tallinnIso(e.starts_at),
      end: e.ends_at ? tallinnIso(e.ends_at) : null,
      allDay: false,
      venue: e.venue || null,
      address: e.address || null,
      url: e.url,
      source: 'Fienta',
      price: e.price_from_string ? `from ${e.price_from_string}` : null,
      free: /^0(\.0+)? /.test(e.price_from_string ?? '') ? true : null,
      image: e.image_small_url || null,
      summary: clip(stripHtml(e.description)),
    }))
    // Skip season tickets, gift cards and other long-running listings.
    .filter((e) => !e.end || new Date(e.end) - new Date(e.start) <= 14 * DAY)
}

// --- Piletilevi: RSS of newly listed events --------------------------------------------
async function piletilevi() {
  const xml = await (await get('https://www.piletilevi.ee/rss/')).text()
  const tag = (s, t) => stripHtml((s.match(new RegExp(`<${t}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${t}>`)) || [])[1])
  return xml
    .split('<item>')
    .slice(1)
    .map((item) => {
      const rawTitle = tag(item, 'title')
      const link = tag(item, 'link').replace(/\?.*$/, '')
      const desc = tag(item, 'description')
      const m = rawTitle.match(/(\d{2})\.(\d{2})\.(\d{4})(?: - (\d{2}):(\d{2}))?/)
      if (!m) return null
      const [, dd, mm, yyyy, hh = '00', mi = '00'] = m
      return {
        id: `piletilevi-${tag(item, 'guid') || link}`,
        title: rawTitle.replace(/\s*\d{2}\.\d{2}\.\d{4}.*$/, '').trim(),
        start: tallinnIso(`${yyyy}-${mm}-${dd} ${hh}:${mi}:00`),
        end: null,
        allDay: !m[4],
        venue: null,
        address: null,
        url: link,
        source: 'Piletilevi',
        price: null,
        free: null,
        image: null,
        summary: clip(desc),
        _text: `${rawTitle} ${link} ${desc}`,
      }
    })
    .filter((e) => e && (KID_WORDS.test(e._text) || /\/lastele\//.test(e.url)) && !BLOCK_WORDS.test(e._text))
    .map(({ _text, ...e }) => e)
}

// --- Tallinn libraries: WordPress "event" post type ------------------------------------
async function libraries() {
  const r = await get('https://tallinnaraamatukogud.ee/wp-json/wp/v2/event?per_page=100&orderby=date&order=desc')
  const items = await r.json()
  if (process.env.DEBUG_EVENTS) console.log('library sample', JSON.stringify(items[0], null, 1).slice(0, 3000))
  const out = []
  for (const it of items) {
    const title = stripHtml(it.title?.rendered)
    const body = stripHtml(it.content?.rendered ?? it.excerpt?.rendered)
    const meta = { ...(it.acf ?? {}), ...(it.meta ?? {}) }
    // Find a date: prefer explicit meta fields, fall back to a date written in the text.
    const metaDate = Object.entries(meta).find(([k, v]) => /date|kuup|start|algus/i.test(k) && typeof v === 'string' && /\d{4}-?\d{2}-?\d{2}/.test(v))?.[1]
    let start = null
    if (metaDate) {
      const d = metaDate.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3')
      const time = Object.entries(meta).find(([k, v]) => /time|kell|aeg/i.test(k) && typeof v === 'string' && /\d{1,2}[:.]\d{2}/.test(v))?.[1]
      const t = (time?.match(/(\d{1,2})[:.](\d{2})/) ?? [null, '00', '00']).slice(1).map((x) => x.padStart(2, '0'))
      start = tallinnIso(`${d.slice(0, 10)} ${t[0]}:${t[1]}:00`)
    } else {
      const text = `${title} ${body} ${stripHtml(it.yoast_head_json?.description ?? '')}`
      const numeric = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[^\d]{1,12}(\d{1,2})[.:](\d{2}))?/)
      const worded = text.toLowerCase().match(/(\d{1,2})\.\s*(jaanuar|veebruar|märts|aprill|mai|juuni|juuli|august|september|oktoob|novemb|detsemb)\w*(?:[^\d]{1,12}kell\s*(\d{1,2})(?:[.:](\d{2}))?)?/)
      if (numeric) {
        start = tallinnIso(`${numeric[3]}-${numeric[2].padStart(2, '0')}-${numeric[1].padStart(2, '0')} ${(numeric[4] ?? '00').padStart(2, '0')}:${numeric[5] ?? '00'}:00`)
      } else if (worded) {
        const month = Object.entries(ET_MONTHS).find(([k]) => k.startsWith(worded[2]))[1]
        // No year in the text: use the next occurrence of that date.
        const published = new Date(it.date ?? now)
        let year = published.getFullYear()
        if (new Date(year, month - 1, +worded[1]) < new Date(published.getTime() - 7 * DAY)) year++
        start = tallinnIso(`${year}-${String(month).padStart(2, '0')}-${worded[1].padStart(2, '0')} ${(worded[3] ?? '00').padStart(2, '0')}:${worded[4] ?? '00'}:00`)
      }
    }
    if (!start) continue
    if (!KID_WORDS.test(`${title} ${body}`) || BLOCK_WORDS.test(title)) continue
    out.push({
      id: `library-${it.id}`,
      title,
      start,
      end: null,
      allDay: false,
      venue: 'Tallinn library',
      address: null,
      url: it.link,
      source: 'Tallinn libraries',
      price: null,
      free: true,
      image: null,
      summary: clip(body),
    })
  }
  return out
}

// --- Facebook: only public events whose links are listed in facebook-events.txt ---------
const EN_MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 }
async function facebook() {
  if (!fs.existsSync(FB_LIST)) return []
  const urls = fs.readFileSync(FB_LIST, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l.startsWith('http'))
  const out = []
  let failures = 0
  for (const url of urls) {
    try {
      const html = await (await get(url)).text()
      const meta = (p) => stripHtml((html.match(new RegExp(`<meta property="${p}" content="([^"]*)"`)) || [])[1])
      const title = meta('og:title')
      const desc = meta('og:description')
      const m = desc.toLowerCase().match(/([a-zäöüõ]+) (\d{1,2}),? (\d{4})/)
      const month = m && (ET_MONTHS[m[1]] ?? EN_MONTHS[m[1]])
      if (!title || !month) {
        console.warn('facebook: could not read', url)
        continue
      }
      const place = (desc.match(/linnas ([^,]+(?:, [^,]+ maakond)?)/) || desc.match(/ in ([^,]+(?:, [^,]+ County)?)/) || [])[1] ?? null
      const organizer = (desc.match(/^Kasutaja (.+?) korraldatav/) || desc.match(/^Event by (.+?) in /) || [])[1] ?? null
      const id = (url.match(/events\/(?:s\/[^/]+\/)?(\d+)/) || [])[1] ?? url
      out.push({
        id: `facebook-${id}`,
        title,
        start: tallinnIso(`${m[3]}-${String(month).padStart(2, '0')}-${m[2].padStart(2, '0')} 00:00:00`),
        end: null,
        allDay: true,
        venue: [organizer, place].filter(Boolean).join(' · ') || null,
        address: place,
        url,
        source: 'Facebook',
        price: null,
        free: null,
        image: null,
        summary: null,
      })
    } catch (e) {
      failures++
      console.warn('facebook:', e.message)
    }
  }
  if (urls.length && failures === urls.length) throw new Error('every Facebook link failed')
  return out
}

// --- Run all sources ----------------------------------------------------------------------
const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { events: [] }
const sources = { fienta, piletilevi, libraries, facebook }
const LABEL = { fienta: 'Fienta', piletilevi: 'Piletilevi', libraries: 'Tallinn libraries', facebook: 'Facebook' }
const results = await Promise.allSettled(Object.values(sources).map((f) => f()))
let all = []
let anyOk = false
Object.keys(sources).forEach((name, i) => {
  const r = results[i]
  if (r.status === 'fulfilled') {
    anyOk = true
    console.log(`${name}: ${r.value.length} kid events`)
    all.push(...r.value)
  } else {
    console.warn(`${name}: FAILED — ${r.reason?.message ?? r.reason}`)
    // Keep this source's previous events so one failure doesn't empty the list.
    all.push(...previous.events.filter((e) => e.source === LABEL[name]))
  }
})

if (!anyOk) {
  console.warn('All sources failed; keeping previous events.json')
  process.exit(0)
}

const seen = new Set()
all = all
  .filter((e) => {
    const end = new Date(e.end ?? e.start).getTime() + (e.allDay ? DAY : 0)
    return end >= now - DAY && new Date(e.start).getTime() <= HORIZON
  })
  .filter((e) => {
    const key = e.title.toLowerCase().replace(/\s*\(\d{1,2}\.\d{1,2}\)\s*$/, '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  .sort((a, b) => a.start.localeCompare(b.start))

fs.writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), events: all }, null, 1) + '\n')
console.log(`Wrote ${all.length} events`)
for (const e of all.slice(0, 40)) console.log(` - ${e.start.slice(0, 16)} [${e.source}] ${e.title}`)
