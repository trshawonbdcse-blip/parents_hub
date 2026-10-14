// One-off: print an open-data portal dataset's full metadata (to find feed URLs and licence).
const slug = process.argv[2] ?? 'piletimaailm:-toimuvate-urituste-infovoog-(api)'
const search = await (await fetch(`https://andmed.eesti.ee/api/datasets?search=${encodeURIComponent('Piletimaailm')}&limit=5`)).json()
const d = search.data?.find((x) => x.slug === slug) ?? search.data?.[0]
console.log('dataset', d?.id, d?.slug)
const full = await (await fetch(`https://andmed.eesti.ee/api/datasets/${d.id}`)).text()
console.log(full.slice(0, 12000))
// Try any URLs found in it, show the first bytes of each.
for (const u of [...new Set(full.match(/https?:\/\/[^"\\\s]+/g) ?? [])].filter((u) => !/andmed\.eesti\.ee|creativecommons/.test(u)).slice(0, 8)) {
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(20000) })
    const t = await r.text()
    console.log(`\n=== ${u} → HTTP ${r.status} ${r.headers.get('content-type')}\n${t.slice(0, 1500)}`)
  } catch (e) {
    console.log(`\n=== ${u} → ${e.message}`)
  }
}
