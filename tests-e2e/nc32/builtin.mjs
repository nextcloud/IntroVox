// The built-in tours on Nextcloud 32: listed, and each step on its element
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
const api = (method, url, body) => page.evaluate(async ({ method, url, body }) => {
  const r = await fetch(OC.generateUrl(url), { method, headers: { 'Content-Type': 'application/json', requesttoken: OC.requestToken }, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, data: await r.json().catch(() => null) }
}, { method, url, body })
await api('POST', '/apps/introvox/personal/settings', { wizardDisabled: true, toursDisabled: false })
await api('POST', '/apps/introvox/admin/intro/done')
const tours = (await api('GET', '/apps/introvox/admin/tours')).data.tours
console.log('listed:', tours.filter(t => t.builtin && t.id !== 'welcome').map(t => `${t.id}(${t.enabled ? 'on' : 'off'}, ${t.stepCount})`).join(' '))
const step = () => page.locator('.shepherd-element:visible')
for (const [id, app] of [['builtin-files', 'files'], ['builtin-talk', 'spreed'], ['builtin-deck', 'deck'], ['builtin-calendar', 'calendar']]) {
  await api('PUT', `/apps/introvox/admin/tours/${id}`, { tour: { enabled: true } })
  await api('POST', `/apps/introvox/admin/tours/${id}/reshow`)
  // A tour that just ended holds the next one back in this tab (chooseTour)
  await page.evaluate(() => sessionStorage.clear())
  await page.goto(`${BASE}/index.php/apps/${app}/`)
  const seen = []
  const shown = await step().waitFor({ timeout: 30000 }).then(() => true, () => false)
  for (let i = 0; shown && i < 8; i++) {
    await page.waitForTimeout(800)
    const title = (await step().locator('.shepherd-title').textContent()).trim()
    const centered = await step().evaluate(el => el.classList.contains('shepherd-centered'))
    seen.push(`${title}${centered ? '' : ' @'}`)
    const next = step().getByRole('button', { name: /^(Next|Start tour)/ })
    if (await next.count() === 0) {
      await step().getByRole('button', { name: /Done/ }).click().catch(() => {})
      break
    }
    await next.click()
    await page.waitForFunction((before) => {
      const el = [...document.querySelectorAll('.shepherd-element')].find(e => e.offsetParent !== null)
      return el && el.querySelector('.shepherd-title')?.textContent.trim() !== before
    }, title, { timeout: 15000 }).catch(() => {})
  }
  await page.screenshot({ path: path.join(SHOTS, `nc32-${app}.png`) })
  await api('PUT', `/apps/introvox/admin/tours/${id}`, { tour: { enabled: false } })
  console.log(`${app}: ${seen.join(' → ') || 'did not start'}`)
}
console.log('errors:', errors.join(' | ') || 'none')
await browser.close()
