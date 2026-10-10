// Temporary: inspect the structure of machine-readable event sources.
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; ParentsHubBot/1.0)', 'accept-language': 'et,en;q=0.8' }
const get = async (u) => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) }); return { r, t: await r.text() } }
const show = (label, v) => console.log(`\n##### ${label}\n${typeof v === 'string' ? v : JSON.stringify(v, null, 1)}`.slice(0, 2500))

try {
  const { t } = await get('https://fienta.com/api/v1/public/events?country=EE&city=Tallinn')
  const j = JSON.parse(t)
  show('fienta top keys', Object.keys(j))
  const ev = j.events ?? j.data ?? []
  show('fienta count', ev.length)
  show('fienta first event', ev[0])
  const kids = ev.filter((e) => /laste|lapse|beebi|pere|mudila|kids|family|children|baby|väike/i.test(JSON.stringify([e.title, e.name, e.categories, e.description]).slice(0, 4000)))
  show('fienta kid-ish count', kids.length)
  show('fienta kid titles', kids.slice(0, 25).map((e) => [e.title ?? e.name, e.starts_at ?? e.start, e.venue ?? e.location]))
} catch (e) { show('fienta error', e.message) }

for (const u of ['https://www.piletilevi.ee/rss/', 'https://kuhuminnalastega.ee/feed/']) {
  try {
    const { t } = await get(u)
    const items = t.split('<item>').slice(1)
    show(`${u} items`, items.length)
    show(`${u} first item`, items[0]?.slice(0, 1800))
    show(`${u} titles`, items.map((i) => (i.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s) || [])[1]).slice(0, 40).join('\n'))
  } catch (e) { show(`${u} error`, e.message) }
}

try {
  const { r, t } = await get('https://www.facebook.com/events/1848363306337186/')
  show('fb final', r.url)
  show('fb meta', (t.match(/<meta[^>]+(og:|description|event)[^>]*>/gi) || []).slice(0, 20).join('\n'))
  show('fb title tag', (t.match(/<title>(.*?)<\/title>/s) || [])[1])
  show('fb ld+json', (t.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s) || [])[1]?.slice(0, 1500))
  show('fb start_timestamp', (t.match(/"start_timestamp":\d+/) || [])[0] + ' ' + (t.match(/"day_time_sentence":"[^"]+"/) || [])[0] + ' ' + (t.match(/"event_place":\{[^}]{0,300}/) || [])[0])
} catch (e) { show('fb error', e.message) }

for (const u of [
  'https://tallinnaraamatukogud.ee/wp-json/tribe/events/v1/events?per_page=3',
  'https://tallinnaraamatukogud.ee/wp-json/',
  'https://tallinnaraamatukogud.ee/sundmused/',
]) {
  try {
    const { r, t } = await get(u)
    const routes = t.startsWith('{') ? Object.keys(JSON.parse(t).routes ?? {}).filter((k) => /event|sundmus|tribe/i.test(k)).slice(0, 30) : []
    show(`${u}`, `${r.status} ${r.headers.get('content-type')} final=${r.url}\nroutes: ${routes.join(', ')}\n${t.replace(/\s+/g, ' ').slice(0, 1200)}`)
  } catch (e) { show(`${u} error`, e.message) }
}
