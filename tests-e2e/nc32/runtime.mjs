// The runtime on Nextcloud 32: the small bootstrap, the lazy tour chunk, the admin intro
import path from 'node:path'
import { launch, BASE, ADMIN_PASSWORD, SHOTS } from './nc32.mjs'
const browser = await launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const problems = []
const urls = []
page.on('console', m => { if (/Content.Security.Policy|Refused to/i.test(m.text())) problems.push(m.text().slice(0, 200)) })
page.on('pageerror', e => problems.push('pageerror: ' + e.message.slice(0, 200)))
page.on('request', r => urls.push(r.url()))
await page.goto(BASE + '/index.php/login')
await page.fill('input[name="user"]', 'admin')
await page.fill('input[name="password"]', ADMIN_PASSWORD)
await Promise.all([page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 60000, waitUntil: 'domcontentloaded' }), page.click('button[type="submit"]')])
const results = []
const state = async (label) => {
  const raw = await page.locator('#initial-state-introvox-runtime').getAttribute('value').catch(() => null)
  const decoded = raw ? JSON.parse(Buffer.from(raw, 'base64').toString()) : null
  results.push(`${label}: runtime state ${decoded ? JSON.stringify(decoded) : 'MISSING'}`)
  return decoded
}
await page.goto(BASE + '/index.php/apps/files/')
await state('files')
const tour = await page.locator('.shepherd-element:visible').waitFor({ timeout: 30000 }).then(() => true, () => false)
const title = tour ? (await page.locator('.shepherd-element:visible .shepherd-title').textContent()).trim() : '-'
results.push(`files: tour ${tour} (${title}), chunk ${urls.some(u => /\/js\/tour\.[0-9a-f]{8}\.js/.test(u))}`)
if (tour) {
  await page.locator('.shepherd-element:visible').getByRole('button', { name: /Skip/ }).click()
  await page.waitForTimeout(1500)
}
urls.length = 0
await page.goto(BASE + '/index.php/apps/spreed/')
await page.waitForTimeout(6000)
await state('talk')
results.push(`talk after skip: chunk ${urls.some(u => /\/js\/tour\./.test(u))}, introvox calls ${urls.filter(u => /\/apps\/introvox\/(api|personal)\//.test(u)).length}`)
await page.goto(BASE + '/index.php/settings/admin/introvox')
await page.waitForSelector('.introvox-admin__panes', { timeout: 30000 })
await state('admin settings')
const intro = await page.locator('.shepherd-element:visible').waitFor({ timeout: 15000 }).then(async () => (await page.locator('.shepherd-element:visible .shepherd-title').textContent()).trim(), () => 'none')
results.push(`admin settings: admin intro "${intro}"`)
await page.screenshot({ path: path.join(SHOTS, 'nc32-admin.png') })
console.log(results.join('\n'))
console.log('CSP/page errors:', problems.length ? problems : 'none')
await browser.close()
