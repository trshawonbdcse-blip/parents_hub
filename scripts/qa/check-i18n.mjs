// QA: every UI string passed to t()/tr() has Estonian and Russian translations with the
// same {placeholders}. Exits 1 when something is missing.
import fs from 'node:fs'
import path from 'node:path'

const files = []
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) && files.push(path.join(d, e.name))))
walk('src')

// Load the dictionary by evaluating the object literal in dict.ts.
const dictSrc = fs.readFileSync('src/lib/dict.ts', 'utf8')
const body = dictSrc.slice(dictSrc.indexOf('{', dictSrc.indexOf('export const DICT')), dictSrc.lastIndexOf('}') + 1)
const DICT = Function(`return (${body})`)()

const used = new Map()
const add = (s, f) => { if (!used.has(s)) used.set(s, f) }
for (const f of files) {
  if (f.endsWith('dict.ts')) continue
  const src = fs.readFileSync(f, 'utf8')
  // t('…'), tr('…'), translate('…') with a plain string literal.
  for (const m of src.matchAll(/\b(?:t|tr|translate)\(\s*(['"])((?:\\.|(?!\1).)*)\1/g)) add(m[2].replace(/\\'/g, "'"), f)
  // Labels in tables that are translated later: label: '…', and ['key', 'Label'] pairs in segmented controls.
  for (const m of src.matchAll(/\blabel:\s*'((?:\\.|[^'])*)'/g)) add(m[1].replace(/\\'/g, "'"), f)
  for (const m of src.matchAll(/\[\s*'[a-z-]+'\s*,\s*'([A-Z][^']*)'/g)) add(m[1], f)
}
// Text produced from data at runtime.
for (const s of ['Clear', 'Partly cloudy', 'Cloudy', 'Fog', 'Drizzle', 'Rain', 'Snow', 'Showers', 'Snow showers', 'Thunderstorm']) add(s, 'weather.ts')

const ph = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join(',')
const missing = []
const bad = []
for (const [s, f] of used) {
  const e = DICT[s]
  if (!e) { missing.push(`${s}   (${f})`); continue }
  for (const lang of ['et', 'ru']) {
    if (!e[lang]) bad.push(`${s}: empty ${lang}`)
    else if (ph(e[lang]) !== ph(s)) bad.push(`${s}: ${lang} placeholders ${ph(e[lang])} ≠ ${ph(s)}`)
  }
}
// Brand/proper names that are the same in every language.
const SAME = new Set(['Stebby', 'Pargi.ee', 'Google Calendar', 'iPhone / Mac', 'Eesti', 'Русский', 'English'])
const realMissing = missing.filter((m) => !SAME.has(m.split('   ')[0]))
console.log(`UI strings used: ${used.size} · in dictionary: ${Object.keys(DICT).length}`)
console.log(`Missing translations (${realMissing.length}):`)
realMissing.forEach((m) => console.log('  ✗', m))
console.log(`Problems (${bad.length}):`)
bad.forEach((m) => console.log('  ✗', m))
process.exit(realMissing.length || bad.length ? 1 : 0)
