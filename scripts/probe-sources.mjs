// Temporary: checks which event sources are machine-readable from a GitHub runner.
const urls = [
  'https://fienta.com/api/v1/public/events?country=EE&city=Tallinn',
  'https://fienta.com/api/v1/public/events',
  'https://www.keskraamatukogu.ee/wp-json/tribe/events/v1/events?per_page=5',
  'https://www.keskraamatukogu.ee/sundmused/?ical=1',
  'https://www.keskraamatukogu.ee/sundmused/',
  'https://www.keskraamatukogu.ee/feed/',
  'https://www.kultuurikava.ee/',
  'https://www.kultuurikava.ee/api/events',
  'https://www.piletilevi.ee/est/piletid/lastele/',
  'https://www.piletilevi.ee/rss/',
  'https://www.visittallinn.ee/eng/visitor/see-do/events',
  'https://www.tallinnzoo.ee/wp-json/tribe/events/v1/events?per_page=5',
  'https://loomaaed.ee/wp-json/tribe/events/v1/events?per_page=5',
  'https://www.nuku.ee/wp-json/wp/v2/pages?per_page=1',
  'https://www.nuku.ee/mangukava/',
  'https://huvi.tallinn.ee/',
  'https://www.kuhuminnalastega.ee/feed/',
  'https://kuhuminnalastega.ee/feed/',
  'https://www.facebook.com/events/1848363306337186/',
]
for (const u of urls) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 ParentsHubBot', accept: '*/*' }, redirect: 'follow', signal: AbortSignal.timeout(15000) })
    const t = await r.text()
    const hints = [...new Set((t.match(/(wp-json[^"' ]{0,60}|\?ical=1|text\/calendar|application\/rss\+xml|\/feed\/|api\/[a-z0-9/_-]{3,40})/gi) || []).slice(0, 8))]
    console.log(`\n### ${u}\n${r.status} ${r.headers.get('content-type')} len=${t.length} final=${r.url}\nhints: ${hints.join(' | ')}\n${t.replace(/\s+/g, ' ').slice(0, 300)}`)
  } catch (e) {
    console.log(`\n### ${u}\nERROR ${e.message}`)
  }
}
