// Nextcloud 32 without an AI provider: the Assistant routes say so, and the
// step editor shows no AI buttons
import { launch, BASE, PASSWORD } from './nc32.mjs'
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
const api = (method, url, body) => page.evaluate(async ({ method, url, body }) => {
  const r = await fetch(OC.generateUrl(url), { method, headers: { 'Content-Type': 'application/json', requesttoken: OC.requestToken }, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, data: await r.json().catch(() => null) }
}, { method, url, body })
await api('POST', '/apps/introvox/admin/intro/done')
const status = await api('GET', '/apps/introvox/admin/assistant')
const translate = await api('POST', '/apps/introvox/admin/assistant/translate', { tour: 'welcome', from: 'en', to: 'nl' })
await page.goto(BASE + '/index.php/settings/admin/introvox')
await page.locator('.introvox-admin__panes').getByText('Tours', { exact: true }).click()
await page.locator('.introvox-tours__item').first().getByRole('button', { name: 'Edit steps' }).click()
await page.waitForSelector('.step-item')
await page.waitForTimeout(1500)
const buttons = await page.getByRole('button', { name: /with AI/ }).count()
const preview = await page.getByRole('button', { name: 'Preview tour' }).count()
console.log(JSON.stringify({ status: status.data, translate: [translate.status, translate.data?.error], aiButtons: buttons, previewButton: preview, errors }))
const ok = status.data?.available === false && translate.status === 503 && translate.data?.error === 'unavailable' && buttons === 0 && preview === 1 && errors.length === 0
console.log(ok ? 'PASS nc32 without a provider' : 'FAIL nc32 without a provider')
await browser.close()
process.exit(ok ? 0 : 1)
