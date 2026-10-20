// Nextcloud 32: the checklist widget on the Dashboard
import path from 'node:path'
import { launch, BASE, PASSWORD, SHOTS } from './nc32.mjs'
const browser = await launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await context.addInitScript(() => localStorage.setItem('introvox_completed', 'true'))
const page = await context.newPage()
const errors = []
page.on('pageerror', e => errors.push(e.message.slice(0, 150)))
await page.goto(BASE + '/index.php/login')
await page.fill('input[name="user"]', 'introvox-e2e-admin2')
await page.fill('input[name="password"]', PASSWORD)
await Promise.all([page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 60000, waitUntil: 'domcontentloaded' }), page.click('button[type="submit"]')])
const call = (method, url, body, ocs = false) => page.evaluate(async ({ method, url, body, ocs }) => {
  const r = await fetch(ocs ? url : OC.generateUrl(url), { method, headers: { 'Content-Type': 'application/json', Accept: 'application/json', requesttoken: OC.requestToken, ...(ocs ? { 'OCS-APIRequest': 'true' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, data: await r.json().catch(() => null) }
}, { method, url, body, ocs })
await call('POST', '/apps/introvox/admin/settings', { checklist: { enabled: true, onDashboard: true } })
const items = (await call('GET', '/ocs/v2.php/apps/dashboard/api/v2/widget-items?widgets[]=introvox-checklist', null, true)).data?.ocs?.data?.['introvox-checklist']
await page.goto(BASE + '/index.php/apps/dashboard/')
const shown = await page.locator('.panel', { hasText: 'Getting started' }).waitFor({ timeout: 20000 }).then(() => true, () => false)
await page.waitForTimeout(1500)
await page.screenshot({ path: path.join(SHOTS, 'nc32-checklist.png') })
const off = await call('POST', '/apps/introvox/admin/settings', { checklist: { enabled: false, onDashboard: false } })
const titles = (items?.items || []).map(i => `${i.title}${i.subtitle === 'Completed' ? ' ✓' : ''}`)
console.log(JSON.stringify({ titles, empty: items?.emptyContentMessage, shown, off: off.data?.checklist?.enabled, errors }))
const ok = shown && (titles.length > 0 || /All done/.test(items?.emptyContentMessage || '')) && off.data?.checklist?.enabled === false && errors.length === 0
console.log(ok ? 'PASS nc32 checklist' : 'FAIL nc32 checklist')
await browser.close()
process.exit(ok ? 0 : 1)
