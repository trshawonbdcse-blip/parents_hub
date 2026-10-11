// One-off: open app.stebby.eu search in a headless browser and record the API calls it makes.
import fs from 'node:fs'
import { chromium } from 'playwright'
const out = 'scripts/stebby/probe'
fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })
const log = []
const browser = await chromium.launch()
const page = await browser.newPage({ locale: 'et-EE' })
page.on('response', async (r) => {
  const t = r.request().resourceType()
  if (t !== 'xhr' && t !== 'fetch') return
  let body = ''
  try { body = (await r.text()).slice(0, 4000) } catch {}
  log.push({ method: r.request().method(), url: r.url(), status: r.status(), reqHeaders: r.request().headers(), post: r.request().postData(), body })
})
for (const u of ['https://app.stebby.eu/search?query=ahhaa', 'https://app.stebby.eu/search?query=loomaaed', 'https://app.stebby.eu/pos/aqva.spa.veekeskus']) {
  await page.goto(u, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => log.push({ error: String(e), url: u }))
  await page.waitForTimeout(3000)
  fs.writeFileSync(`${out}/${u.split('/').pop().replace(/[^\w.-]/g, '_')}.txt`, (await page.innerText('body').catch(() => '')).slice(0, 5000))
}
fs.writeFileSync(`${out}/network.json`, JSON.stringify(log, null, 1))
await browser.close()
