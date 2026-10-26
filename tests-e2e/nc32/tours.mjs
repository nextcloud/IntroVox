// Tours per app on Nextcloud 32: the repair step, the Tours pane and a tour in its app
import { execFileSync } from 'node:child_process'
import { launch, BASE, ADMIN_PASSWORD, CONTAINER, occ } from './nc32.mjs'
const browser = await launch()
const problems = []
const login = async (user, password) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  page.on('pageerror', e => problems.push(`${user} pageerror: ${e.message.slice(0, 200)}`))
  page.on('response', r => { if (r.url().includes('/apps/introvox/') && r.status() >= 500) problems.push(`${user} ${r.status()} ${r.url()}`) })
  await page.goto(BASE + '/index.php/login')
  await page.fill('input[name="user"]', user)
  await page.fill('input[name="password"]', password)
  await Promise.all([page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 60000, waitUntil: 'domcontentloaded' }), page.click('button[type="submit"]')])
  return { context, page }
}
const api = (page, method, url, body) => page.evaluate(async ({ method, url, body }) => {
  const r = await fetch(OC.generateUrl(url), { method, headers: { 'Content-Type': 'application/json', requesttoken: OC.requestToken }, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, data: await r.json().catch(() => null) }
}, { method, url, body })
const results = []
const ok = (label, pass, detail = '') => results.push(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`)

// The repair step on this version, twice
const repair = () => execFileSync('docker', ['exec', '-u', 'www-data', '-w', '/var/www/html', CONTAINER, 'php', '-r', 'require "lib/base.php"; \\OCP\\Server::get(\\OCA\\IntroVox\\Migration\\IntroduceTours::class)->run(new \\OC\\Migration\\SimpleOutput(\\OCP\\Server::get(\\Psr\\Log\\LoggerInterface::class), "introvox"));'], { encoding: 'utf8' })
try { occ('user:delete', 'nc32-tours') } catch (e) {}
execFileSync('docker', ['exec', '-u', 'www-data', '-e', 'OC_PASS=nc32-tours-pass-1', CONTAINER, 'php', 'occ', 'user:add', '--password-from-env', 'nc32-tours'])
occ('user:setting', 'nc32-tours', 'introvox', 'wizard_disabled', 'true')
occ('user:setting', 'nc32-tours', 'introvox', 'wizard_started', '1700000000')
occ('config:app:delete', 'introvox', 'tours_introduced')
repair()
const optedOut = occ('user:setting', 'nc32-tours', 'introvox', 'tours_disabled').trim()
occ('user:setting', 'nc32-tours', 'introvox', 'tours_disabled', 'false')
repair()
const second = occ('user:setting', 'nc32-tours', 'introvox', 'tours_disabled').trim()
ok('repair step: opted-out user gets tours off, once', optedOut === 'true' && second === 'false', `${optedOut} then ${second}`)

const admin = await login('admin', ADMIN_PASSWORD)
occ('user:setting', 'admin', 'introvox', 'admin_intro_done', '1')
const created = await api(admin.page, 'POST', '/apps/introvox/admin/tours', { tour: { name: 'Talk', trigger: { type: 'app', app: 'spreed' }, mainLanguage: 'en', visibleToGroups: [], audience: 'everyone' } })
const id = created.data?.tour?.id
const tooEarly = await api(admin.page, 'PUT', `/apps/introvox/admin/tours/${id}`, { tour: { enabled: true } })
await api(admin.page, 'POST', '/apps/introvox/admin/steps', { lang: 'en', tour: id, steps: [{ id: 'n-1', title: 'Talk on 32', text: '<p>Hi</p>', attachTo: '', enabled: true, visibleToGroups: [], page: '/apps/spreed/' }] })
const on = await api(admin.page, 'PUT', `/apps/introvox/admin/tours/${id}`, { tour: { enabled: true } })
ok('admin: create, refused on without steps, on with one', created.status === 200 && tooEarly.status !== 200 && on.status === 200 && on.data.tour.enabled === true, `${created.status} ${tooEarly.status}/${tooEarly.data?.error} ${on.status}`)

await admin.page.goto(BASE + '/index.php/settings/admin/introvox')
await admin.page.locator('.introvox-admin__panes').getByText('Tours', { exact: true }).click()
await admin.page.locator('.introvox-tours__item').nth(1).waitFor({ timeout: 20000 }).catch(async () => { await admin.page.screenshot({ path: 'nc32-tours.png' }); console.log(results.join('\n')); console.log(JSON.stringify(await api(admin.page, 'GET', '/apps/introvox/admin/tours')).slice(0, 1500)); console.log(problems.join('\n')) })
const rows = await admin.page.locator('.introvox-tours__item').filter({ hasNot: admin.page.locator('.introvox-tours__badge') }).allTextContents()
const icon = await admin.page.locator('.introvox-tours__item', { hasText: 'Talk' }).filter({ hasNot: admin.page.locator('.introvox-tours__badge') }).locator('img').getAttribute('src').catch(() => null)
await admin.page.getByRole('button', { name: 'New tour' }).click()
await admin.page.getByRole('dialog', { name: 'New tour' }).locator('.vs__search').first().click()
const apps = await admin.page.getByRole('option').count()
await admin.page.keyboard.press('Escape')
ok('admin: Tours pane lists both, with the Talk icon; the app list loads', rows.length === 2 && !!icon && apps > 3, `${rows.length} rows, icon ${icon}, ${apps} apps`)

const user = await login('nc32-tours', 'nc32-tours-pass-1')
await user.page.goto(BASE + '/index.php/apps/spreed/')
const shown = await user.page.locator('.shepherd-element:visible').waitFor({ timeout: 30000 }).then(async () => (await user.page.locator('.shepherd-element:visible .shepherd-title').textContent()).trim(), () => 'none')
ok('user: the Talk tour starts in Talk', shown === 'Talk on 32', shown)
// Tours in the user menu, above Help (the tour closed first)
await user.page.locator('.shepherd-element:visible .shepherd-cancel-icon').click().catch(() => {})
await user.page.locator('#user-menu button, .header-menu.account-menu .header-menu__trigger').first().click()
const menu = await user.page.evaluate(() => [...document.querySelectorAll('#header-menu-user-menu li, .account-menu li')].map(li => li.textContent.trim()).filter(Boolean))
ok('user menu: Tours, just above Help', menu.indexOf('Tours') >= 0 && menu.indexOf('Tours') === menu.findIndex(text => /Help/.test(text)) - 1, JSON.stringify(menu))
await user.page.keyboard.press('Escape')
await user.page.goto(BASE + '/index.php/settings/user/introvox-help')
const row = user.page.locator('.introvox-tour-list__tour', { hasText: 'Talk' })
const rowText = await row.waitFor({ timeout: 20000 }).then(() => row.textContent(), () => 'none')
ok('user: the personal list shows it as seen', /Seen/.test(rowText) && !/Not seen/.test(rowText), rowText.trim().replace(/\s+/g, ' '))

// How far the user got, and the tour moved through a .zip
await user.page.waitForTimeout(1500)
const stats = (await api(admin.page, 'GET', `/apps/introvox/admin/tours/${id}/statistics`)).data?.statistics
ok('statistics: the run that started by itself is counted', stats?.started === 1 && stats?.counted === 1 && stats?.steps?.[0]?.reached === 1, JSON.stringify(stats))
const zip = await admin.page.evaluate(async (id) => {
  const r = await fetch(OC.generateUrl(`/apps/introvox/admin/tours/${id}/export`), { headers: { requesttoken: OC.requestToken } })
  const blob = await r.blob()
  const form = new FormData()
  form.append('file', blob, 'tour.zip')
  const imported = await fetch(OC.generateUrl('/apps/introvox/admin/tours/import'), { method: 'POST', headers: { requesttoken: OC.requestToken }, body: form })
  return { status: r.status, type: r.headers.get('Content-Type'), size: blob.size, imported: imported.status, data: await imported.json() }
}, id)
ok('export and import: the tour comes back as a new one, switched off', zip.status === 200 && /zip/.test(zip.type) && zip.imported === 200 && zip.data.tour?.enabled === false && zip.data.tour?.stepCount === 1, JSON.stringify({ ...zip, data: { tour: zip.data.tour?.id, enabled: zip.data.tour?.enabled, steps: zip.data.tour?.stepCount, error: zip.data.error } }))
if (zip.data.tour?.id) await api(admin.page, 'DELETE', `/apps/introvox/admin/tours/${zip.data.tour.id}`)

const del = await api(admin.page, 'DELETE', `/apps/introvox/admin/tours/${id}`)
ok('admin: delete', del.status === 200)
occ('user:delete', 'nc32-tours')
ok('no page errors or 5xx', problems.length === 0, problems.join(' | '))
await browser.close()
console.log(results.join('\n'))
