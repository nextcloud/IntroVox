// Share links, Tours in the user menu, when a tour may start by
// itself, and tours that start anywhere.
import path from 'node:path'
import { launch, login, api, check, summary, assert, php, BASE } from './lib.mjs'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const ADMIN = 'introvox-e2e-admin'
const USER = 'introvox-e2e-user'
const OTHER = 'introvox-e2e-other'
const browser = await launch()
const admin = await login(browser, ADMIN)
const page = admin.page
await admin.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE })

// Typed, as Nextcloud stores it (login/firstLogin is an int)
const setFirstLogin = (uid, seconds) => php(`\\OCP\\Server::get(\\OCP\\Config\\IUserConfig::class)->setValueInt("${uid}", "login", "firstLogin", ${seconds});`)

const step = p => p.locator('.shepherd-element:visible')
const stepTitle = async p => (await step(p).locator('.shepherd-title').textContent()).trim()
const shows = async (p, ms = 20000) => step(p).waitFor({ timeout: ms }).then(() => stepTitle(p), () => null)
const welcomeDone = async (uid) => {
  const session = await login(browser, uid)
  await api(session.page, 'POST', '/apps/introvox/personal/settings', { wizardDisabled: true, toursDisabled: false })
  return session
}
const tours = async () => (await api(page, 'GET', '/apps/introvox/admin/tours')).data.tours
const putTour = (id, tour) => api(page, 'PUT', `/apps/introvox/admin/tours/${id}`, { tour })
const reshow = id => api(page, 'POST', `/apps/introvox/admin/tours/${id}/reshow`)
const day = (offset) => {
  const date = new Date(Date.now() + offset * 86400000)
  return date.toISOString().slice(0, 10)
}
const makeTour = async (tour, title) => {
  const created = await api(page, 'POST', '/apps/introvox/admin/tours', { tour })
  const id = created.data?.tour?.id
  const saved = await api(page, 'POST', '/apps/introvox/admin/steps', { lang: 'en', tour: id, steps: [{ id: 's-1', title, text: `<p>${title}</p>`, attachTo: '', enabled: true, visibleToGroups: [], ...(tour.trigger.type === 'app' ? { page: `/apps/${tour.trigger.app}/` } : {}) }] })
  const on = await putTour(id, { enabled: true })
  if (created.status !== 200 || saved.status !== 200 || on.status !== 200) {
    throw new Error(JSON.stringify([created, saved.status, on]))
  }
  return id
}
let talkId = null
let tipsId = null

await check('setup: a Talk tour and a tour that starts anywhere, switched off for now', async () => {
  for (const tour of (await tours()).filter(t => t.id !== 'welcome' && !t.builtin)) {
    const removed = await api(page, 'DELETE', `/apps/introvox/admin/tours/${tour.id}`)
    assert(removed.status === 200, `could not delete ${tour.id}: ${JSON.stringify(removed)}`)
  }
  for (const uid of [USER, OTHER]) {
    await (await login(browser, uid)).context.close()
  }
  talkId = await makeTour({ name: 'Talk', trigger: { type: 'app', app: 'spreed' } }, 'Talk one')
  tipsId = await makeTour({ name: 'Tips', trigger: { type: 'any' } }, 'Tip one')
  await putTour(tipsId, { enabled: false })
  const all = await tours()
  const tips = all.find(t => t.id === tipsId)
  assert(all.filter(t => !t.builtin || t.id === 'welcome').map(t => t.id).join() === `welcome,${talkId},${tipsId}`, JSON.stringify(all.map(t => t.id)))
  assert(JSON.stringify(tips.trigger) === '{"type":"any"}' && tips.startAfterDays === 0 && tips.startFrom === '' && tips.startUntil === '', JSON.stringify(tips))
})

await check('share link: Copy link gives the tour\'s page; the link starts it there, by hand', async () => {
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  await page.locator('.introvox-admin__panes').getByText('Tours', { exact: true }).click()
  const row = page.locator('.introvox-tours__item', { hasText: 'Talk' }).filter({ hasNot: page.locator('.introvox-tours__badge') })
  await row.getByRole('button', { name: /More for Talk/ }).click()
  await page.getByRole('menuitem', { name: 'Copy link' }).click()
  await page.locator('.toastify').filter({ hasText: 'Link to Talk copied' }).first().waitFor({ timeout: 10000 })
  const link = await page.evaluate(() => navigator.clipboard.readText())
  // A route of IntroVox's own, as Nextcloud keeps no query through a login
  assert(link === `${BASE}/index.php/apps/introvox/tour/${talkId}`, link)

  // Seen already: the link starts it all the same, and the address forgets it
  const s = await welcomeDone(USER)
  await s.page.goto(BASE + '/index.php/apps/spreed/')
  const first = await shows(s.page)
  if (first) await step(s.page).locator('.shepherd-cancel-icon').click()
  await s.page.goto(link)
  const byLink = await shows(s.page)
  const address = s.page.url()
  // Closed, then reloaded: the link is gone from the address, so nothing
  // starts. (A reload of a tour still open carries it on: app-states.)
  if (byLink) await step(s.page).locator('.shepherd-cancel-icon').click()
  await s.page.reload()
  const afterReload = await shows(s.page, 8000)
  await s.context.close()
  const stats = (await api(page, 'GET', `/apps/introvox/admin/tours/${talkId}/statistics`)).data.statistics
  assert(first === 'Talk one' && byLink === 'Talk one', `${first} / ${byLink}`)
  assert(!address.includes('introvox-tour') && afterReload === null, `${address}, after reload ${afterReload}`)
  // The run by link did not count; the automatic one did
  assert(stats.counted === 1, JSON.stringify(stats))
})

await check('share link: Copy link on a tour that is off says the link starts nothing yet', async () => {
  await putTour(talkId, { enabled: false })
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  await page.locator('.introvox-admin__panes').getByText('Tours', { exact: true }).click()
  const row = page.locator('.introvox-tours__item', { hasText: 'Talk' }).filter({ hasNot: page.locator('.introvox-tours__badge') })
  await row.getByRole('button', { name: /More for Talk/ }).click()
  await page.getByRole('menuitem', { name: 'Copy link' }).click()
  const toast = page.locator('.toastify').filter({ hasText: 'The tour is switched off' }).first()
  await toast.waitFor({ timeout: 10000 })
  const text = (await toast.textContent()).trim()
  await putTour(talkId, { enabled: true })
  return text
})

await check('share link: for someone outside the tour\'s groups it does nothing; an unknown tour neither', async () => {
  await putTour(talkId, { visibleToGroups: ['introvox-e2e'] })
  const o = await welcomeDone(OTHER)
  await o.page.goto(`${BASE}/index.php/apps/spreed/?introvox-tour=${talkId}`)
  const outside = await shows(o.page, 10000)
  await o.page.goto(`${BASE}/index.php/apps/files/?introvox-tour=no-such-tour`)
  const unknown = await shows(o.page, 8000)
  await o.page.goto(`${BASE}/index.php/apps/files/?introvox-tour=../evil`)
  const bad = await shows(o.page, 5000)
  await o.context.close()
  await putTour(talkId, { visibleToGroups: [] })
  assert(outside === null && unknown === null && bad === null, JSON.stringify([outside, unknown, bad]))
})

await check('user menu: Tours above Help, to the tours in the personal settings; the admin can hide it', async () => {
  const menuEntry = async () => {
    const s = await login(browser, USER)
    await s.page.goto(BASE + '/index.php/apps/files/')
    await s.page.locator('#user-menu button, .header-menu.account-menu .header-menu__trigger').first().click()
    const entry = s.page.locator('#introvox_tours, [id="introvox_tours"] a, a[href*="settings/user/introvox-help"]').first()
    const there = await entry.waitFor({ timeout: 8000 }).then(() => true, () => false)
    const order = there ? await s.page.evaluate(() => [...document.querySelectorAll('#header-menu-user-menu li, .account-menu li')].map(li => li.textContent.trim()).filter(Boolean)) : []
    let landed = null
    if (there) {
      await entry.click()
      await s.page.waitForURL(/introvox-help/, { timeout: 15000 })
      landed = await s.page.locator('.introvox-tour-list__tour', { hasText: 'Talk' }).waitFor({ timeout: 15000 }).then(() => true, () => false)
    }
    await s.context.close()
    return { there, order, landed }
  }
  const shown = await menuEntry()
  await api(page, 'POST', '/apps/introvox/admin/settings', { userMenu: false })
  const settings = (await api(page, 'GET', '/apps/introvox/admin/settings')).data
  const hidden = await menuEntry()
  await api(page, 'POST', '/apps/introvox/admin/settings', { userMenu: true })
  const helpAt = shown.order.findIndex(text => /Help/.test(text))
  const toursAt = shown.order.findIndex(text => text === 'Tours')
  assert(shown.there && shown.landed && toursAt >= 0 && toursAt === helpAt - 1, JSON.stringify(shown))
  assert(settings.userMenu === false && settings.enabled === true && !hidden.there, JSON.stringify([settings, hidden.there]))
})

await check('when: "days after the first login" holds the tour back until then', async () => {
  await reshow(talkId)
  await putTour(talkId, { startAfterDays: 7 })
  setFirstLogin(USER, Math.floor(Date.now() / 1000) - 6 * 86400)
  const early = await welcomeDone(USER)
  await early.page.goto(BASE + '/index.php/apps/spreed/')
  const tooEarly = await shows(early.page, 10000)
  await early.context.close()
  setFirstLogin(USER, Math.floor(Date.now() / 1000) - 8 * 86400)
  const later = await welcomeDone(USER)
  await later.page.goto(BASE + '/index.php/apps/spreed/')
  const onTime = await shows(later.page)
  await later.context.close()
  await putTour(talkId, { startAfterDays: 0 })
  assert(tooEarly === null && onTime === 'Talk one', `${tooEarly} / ${onTime}`)
})

await check('when: only between two dates; starting by hand still works outside them', async () => {
  const run = async () => {
    await reshow(talkId)
    const s = await welcomeDone(USER)
    await s.page.goto(BASE + '/index.php/apps/spreed/')
    const title = await shows(s.page, 10000)
    await s.context.close()
    return title
  }
  await putTour(talkId, { startFrom: day(1), startUntil: '' })
  const beforeIt = await run()
  await putTour(talkId, { startFrom: '', startUntil: day(-1) })
  const afterIt = await run()
  await putTour(talkId, { startFrom: day(-1), startUntil: day(1) })
  const during = await run()
  // Outside the dates, by hand
  await putTour(talkId, { startFrom: day(5), startUntil: '' })
  const s = await welcomeDone(USER)
  await s.page.goto(BASE + '/index.php/settings/user/introvox-help')
  const row = s.page.locator('.introvox-tour-list__tour', { hasText: 'Talk' })
  await row.waitFor({ timeout: 20000 })
  await row.getByRole('button', { name: /^Start/ }).click()
  await s.page.waitForURL(/apps\/spreed/, { timeout: 30000 })
  const byHand = await shows(s.page)
  await s.context.close()
  await putTour(talkId, { startFrom: '', startUntil: '' })
  assert(beforeIt === null && afterIt === null && during === 'Talk one', JSON.stringify([beforeIt, afterIt, during]))
  assert(byHand === 'Talk one', `by hand: ${byHand}`)
})

await check('when: dates that are no days, or the wrong way round, are refused', async () => {
  const results = []
  for (const tour of [{ startFrom: '2026-02-30' }, { startUntil: 'tomorrow' }, { startFrom: day(5), startUntil: day(1) }, { startAfterDays: -1 }, { startAfterDays: 400 }]) {
    results.push((await putTour(talkId, tour)).status)
  }
  assert(results.every(status => status === 400), JSON.stringify(results))
})

await check('anywhere: a tip on the next page someone opens, once; and from the personal settings', async () => {
  await putTour(tipsId, { enabled: true })
  const s = await welcomeDone(OTHER)
  await s.page.goto(BASE + '/index.php/apps/files/')
  const first = await shows(s.page)
  if (first) await step(s.page).locator('.shepherd-cancel-icon').click()
  await s.page.goto(BASE + '/index.php/settings/user')
  const again = await shows(s.page, 8000)
  await s.page.goto(BASE + '/index.php/settings/user/introvox-help')
  const row = s.page.locator('.introvox-tour-list__tour', { hasText: 'Tips' })
  await row.waitFor({ timeout: 20000 })
  await row.getByRole('button', { name: /^Start/ }).click()
  await s.page.waitForURL(/apps\/files/, { timeout: 30000 })
  const byHand = await shows(s.page)
  await s.context.close()
  assert(first === 'Tip one' && again === null && byHand === 'Tip one', JSON.stringify([first, again, byHand]))
})

await check('anywhere: never first, and not on the admin page', async () => {
  await reshow(tipsId)
  // An admin on IntroVox's own page: the admin page is theirs
  await api(page, 'POST', '/apps/introvox/personal/settings', { wizardDisabled: true, toursDisabled: false })
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  const onAdminPage = await shows(page, 8000)
  assert(onAdminPage === null, `on the admin page: ${onAdminPage}`)
})

await check('dialog: a tour that starts anywhere, from day 3, until a date; Tour settings keep it', async () => {
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  await page.locator('.introvox-admin__panes').getByText('Tours', { exact: true }).click()
  await page.getByRole('button', { name: 'New tour' }).click()
  const dialog = page.getByRole('dialog', { name: 'New tour' })
  await dialog.getByText('Anywhere', { exact: true }).click()
  await dialog.getByRole('button', { name: 'Next' }).click()
  await dialog.getByLabel('Name *').fill('Week tip')
  await dialog.getByLabel('Days after someone\'s first login').fill('3')
  await dialog.getByLabel('Until').fill(day(30))
  await dialog.getByRole('button', { name: 'Create' }).click()
  await page.getByRole('dialog', { name: 'New step' }).waitFor({ timeout: 15000 })
  await page.getByRole('dialog', { name: 'New step' }).getByRole('button', { name: 'Close', exact: true }).click()
  const made = (await tours()).find(t => t.name === 'Week tip')
  await page.getByRole('button', { name: 'Tour settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Tour settings' })
  await settings.getByRole('button', { name: 'Next' }).click()
  const days = await settings.getByLabel('Days after someone\'s first login').inputValue()
  const until = await settings.getByLabel('Until').inputValue()
  await page.screenshot({ path: path.join(DIR, 'shots', 'p5-tour-settings.png') })
  await settings.getByRole('button', { name: 'Close', exact: true }).click().catch(() => {})
  if (made) await api(page, 'DELETE', `/apps/introvox/admin/tours/${made.id}`)
  assert(made && JSON.stringify(made.trigger) === '{"type":"any"}' && made.startAfterDays === 3 && made.startUntil === day(30) && made.startFrom === '', JSON.stringify(made))
  assert(days === '3' && until === day(30), `${days} / ${until}`)
})

await check('export and import keep where and when', async () => {
  await putTour(tipsId, { startAfterDays: 5, startFrom: day(1), startUntil: day(9) })
  const bytes = await page.evaluate(async (id) => {
    const r = await fetch(OC.generateUrl(`/apps/introvox/admin/tours/${id}/export`), { headers: { requesttoken: OC.requestToken } })
    const form = new FormData()
    form.append('file', await r.blob(), 'tips.zip')
    const imported = await fetch(OC.generateUrl('/apps/introvox/admin/tours/import'), { method: 'POST', headers: { requesttoken: OC.requestToken }, body: form })
    return imported.json()
  }, tipsId)
  const copy = bytes.tour
  if (copy?.id) await api(page, 'DELETE', `/apps/introvox/admin/tours/${copy.id}`)
  assert(copy && JSON.stringify(copy.trigger) === '{"type":"any"}' && copy.startAfterDays === 5 && copy.startFrom === day(1) && copy.startUntil === day(9) && copy.enabled === false, JSON.stringify(copy))
})

// Its tours go: Tips is on, for every page
for (const id of [talkId, tipsId].filter(Boolean)) await api(page, 'DELETE', `/apps/introvox/admin/tours/${id}`)
await browser.close()
process.exit(summary() ? 1 : 0)
