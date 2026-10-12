// QA: validates the place, event, activity and translation data. Exits 1 on errors.
// usage: node scripts/qa/check-data.mjs
import fs from 'node:fs'

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))
const places = read('src/data/places.json')
const et = read('src/data/i18n/places.et.json')
const ru = read('src/data/i18n/places.ru.json')
const acts = read('src/data/activities.json')
const actTr = read('src/data/i18n/activities.json')
const tips = read('src/data/i18n/tips.json')
const money = read('src/data/money-tips.json')
const parking = read('src/data/parking-rules.json')

const CATS = ['playground', 'park', 'museum', 'indoor-play', 'library', 'swimming', 'zoo-farm', 'beach', 'mall', 'cafe', 'theatre', 'class', 'winter-fun']
const HUBS = ['Tallinn', 'Tartu', 'Pärnu', 'Narva', 'Jõhvi', 'Rakvere', 'Viljandi', 'Haapsalu', 'Kuressaare', 'Kärdla', 'Paide', 'Rapla', 'Võru', 'Valga', 'Põlva', 'Jõgeva', 'Otepää']
const ACT_KEYS = acts.map((a) => a.key)
const errors = []
const warnings = []
const err = (id, m) => errors.push(`${id}: ${m}`)
const warn = (id, m) => warnings.push(`${id}: ${m}`)
const isUrl = (u) => { try { return ['http:', 'https:'].includes(new URL(u).protocol) } catch { return false } }

const ids = new Set()
for (const p of places) {
  const id = p.id ?? '(no id)'
  if (!/^[a-z0-9-]+$/.test(id)) err(id, 'id must be kebab-case')
  if (ids.has(id)) err(id, 'duplicate id')
  ids.add(id)
  for (const k of ['name', 'category', 'setting', 'season', 'area', 'city', 'address', 'description', 'hours']) if (!p[k] || typeof p[k] !== 'string') err(id, `missing ${k}`)
  if (!CATS.includes(p.category)) err(id, `bad category ${p.category}`)
  if (!['indoor', 'outdoor', 'both'].includes(p.setting)) err(id, `bad setting ${p.setting}`)
  if (!['all-year', 'summer', 'winter'].includes(p.season)) err(id, `bad season ${p.season}`)
  if (!HUBS.includes(p.city)) err(id, `bad city ${p.city}`)
  if (typeof p.lat !== 'number' || typeof p.lng !== 'number' || p.lat < 57.5 || p.lat > 59.8 || p.lng < 21.7 || p.lng > 28.3) err(id, `coordinates outside Estonia (${p.lat}, ${p.lng})`)
  if (!(p.ageMinMonths >= 0 && p.ageMaxMonths >= p.ageMinMonths && p.ageMaxMonths <= 240)) err(id, `bad age range ${p.ageMinMonths}-${p.ageMaxMonths}`)
  if (!(p.durationMinutes > 0 && p.durationMinutes <= 600)) err(id, `bad duration ${p.durationMinutes}`)
  const pr = p.price
  if (!pr || typeof pr.free !== 'boolean') err(id, 'missing price.free')
  else {
    for (const k of ['adult', 'child', 'family']) if (pr[k] !== null && !(typeof pr[k] === 'number' && pr[k] >= 0 && pr[k] < 500)) err(id, `bad price.${k} ${pr[k]}`)
    if (pr.free && (pr.adult > 0 || pr.child > 0)) err(id, 'marked free but has a price')
    if (pr.childFreeUnderMonths !== null && !(pr.childFreeUnderMonths > 0 && pr.childFreeUnderMonths <= 240)) err(id, `bad childFreeUnderMonths ${pr.childFreeUnderMonths}`)
  }
  if (!Array.isArray(p.discounts)) err(id, 'discounts must be an array')
  if (!p.facilities || typeof p.facilities !== 'object') err(id, 'missing facilities')
  if (p.website && !isUrl(p.website)) err(id, `bad website ${p.website}`)
  if (!p.website) warn(id, 'no website')
  if (p.phone && !/^\+?[\d\s()-]{6,20}$/.test(p.phone)) err(id, `odd phone "${p.phone}"`)
  if (p.phone && !p.phone.startsWith('+372') && !p.phone.startsWith('+')) warn(id, `phone without country code "${p.phone}"`)
  if (p.email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(p.email)) err(id, `bad email ${p.email}`)
  if (!p.phone && !p.email) warn(id, 'no phone or email')
  for (const ph of p.photos ?? []) {
    if (!ph.src?.startsWith('https://')) err(id, `photo not https: ${ph.src}`)
    if (!ph.credit) err(id, 'photo without credit')
  }
  if (p.activities) for (const a of p.activities) if (!ACT_KEYS.includes(a)) err(id, `unknown activity ${a}`)
  if (p.description.length < 40) warn(id, 'very short description')
  if (/\bI (couldn|could|think|found)\b/.test(p.description + (p.tips ?? ''))) err(id, 'first-person research note left in text')
  // Translations: present, and nulls/array lengths match the English.
  for (const [lang, table] of [['et', et], ['ru', ru]]) {
    const t = table[id]
    if (!t) { err(id, `missing ${lang} translation`); continue }
    if (!t.description) err(id, `${lang}: empty description`)
    if ((p.tips === null) !== (t.tips === null || t.tips === undefined)) warn(id, `${lang}: tips null mismatch`)
    if ((t.discounts?.length ?? 0) !== p.discounts.length) warn(id, `${lang}: ${t.discounts?.length ?? 0} discounts vs ${p.discounts.length}`)
    if (lang === 'ru' && t.description && !/[а-яё]/i.test(t.description)) err(id, 'ru description has no Cyrillic')
  }
}
for (const id of Object.keys(et)) if (!ids.has(id)) warn(id, 'et translation for unknown place')
for (const id of Object.keys(ru)) if (!ids.has(id)) warn(id, 'ru translation for unknown place')

// Activities and their translations.
for (const a of acts) {
  for (const lang of ['et', 'ru']) {
    const t = actTr[lang]?.[a.key]
    if (!t) { err(`activity ${a.key}`, `missing ${lang}`); continue }
    for (const k of ['why', 'steps', 'bring', 'tips']) if ((t[k]?.length ?? 0) !== a[k].length) err(`activity ${a.key}`, `${lang}.${k} length mismatch`)
  }
}
// Tips translations line up with the English lists.
for (const lang of ['et', 'ru']) {
  if ((tips[lang]?.money?.length ?? 0) !== money.length) err('tips', `${lang} money tips ${tips[lang]?.money?.length} vs ${money.length}`)
  if ((tips[lang]?.parking?.length ?? 0) !== parking.length) err('tips', `${lang} parking rules ${tips[lang]?.parking?.length} vs ${parking.length}`)
}

// Events (if present).
if (fs.existsSync('src/data/events.json')) {
  const ev = read('src/data/events.json').events ?? []
  for (const e of ev) {
    if (!e.id || !e.title || !e.start || isNaN(new Date(e.start))) err(`event ${e.id}`, 'missing id/title/start')
    if (e.url && !isUrl(e.url)) err(`event ${e.id}`, `bad url ${e.url}`)
  }
}

console.log(`Places: ${places.length} · activities: ${acts.length}`)
console.log(`Warnings (${warnings.length}):`)
const byKind = {}
for (const w of warnings) { const k = w.split(': ').slice(1).join(': ').replace(/".*"|\d+/g, '#'); byKind[k] = (byKind[k] ?? 0) + 1 }
for (const [k, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) console.log(`  ${n} × ${k}`)
if (process.argv.includes('--verbose')) warnings.forEach((w) => console.log('   ', w))
console.log(`Errors (${errors.length}):`)
errors.forEach((e) => console.log('  ✗', e))
process.exit(errors.length ? 1 : 0)
