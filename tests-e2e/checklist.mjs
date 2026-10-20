// "Getting started" on the Dashboard — switched on by an admin,
// ticked off by what each user does.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { launch, login, api, check, summary, assert, ssh, occ, addUser, BASE, NC } from './lib.mjs'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const ADMIN = 'introvox-e2e-admin'
const USER = 'introvox-e2e-c1'
const WIDGET = 'introvox-checklist'
const SQUARE = fs.readFileSync(path.join(DIR, 'media', 'square.png'))


addUser(ADMIN, 'admin')
addUser(USER)

// What an admin set up on the VM stays: kept, cleared for the suite, and put
// back when it ends, however it ends
const KEYS = [['introvox', 'checklist_enabled'], ['introvox', 'checklist_tasks'], ['introvox', 'checklist_custom'], ['dashboard', 'layout']]
const get = (app, key) => { try { return occ(`config:app:get ${app} ${key}`).trim() } catch (e) { return null } }
const kept = KEYS.map(([app, key]) => [app, key, get(app, key)])
const restore = () => {
  for (const [app, key, value] of kept) {
    if (value === null) {
      occ(`config:app:delete ${app} ${key}`)
    } else {
      ssh(`read -r v; cd ${NC} && sudo -u www-data php occ config:app:set ${app} ${key} --value="$v" >/dev/null`, value + '\n')
    }
  }
}
process.on('exit', restore)
for (const [app, key] of KEYS) occ(`config:app:delete ${app} ${key}`)

const browser = await launch()
const admin = await login(browser, ADMIN)
const page = admin.page
const user = await login(browser, USER)

// OCS from inside the page, with the session and its request token
const ocs = (p, method, url, body) => p.evaluate(async ({ method, url, body }) => {
  const response = await fetch(url, {
    method,
    headers: { 'OCS-APIRequest': 'true', Accept: 'application/json', 'Content-Type': 'application/json', requesttoken: OC.requestToken },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: response.status, data: (await response.json().catch(() => null))?.ocs?.data }
}, { method, url, body })
const widgets = async (p) => Object.keys((await ocs(p, 'GET', '/ocs/v2.php/apps/dashboard/api/v1/widgets')).data || {})
const items = async (p) => (await ocs(p, 'GET', `/ocs/v2.php/apps/dashboard/api/v2/widget-items?widgets[]=${WIDGET}`)).data?.[WIDGET]
const done = async () => Object.fromEntries((await items(user.page)).items.map(i => [i.title, i.subtitle === 'Completed']))
// The code an authenticator app shows for a TOTP secret (RFC 6238: SHA-1, 6 digits, 30 s)
const totp = (secret) => {
  const bits = [...secret.replace(/=+$/, '').toUpperCase()].map(c => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c).toString(2).padStart(5, '0')).join('')
  const key = Buffer.from(bits.match(/.{8}/g).map(b => parseInt(b, 2)))
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)))
  const hmac = crypto.createHmac('sha1', key).update(counter).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0')
}
const settings = async () => (await api(page, 'GET', '/apps/introvox/admin/settings')).data.checklist

await check('checklist: off until an admin switches it on', async () => {
  const s = await settings()
  const list = await widgets(user.page)
  assert(s.enabled === false && s.onDashboard === false, JSON.stringify(s))
  assert(s.tasks.length === 6 && s.tasks.every(t => t.chosen && t.title), JSON.stringify(s.tasks))
  assert(!list.includes(WIDGET), 'widget offered while off')
})

await check('checklist: an admin switches it on, picks the tasks and puts it on every Dashboard', async () => {
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  const skip = page.locator('.shepherd-element:visible').getByRole('button', { name: 'Skip' })
  if (await skip.waitFor({ timeout: 8000 }).then(() => true, () => false)) await skip.click()
  const section = page.locator('.settings-section', { hasText: 'Checklist on the Dashboard' })
  await section.getByText('Show "Getting started" on the Dashboard').click()
  await section.getByText('Tasks', { exact: true }).waitFor()
  await page.screenshot({ path: path.join(DIR, 'shots', 'p8-settings.png'), fullPage: true })
  // One task off and on again, and the last one cannot go
  await section.getByText('Take the welcome tour').click()
  await page.waitForTimeout(800)
  const without = (await settings()).tasks.filter(t => t.chosen).map(t => t.id)
  await section.getByText('Take the welcome tour').click()
  await page.waitForTimeout(800)
  await section.getByText('Put it on every Dashboard').click()
  await page.waitForTimeout(800)
  const s = await settings()
  const layout = occ('config:app:get dashboard layout').trim()
  assert(JSON.stringify(without) === '["upload","avatar","client","talk","twofactor"]', JSON.stringify(without))
  assert(s.enabled && s.onDashboard && s.tasks.every(t => t.chosen), JSON.stringify(s))
  assert(layout.startsWith(WIDGET + ','), layout)
}, page)

await check('checklist: a new user finds it on the Dashboard, with nothing done yet', async () => {
  await user.page.goto(BASE + '/index.php/apps/dashboard/')
  const panel = user.page.locator('.panel', { hasText: 'Getting started' })
  await panel.waitFor({ timeout: 20000 })
  await user.page.waitForTimeout(1500)
  await user.page.screenshot({ path: path.join(DIR, 'shots', 'p8-dashboard-new.png') })
  const state = await done()
  const shown = await panel.locator('.item-list__entry, li').count()
  assert(JSON.stringify(Object.keys(state)) === JSON.stringify(['Take the welcome tour', 'Upload a file', 'Add a profile picture', 'Install the app', 'Send a message in Talk', 'Secure your account']), JSON.stringify(state))
  assert(Object.values(state).every(v => v === false), JSON.stringify(state))
  assert(shown >= 6, `items shown: ${shown}`)
  const links = (await items(user.page)).items.map(i => i.link)
  assert(links[0].endsWith('/apps/files/?introvox-tour=welcome') && links.every(l => l.startsWith('http')), JSON.stringify(links))
}, user.page)

await check('checklist: Talk\'s own welcome conversations do not count; a message of one\'s own does', async () => {
  // Opening Talk makes its sample conversations, with messages from others
  await user.page.goto(BASE + '/index.php/apps/spreed/')
  await user.page.waitForTimeout(5000)
  const before = (await done())['Send a message in Talk']
  const rooms = (await ocs(user.page, 'GET', '/ocs/v2.php/apps/spreed/api/v4/room')).data || []
  const room = rooms.find(r => r.type === 6) || rooms[0]
  const sent = await ocs(user.page, 'POST', `/ocs/v2.php/apps/spreed/api/v1/chat/${room.token}`, { message: 'Hello from the checklist test' })
  const after = (await done())['Send a message in Talk']
  assert(rooms.length > 0 && before === false, `rooms ${rooms.length}, done before sending: ${before}`)
  assert(sent.status === 201 && after === true, `sent ${sent.status}, done after: ${after}`)
}, user.page)

await check('checklist: uploading, a picture, a client, two-factor and the welcome tour tick themselves off', async () => {
  // Upload through WebDAV, as the web page and the clients do
  const put = await user.page.evaluate(async (uid) => (await fetch(`/remote.php/dav/files/${uid}/checklist-test.txt`, { method: 'PUT', headers: { requesttoken: OC.requestToken }, body: 'hello' })).status, USER)
  // A profile picture, as Personal info sets it
  const avatar = await user.page.evaluate(async (bytes) => {
    const form = new FormData()
    form.append('files[]', new Blob([new Uint8Array(bytes)], { type: 'image/png' }), 'me.png')
    return (await fetch('/index.php/avatar/', { method: 'POST', headers: { requesttoken: OC.requestToken }, body: form })).status
  }, [...SQUARE])
  // The desktop client signing in with Login Flow v2
  const flow = await (await fetch(BASE + '/index.php/login/v2', { method: 'POST', headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh) mirall/3.14.0 (Nextcloud, osx-24.0.0 ClientArchitecture: arm64 OsArchitecture: arm64)' } })).json()
  await user.page.goto(flow.login)
  await user.page.getByRole('button', { name: /Log in/ }).click()
  await user.page.getByRole('button', { name: /Grant access/ }).click()
  await user.page.getByText(/Account connected|connected/i).first().waitFor({ timeout: 15000 })
  // Two-factor: TOTP set up as Security does, with the code an app would show
  const created = await api(user.page, 'POST', '/apps/twofactor_totp/settings/enable', { state: 1 })
  const enabled = await api(user.page, 'POST', '/apps/twofactor_totp/settings/enable', { state: 2, code: totp(created.data.secret) })
  await api(user.page, 'POST', '/apps/introvox/api/wizard/complete')
  const state = await done()
  assert(put === 201 && avatar === 200 && enabled.data?.state === 2, `put ${put}, avatar ${avatar}, totp ${JSON.stringify(enabled.data)}`)
  assert(Object.values(state).every(v => v === true) || (await items(user.page)).items.length === 0, JSON.stringify(state))
}, user.page)

await check('checklist: all done says so, and offers to remove the list', async () => {
  const result = await items(user.page)
  await user.page.goto(BASE + '/index.php/apps/dashboard/')
  const panel = user.page.locator('.panel', { hasText: 'Getting started' })
  await panel.getByText('All done.').waitFor({ timeout: 20000 })
  await user.page.screenshot({ path: path.join(DIR, 'shots', 'p8-dashboard-done.png') })
  assert(result.items.length === 0 && /^All done\./.test(result.emptyContentMessage), JSON.stringify(result))
}, user.page)

await check('checklist: an own task, made in the settings, ticks itself off once opened from the list', async () => {
  const refused = await api(page, 'POST', '/apps/introvox/admin/settings', { checklist: { custom: [{ title: 'Elsewhere', page: 'https://example.com/' }] } })
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  const section = page.locator('.settings-section', { hasText: 'Checklist on the Dashboard' })
  await section.getByRole('button', { name: 'Add task' }).click()
  const dialog = page.getByRole('dialog', { name: 'New task' })
  await dialog.getByLabel('Title *', { exact: true }).fill('Open Talk')
  await dialog.getByLabel('Short text', { exact: true }).fill('Say hello to your team')
  // A full address of this Nextcloud becomes a path
  await dialog.getByLabel('Page *', { exact: true }).fill(BASE + '/index.php/apps/spreed/')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await dialog.waitFor({ state: 'detached', timeout: 10000 })
  await section.getByText('Say hello to your team').waitFor()
  await page.screenshot({ path: path.join(DIR, 'shots', 'p8-own-settings.png'), fullPage: true })
  const own = (await settings()).custom
  const listed = await items(user.page)
  const item = listed.items.find(i => i.title === 'Open Talk')
  // Opened from the list
  await user.page.goto(item.link)
  await user.page.waitForTimeout(3000)
  const address = user.page.url()
  const after = await items(user.page)
  const setting = (key) => { try { return occ(`user:setting ${USER} introvox ${key}`).trim() } catch (e) { return '' } }
  const opened = setting(`checklist_${own[0].id}`)
  // Deleting it forgets who opened it
  await api(page, 'POST', '/apps/introvox/admin/settings', { checklist: { custom: [] } })
  const forgotten = setting(`checklist_${own[0].id}`)
  assert(refused.status === 400 && refused.data?.error === 'page', JSON.stringify(refused))
  assert(own.length === 1 && own[0].page === '/apps/spreed/' && own[0].text === 'Say hello to your team' && /^c-[a-z0-9]{8}$/.test(own[0].id), JSON.stringify(own))
  assert(item && item.subtitle === 'Say hello to your team' && listed.items.at(-1) === item, JSON.stringify(listed.items.map(i => i.title)))
  assert(item.link.endsWith(`/apps/spreed/?introvox-check=${own[0].id}`), item.link)
  assert(!address.includes('introvox-check'), address)
  assert(after.items.length === 0 && /^All done\./.test(after.emptyContentMessage), JSON.stringify(after))
  assert(opened !== '' && forgotten === '', `opened ${opened}, after deleting ${forgotten}`)
}, page)

await check('checklist: switched off, it leaves every Dashboard', async () => {
  await api(page, 'POST', '/apps/introvox/admin/settings', { checklist: { onDashboard: false, enabled: false } })
  const list = await widgets(user.page)
  const layout = occ('config:app:get dashboard layout').trim()
  assert(!list.includes(WIDGET), 'widget still offered')
  assert(!layout.includes(WIDGET), layout)
})

await browser.close()
for (const uid of [USER]) occ(`user:delete ${uid}`)
process.exit(summary() ? 1 : 0)
