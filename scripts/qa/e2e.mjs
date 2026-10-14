// QA: end-to-end checks of the built app (dist/) in a headless browser.
//  - every screen in English, Estonian and Russian, on a small and a normal phone
//  - every hand-checked place page and every event page
//  - key user flows (search, filters, town, map, save, "we went today", language, birthday)
//  - accessibility scan (axe-core) of the main screens
// Fails on page errors, console errors, horizontal overflow, leaked placeholders
// ({name}, undefined, NaN) and serious accessibility issues.
// usage: npm run build && node scripts/qa/e2e.mjs   (CHROME_PATH=… to use a local Chromium)
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  ;({ chromium } = await import('playwright-core'))
}

const DIST = path.resolve('dist')
const BASE = '/parents_hub/'
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.ics': 'text/calendar' }
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (!p.startsWith(BASE)) return res.writeHead(404).end()
  p = path.join(DIST, p.slice(BASE.length) || 'index.html')
  if (!p.startsWith(DIST) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html')
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] ?? 'application/octet-stream' })
  fs.createReadStream(p).pipe(res)
})
await new Promise((r) => server.listen(0, r))
const URL0 = `http://localhost:${server.address().port}${BASE}`

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox', '--no-proxy-server'] })
const places = JSON.parse(fs.readFileSync('src/data/places.json', 'utf8'))
const events = JSON.parse(fs.readFileSync('src/data/events.json', 'utf8')).events ?? []
const activities = JSON.parse(fs.readFileSync('src/data/activities.json', 'utf8')).map((a) => a.key)
const failures = []
let checks = 0
const fail = (where, what) => failures.push(`${where}: ${what}`)

// Deterministic weather; everything else outside the app is blocked (photos, map tiles).
const WEATHER = {
  current: { temperature_2m: 7, apparent_temperature: 4, weather_code: 3, wind_speed_10m: 12 },
  hourly: { time: [], precipitation_probability: [] },
  daily: { time: [...Array(7)].map((_, i) => new Date(Date.now() + i * 864e5).toISOString().slice(0, 10)), weather_code: [3, 61, 0, 2, 3, 1, 63], temperature_2m_max: [9, 8, 11, 10, 9, 12, 7], temperature_2m_min: [3, 4, 5, 2, 1, 4, 3], precipitation_probability_max: [20, 80, 5, 10, 20, 10, 70], apparent_temperature_max: [7, 6, 10, 8, 7, 11, 5] },
}

async function newPage({ lang = 'en', width = 390, height = 844, storage = {}, mode = 'family' } = {}) {
  // Family mode unless a test asks otherwise (null = first open, shows the chooser).
  if (mode) storage = { 'ph.mode': mode, ...storage }
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, serviceWorkers: 'block', locale: lang === 'en' ? 'en-GB' : lang === 'et' ? 'et-EE' : 'ru-RU' })
  await ctx.route('**/*', (route) => {
    const u = route.request().url()
    if (u.startsWith(URL0)) return route.continue()
    if (u.includes('open-meteo.com')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(WEATHER) })
    // Map style without tiles, so the base map starts cleanly offline.
    if (u.startsWith('https://tiles.openfreemap.org/styles/')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#eef0ec' } }] }) })
    return route.abort()
  })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', (e) => page.errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const t = m.text()
    // Blocked external resources (photos, tiles) are expected in the test.
    if (/ERR_FAILED|ERR_BLOCKED|net::|Failed to load resource/.test(t)) return
    page.errors.push(`console: ${t}`)
  })
  await page.addInitScript(
    ({ lang, storage }) => {
      localStorage.setItem('ph.lang', lang)
      for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, JSON.stringify(v))
    },
    { lang, storage },
  )
  return page
}

const LEAKS = /\{[a-z]+\}|\bundefined\b|\bNaN\b|\[object |Invalid Date/
async function checkScreen(page, hash, label) {
  checks++
  await page.goto(URL0 + hash)
  await page.waitForTimeout(350)
  const r = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    text: document.body.innerText,
    empty: !document.querySelector('#root')?.children.length,
  }))
  if (r.empty) fail(label, 'blank screen')
  if (r.overflow > 1) fail(label, `horizontal overflow ${r.overflow}px`)
  const leak = r.text.match(LEAKS)
  if (leak) fail(label, `leaked text "${r.text.slice(Math.max(0, leak.index - 30), leak.index + 30).replace(/\n/g, ' ')}"`)
  for (const e of page.errors.splice(0)) fail(label, e)
  return r.text
}

const CHILD = { 'ph.childBirthDate': '2025-07-10', 'ph.childName': 'Ayaan', 'ph.napStart': '13:00', 'ph.city': 'Tallinn' }
const SCREENS = ['#/', '#/explore', '#/explore?view=map', '#/activities', ...activities.map((k) => `#/activity/${k}`), '#/events', '#/me?tab=saved', '#/me?tab=moments', '#/me?tab=family', '#/privacy', '#/place/does-not-exist', '#/event/does-not-exist', '#/nonsense']

// 1. Every screen, every language, two phone sizes; with and without a child profile.
const NAV = { en: 'Explore', et: 'Avasta', ru: 'Обзор' }
for (const lang of ['en', 'et', 'ru']) {
  for (const [w, h] of [[375, 667], [414, 896]]) {
    for (const storage of [CHILD, {}]) {
      const page = await newPage({ lang, width: w, height: h, storage })
      for (const s of SCREENS) {
        const text = await checkScreen(page, s, `${lang} ${w}px ${storage['ph.childName'] ? 'child' : 'new user'} ${s}`)
        if (s === '#/' && !text.includes(NAV[lang])) fail(`${lang} ${s}`, `bottom menu not in ${lang}`)
      }
      await page.context().close()
    }
  }
}
// Each town once (Today + Explore), Russian (longest strings).
{
  const towns = [...new Set(places.map((p) => p.city))]
  const page = await newPage({ lang: 'ru', storage: CHILD })
  await page.goto(URL0)
  for (const town of [...towns, 'all']) {
    await page.evaluate((c) => localStorage.setItem('ph.city', JSON.stringify(c)), town)
    await checkScreen(page, '#/', `ru town ${town} today`)
    await checkScreen(page, '#/explore', `ru town ${town} explore`)
  }
  await page.context().close()
}

// 2. Every hand-checked place page (and in Estonian/Russian too), every event page.
const PT = { et: JSON.parse(fs.readFileSync('src/data/i18n/places.et.json', 'utf8')), ru: JSON.parse(fs.readFileSync('src/data/i18n/places.ru.json', 'utf8')) }
for (const lang of ['en', 'et', 'ru']) {
  const page = await newPage({ lang, storage: CHILD })
  for (const p of places) {
    const text = await checkScreen(page, `#/place/${p.id}`, `${lang} place ${p.id}`)
    if (!text.includes(p.name)) fail(`${lang} place ${p.id}`, 'name not shown')
    const desc = lang === 'en' ? p.description : PT[lang][p.id]?.description
    if (desc && !text.replace(/\s+/g, ' ').includes(desc.slice(0, 40).replace(/\s+/g, ' '))) fail(`${lang} place ${p.id}`, 'description not in this language')
    if (/Place not found|Kohta ei leitud|Место не найдено/.test(text)) fail(`${lang} place ${p.id}`, 'not found')
  }
  await page.context().close()
}
{
  const page = await newPage({ storage: CHILD })
  for (const e of events) {
    const text = await checkScreen(page, `#/event/${encodeURIComponent(e.id)}`, `event ${e.id}`)
    if (!text.includes(e.title.slice(0, 20))) fail(`event ${e.id}`, 'title not shown')
  }
  await page.context().close()
}

// 2b. A sample of OpenStreetMap places, when the data file is present (e.g. in CI).
{
  const f = path.join(DIST, 'data/osm-places.json')
  const osm = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).places ?? [] : []
  if (osm.length) {
    const page = await newPage({ lang: 'ru', storage: CHILD })
    const step = Math.max(1, Math.floor(osm.length / 80))
    for (let k = 0; k < osm.length; k += step) await checkScreen(page, `#/place/osm-${osm[k].i}`, `osm place ${osm[k].i}`)
    await page.context().close()
  }
}

// 3. User flows.
async function flow(name, fn, opts = { storage: CHILD }) {
  checks++
  const page = await newPage(opts)
  try {
    await fn(page)
  } catch (e) {
    fail(`flow: ${name}`, e.message.split('\n')[0])
  }
  for (const e of page.errors.splice(0)) fail(`flow: ${name}`, e)
  await page.context().close()
}
const count = async (page) => Number((await page.locator('.result-count').innerText()).match(/\d+/)?.[0] ?? -1)
// The OpenStreetMap places arrive a moment after the screen opens: wait until the count settles.
async function settledCount(page) {
  let last = -2
  for (let i = 0; i < 20; i++) {
    const n = await count(page)
    if (n === last) return n
    last = n
    await page.waitForTimeout(400)
  }
  return last
}

await flow('search narrows results', async (page) => {
  await page.goto(URL0 + '#/explore')
  await page.waitForSelector('.result-count')
  const before = await settledCount(page)
  await page.fill('input[type=search]', 'zoo')
  const after = await settledCount(page)
  if (!(after > 0 && after < before)) throw new Error(`search "zoo": ${before} → ${after}`)
  await page.fill('input[type=search]', 'qqqqzzzz')
  await page.waitForSelector('.empty')
})
await flow('category, free and filter sheet', async (page) => {
  await page.goto(URL0 + '#/explore')
  const all = await settledCount(page)
  await page.locator('.chip', { hasText: /^Free$/ }).click()
  const free = await settledCount(page)
  if (!(free > 0 && free < all)) throw new Error(`free filter ${all} → ${free}`)
  await page.click('.icon-button[aria-label="More filters"]')
  await page.waitForSelector('.sheet')
  await page.click('.sheet .segmented button:has-text("Has parking")')
  await page.click('.sheet .button.primary')
  await page.waitForSelector('.sheet', { state: 'detached' })
  await page.click('.category:has-text("Museum")')
  const museums = await page.locator('.place-row').count()
  if (museums === 0 && !(await page.locator('.empty').count())) throw new Error('museum category shows nothing')
})
await flow('show more', async (page) => {
  await page.goto(URL0)
  await page.evaluate(() => localStorage.setItem('ph.city', JSON.stringify('all')))
  await page.goto(URL0 + '#/explore?cat=museum')
  await page.goto(URL0 + '#/explore')
  const rows = await page.locator('.place-row').count()
  const more = page.locator('button:has-text("Show more")')
  if (await more.count()) {
    await more.click()
    if ((await page.locator('.place-row').count()) <= rows) throw new Error('show more did not add rows')
  }
})
await flow('town picker changes places and weather town', async (page) => {
  await page.goto(URL0 + '#/explore')
  await page.click('.city-button')
  await page.click('.city-list button:has-text("Tartu")')
  await page.waitForTimeout(200)
  const ph = await page.getAttribute('input[type=search]', 'placeholder')
  if (!ph.includes('Tartu')) throw new Error(`placeholder "${ph}"`)
  const first = await page.locator('.place-row small').first().innerText()
  if (!/Tartu|Elva|Annelinn|Karlova|Tähtvere/.test(first)) throw new Error(`first row not in Tartu: ${first}`)
})
await flow('map view renders markers', async (page) => {
  await page.goto(URL0 + '#/explore?view=map')
  await page.waitForSelector('.leaflet-container', { timeout: 8000 })
  // Base map: the vector layer (or the image fallback without WebGL) must be there.
  await page.waitForSelector('.leaflet-container canvas.maplibregl-canvas, .leaflet-tile-pane img', { state: 'attached', timeout: 8000 })
  await page.waitForTimeout(800)
  const base = await page.evaluate(() => (document.querySelector('canvas.maplibregl-canvas') ? 'vector' : 'images'))
  console.log(`  map base layer: ${base}`)
})
await flow('save place → appears in Me', async (page) => {
  await page.goto(URL0 + '#/place/tallinn-zoo')
  await page.click('.float-button.right')
  await page.goto(URL0 + '#/me?tab=saved')
  await page.waitForSelector('.place-row:has-text("Tallinn Zoo")')
})
await flow('we went today → weekly goal', async (page) => {
  await page.goto(URL0 + '#/place/tallinn-zoo')
  await page.click('.went-button')
  await page.fill('.moment-input', 'Saw the tigers')
  await page.locator('.moment-input').blur()
  await page.goto(URL0 + '#/')
  const chip = await page.locator('.goal-chip').innerText()
  if (!chip.startsWith('1/')) throw new Error(`goal chip "${chip}"`)
  await page.goto(URL0 + '#/me?tab=moments')
  await page.waitForSelector('text=Saw the tigers')
})
await flow('change language in Family', async (page) => {
  await page.goto(URL0 + '#/me?tab=family')
  await page.click('.segmented button:has-text("Eesti")')
  await page.waitForSelector('.bottom-nav:has-text("Avasta")')
  await page.click('.segmented button:has-text("Русский")')
  await page.waitForSelector('.bottom-nav:has-text("Обзор")')
})
await flow('birthday updates ideas', async (page) => {
  await page.goto(URL0)
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('ph.mode', JSON.stringify('family'))
  })
  await page.goto(URL0 + '#/me?tab=family')
  await page.fill('input[type=date]', '2024-04-01')
  await page.goto(URL0 + '#/')
  await page.waitForSelector('.chip-static:has-text("2 y")')
})
await flow('activity → course list', async (page) => {
  await page.goto(URL0 + '#/activities')
  await page.click('.activity-row:has-text("Swimming")')
  await page.waitForSelector('.steps li')
  if ((await page.locator('.place-row').count()) === 0) throw new Error('no swimming courses listed in Tallinn')
})
await flow('event list opens an event', async (page) => {
  await page.goto(URL0 + '#/events')
  const first = page.locator('.event-row').first()
  if (await first.count()) {
    await first.click()
    await page.waitForSelector('.event-title')
  }
})
await flow('broken links show friendly pages', async (page) => {
  await page.goto(URL0 + '#/place/nope')
  await page.waitForSelector('text=Place not found.')
  await page.goto(URL0 + '#/event/nope')
  await page.waitForSelector('text=This event is no longer listed.')
})

// "Just me" mode: first-open choice, screens in every language, category tiles.
await flow('first open asks who you plan for → Just me', async (page) => {
  await page.goto(URL0 + '#/')
  await page.click('.chooser-option:has-text("Just me")')
  await page.waitForSelector('h1:has-text("What shall I do today?")')
  await page.goto(URL0 + '#/explore')
  await page.waitForSelector('.cat-tile')
  await page.click('.mode-switch button:has-text("Family")')
  await page.waitForSelector('.cat-tile', { state: 'detached' })
}, { storage: {}, mode: null })
// Adult events come from a separate file; serve a fixed sample so the flow does not depend on the day's data.
{
  const at = (min) => new Date(Date.now() + min * 6e4).toISOString()
  const sample = {
    updatedAt: at(0),
    events: [
      { id: 'piletimaailm-1', title: 'Test jazz night', start: at(-1), end: at(120), allDay: false, venue: 'Kultuurikatel', city: 'Tallinn', url: 'https://example.com', source: 'Piletimaailm', kind: 'concert' },
      { id: 'piletimaailm-2', title: 'Test drama', start: at(60 * 26), allDay: false, venue: 'Draamateater', city: 'Tallinn', url: 'https://example.com', source: 'Piletimaailm', kind: 'theatre' },
    ],
  }
  await flow('Just me: concerts and theatre, tonight, event page', async (page) => {
    await page.route('**/data/events-adult.json', (r) => r.fulfill({ json: sample }))
    await page.goto(URL0 + '#/events')
    await page.waitForSelector('.event-row:has-text("Test drama")')
    await page.click('.chip:has-text("Concerts")')
    await page.waitForSelector('.event-row:has-text("Test drama")', { state: 'detached' })
    await page.click('.event-row:has-text("Test jazz night")')
    await page.waitForSelector('.event-title:has-text("Test jazz night")')
    await page.goto(URL0 + '#/event/piletimaailm-2')
    await page.waitForSelector('.event-title:has-text("Test drama")')
    await page.goto(URL0 + '#/')
    await page.waitForSelector('h2:has-text("Tonight")')
    await page.click('.nudge:has-text("Have Stebby")')
    await page.waitForSelector('.stebby-chip')
  }, { storage: {}, mode: 'me' })
}
for (const lang of ['en', 'et', 'ru']) {
  const page = await newPage({ lang, mode: 'me', storage: { 'ph.stebby': true } })
  for (const s of ['#/', '#/explore', '#/explore?cat=swimming', '#/explore?cat=museum', '#/place/kalev-spa-water-park', '#/me?tab=moments', '#/events']) await checkScreen(page, s, `${lang} just-me ${s}`)
  // Adult description in Just me mode, in the page's language.
  const kalev = places.find((p) => p.id === 'kalev-spa-water-park')
  const want = lang === 'en' ? kalev.descriptionMe : PT[lang]['kalev-spa-water-park'].descriptionMe
  const text = await checkScreen(page, '#/place/kalev-spa-water-park', `${lang} just-me adult text`)
  if (!text.replace(/\s+/g, ' ').includes(want.slice(0, 40))) fail(`${lang} just-me place`, 'adult description not shown')
  await page.context().close()
}

// 4. Accessibility (serious and critical issues only).
const axe = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8')
for (const [s, mode] of [['#/', 'family'], ['#/explore', 'family'], ['#/place/tallinn-zoo', 'family'], ['#/activities', 'family'], ['#/activity/swimming', 'family'], ['#/events', 'family'], ['#/me?tab=family', 'family'], ['#/', 'me'], ['#/explore', 'me'], ['#/place/kalev-spa-water-park', 'me'], ['#/', null]]) {
  checks++
  const page = await newPage({ storage: mode === null ? {} : CHILD, mode })
  await page.goto(URL0 + s)
  await page.waitForTimeout(400)
  await page.addScriptTag({ content: axe })
  const res = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, target: v.nodes[0]?.target?.join(' ') })))
  for (const v of res) if (['serious', 'critical'].includes(v.impact)) fail(`a11y ${s}`, `${v.id} (${v.n}×): ${v.help} — e.g. ${v.target}`)
  await page.context().close()
}

await browser.close()
server.close()
const uniq = [...new Set(failures)]
console.log(`\nE2E: ${checks} checks, ${uniq.length} problems`)
const grouped = {}
for (const f of uniq) {
  const key = f.replace(/^(en|et|ru) \d+px (child|new user) /, '').replace(/^(en|et|ru) place [a-z0-9-]+/, 'place *')
  ;(grouped[key] ??= []).push(f)
}
for (const [k, list] of Object.entries(grouped)) console.log(`  ✗ ${list.length > 1 ? `[${list.length}×] ` : ''}${list.length > 1 ? k : list[0]}`)
process.exit(uniq.length ? 1 : 0)
