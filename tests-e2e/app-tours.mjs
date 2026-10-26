// Tours per app.
import path from 'node:path'
import { launch, login, api, check, summary, assert, ssh, occ, addUser, BASE, NC } from './lib.mjs'

const ADMIN = 'introvox-e2e-admin'
const USER = 'introvox-e2e-user'
const OTHER = 'introvox-e2e-other'
const browser = await launch()
const admin = await login(browser, ADMIN)
const page = admin.page


const step = p => p.locator('.shepherd-element:visible')
const stepTitle = async p => (await step(p).locator('.shepherd-title').textContent()).trim()
const noTourWithin = async (p, ms) => step(p).waitFor({ timeout: ms }).then(() => false, () => true)
const tours = async () => (await api(page, 'GET', '/apps/introvox/admin/tours')).data.tours
const talkTour = async () => (await tours()).find(t => t.trigger?.app === 'spreed' && !t.builtin)
const putTour = (id, tour) => page.evaluate(async ({ id, tour }) => {
  const r = await fetch(OC.generateUrl('/apps/introvox/admin/tours/' + id), { method: 'PUT', headers: { 'Content-Type': 'application/json', requesttoken: OC.requestToken }, body: JSON.stringify({ tour }) })
  return { status: r.status, data: await r.json().catch(() => null) }
}, { id, tour })
const reshow = id => api(page, 'POST', `/apps/introvox/admin/tours/${id}/reshow`)
// A tab of a user who already went through the welcome tour
const welcomeDone = async (uid) => {
  const session = await login(browser, uid)
  await api(session.page, 'POST', '/apps/introvox/personal/settings', { wizardDisabled: true, toursDisabled: false })
  return session
}
const openToursPane = async () => {
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  await page.locator('.introvox-admin__panes').getByText('Tours', { exact: true }).click()
  await page.locator('.introvox-tours__item').first().waitFor()
}
let talkId = null

await check('setup: a short welcome tour', async () => {
  // A first login before any tour goes on, so these count as existing users
  // for "New users only", also right after the accounts were made
  for (const uid of [USER, OTHER]) {
    await (await login(browser, uid)).context.close()
  }
  const r = await api(page, 'POST', '/apps/introvox/admin/steps', { lang: 'en', steps: [
    { id: 'w-1', title: 'Welcome E2E', text: '<p>Hi</p>', attachTo: '', enabled: true, visibleToGroups: [] },
    { id: 'w-2', title: 'Welcome done', text: '<p>Bye</p>', attachTo: '', enabled: true, visibleToGroups: [] },
  ] })
  assert(r.status === 200, JSON.stringify(r))
  for (const tour of (await tours()).filter(t => t.id !== 'welcome')) {
    await api(page, 'DELETE', `/apps/introvox/admin/tours/${tour.id}`)
  }
})

await check('tours: an admin creates a Talk tour; it starts off and goes on once it has a step', async () => {
  await openToursPane()
  await page.getByRole('button', { name: 'New tour' }).click()
  const dialog = page.getByRole('dialog', { name: 'New tour' })
  await dialog.locator('.vs__search').first().click()
  await page.keyboard.type('Talk')
  await page.getByRole('option', { name: /Talk/ }).first().click()
  await dialog.getByRole('button', { name: 'Next' }).click()
  const name = await dialog.getByLabel('Name *').inputValue()
  await dialog.getByRole('button', { name: 'Create' }).click()
  // The editor opens with its first step
  const wizard = page.getByRole('dialog', { name: 'New step' })
  await wizard.waitFor({ timeout: 15000 })
  await wizard.getByLabel('Title *').fill('Welcome to Talk')
  await wizard.locator('.step-text__content').click()
  await page.keyboard.type('Here you chat and call.')
  for (let i = 0; i < 3 && await wizard.getByRole('button', { name: 'Next' }).isVisible(); i++) {
    await wizard.getByRole('button', { name: 'Next' }).click()
  }
  await wizard.getByRole('button', { name: 'Save' }).click()
  await page.waitForTimeout(1500)
  const created = await talkTour()
  talkId = created.id
  const steps = (await api(page, 'GET', `/apps/introvox/admin/steps?lang=en&tour=${talkId}`)).data.steps
  // A second step, through the API
  await api(page, 'POST', '/apps/introvox/admin/steps', { lang: 'en', tour: talkId, steps: [...steps, { id: 't-2', title: 'Talk done', text: '<p>Bye</p>', attachTo: '', enabled: true, visibleToGroups: [] }] })
  const offFirst = created.enabled === false
  await page.getByRole('button', { name: 'All tours' }).click()
  await page.locator('.introvox-tours__item', { hasText: name }).filter({ hasNot: page.locator('.introvox-tours__badge') }).locator('.checkbox-radio-switch').click()
  await page.waitForTimeout(1500)
  const on = (await talkTour()).enabled
  assert(name === 'Talk', `name ${name}`)
  assert(offFirst && on, `off first ${offFirst}, on after ${on}`)
  assert(steps.length === 1 && steps[0].title === 'Welcome to Talk' && steps[0].page === '/apps/spreed/', JSON.stringify(steps))
  return talkId
})

await check('tours: someone who did the welcome tour gets the Talk tour once Talk is ready, without touching the welcome mark', async () => {
  const { context, page: p } = await welcomeDone(OTHER)
  const before = await p.evaluate(() => localStorage.getItem('introvox_completed'))
  await p.goto(BASE + '/index.php/apps/spreed/')
  await step(p).waitFor({ timeout: 30000 })
  const title = await stepTitle(p)
  await step(p).locator('.shepherd-cancel-icon').click()
  const after = await p.evaluate(() => localStorage.getItem('introvox_completed'))
  await context.close()
  assert(title === 'Welcome to Talk', `step ${title}`)
  assert(before === after, `welcome mark ${before} → ${after}`)
})

await check('tours: it does not come back, after a reload or in another browser', async () => {
  const one = await login(browser, OTHER)
  await one.page.goto(BASE + '/index.php/apps/spreed/')
  const none1 = await noTourWithin(one.page, 10000)
  await one.page.reload()
  const none2 = await noTourWithin(one.page, 8000)
  await one.context.close()
  assert(none1 && none2, `came back: ${!none1}, after reload: ${!none2}`)
})

await check('tours: closing it and going home starts nothing else', async () => {
  const { context, page: p } = await welcomeDone(USER)
  await p.goto(BASE + '/index.php/apps/spreed/')
  await step(p).waitFor({ timeout: 30000 })
  await step(p).locator('.shepherd-cancel-icon').click()
  await p.goto(BASE + '/index.php/apps/files/')
  const none = await noTourWithin(p, 8000)
  await context.close()
  assert(none, 'a tour started at home')
})

await check('tours: a new user who lands in Talk gets the welcome tour first, the Talk tour on a later visit', async () => {
  addUser('introvox-e2e-new1')
  const first = await login(browser, 'introvox-e2e-new1', { skipTour: false })
  await first.page.goto(BASE + '/index.php/apps/spreed/')
  await step(first.page).waitFor({ timeout: 30000 })
  const welcome = await stepTitle(first.page)
  await step(first.page).getByRole('button', { name: /Skip/ }).click()
  await first.page.waitForTimeout(1500)
  await first.page.reload()
  const pausedRightAfter = await noTourWithin(first.page, 8000)
  await first.context.close()
  const later = await login(browser, 'introvox-e2e-new1')
  await later.page.goto(BASE + '/index.php/apps/spreed/')
  await step(later.page).waitFor({ timeout: 30000 })
  const talk = await stepTitle(later.page)
  await later.context.close()
  assert(welcome === 'Welcome E2E', `first ${welcome}`)
  assert(pausedRightAfter, 'the Talk tour followed straight after the welcome tour')
  assert(talk === 'Welcome to Talk', `later ${talk}`)
})

await check('tours: outside its groups nobody gets it; the API answers as for a tour that does not exist', async () => {
  const r = await putTour(talkId, { visibleToGroups: ['introvox-e2e'] })
  assert(r.status === 200, JSON.stringify(r))
  const other = await login(browser, OTHER)
  const user = await login(browser, USER)
  const seen = {
    otherSteps: await api(other.page, 'GET', `/apps/introvox/api/steps?tour=${talkId}`),
    unknownSteps: await api(other.page, 'GET', '/apps/introvox/api/steps?tour=no-such-tour'),
    otherEvent: await api(other.page, 'POST', `/apps/introvox/api/tours/${talkId}/event`, { event: 'start' }),
    unknownEvent: await api(other.page, 'POST', '/apps/introvox/api/tours/no-such-tour/event', { event: 'start' }),
    userSteps: await api(user.page, 'GET', `/apps/introvox/api/steps?tour=${talkId}`),
  }
  const welcomeEvent = await api(user.page, 'POST', '/apps/introvox/api/tours/welcome/event', { event: 'complete' })
  await other.context.close()
  await user.context.close()
  assert(seen.otherSteps.status === 404 && JSON.stringify(seen.otherSteps) === JSON.stringify(seen.unknownSteps), JSON.stringify([seen.otherSteps, seen.unknownSteps]))
  assert(seen.otherEvent.status === 404 && JSON.stringify(seen.otherEvent) === JSON.stringify(seen.unknownEvent), JSON.stringify([seen.otherEvent, seen.unknownEvent]))
  assert(seen.userSteps.status === 200 && seen.userSteps.data.steps.length === 2, JSON.stringify(seen.userSteps))
  assert(welcomeEvent.status === 404, `welcome through the app-tour route: ${welcomeEvent.status}`)
})

await check('tours: with "Start tours by themselves" off nothing starts; Start in the personal settings does', async () => {
  await reshow(talkId)
  const { context, page: p } = await welcomeDone(USER)
  await api(p, 'POST', '/apps/introvox/personal/settings', { toursDisabled: true })
  await p.goto(BASE + '/index.php/apps/spreed/')
  const none = await noTourWithin(p, 10000)
  await p.goto(BASE + '/index.php/settings/user/introvox-help')
  const row = p.locator('.introvox-tour-list__tour', { hasText: 'Talk' })
  await row.waitFor({ timeout: 20000 })
  await row.getByRole('button', { name: /^Start/ }).click()
  await p.waitForURL(/apps\/spreed/, { timeout: 30000 })
  await step(p).waitFor({ timeout: 30000 })
  const title = await stepTitle(p)
  await api(p, 'POST', '/apps/introvox/personal/settings', { toursDisabled: false })
  await context.close()
  assert(none, 'started by itself while switched off')
  assert(title === 'Welcome to Talk', `by hand: ${title}`)
})

await check('tours: "Restart tour now" starts the welcome tour, also with "Start tours by themselves" off', async () => {
  const { context, page: p } = await welcomeDone(USER)
  await api(p, 'POST', '/apps/introvox/personal/settings', { toursDisabled: true })
  await p.goto(BASE + '/index.php/settings/user/introvox-help')
  await p.getByRole('button', { name: 'Restart tour now' }).click()
  await p.waitForURL(u => !u.pathname.includes('/settings/'), { timeout: 30000 })
  const title = await step(p).waitFor({ timeout: 30000 }).then(() => stepTitle(p), () => 'none')
  if (title !== 'none') {
    await step(p).locator('.shepherd-cancel-icon').click()
  }
  await api(p, 'POST', '/apps/introvox/personal/settings', { toursDisabled: false, wizardDisabled: true })
  await context.close()
  assert(title === 'Welcome E2E', `restart: ${title}`)
})

await check('tours: two tabs at once show it at most once', async () => {
  await reshow(talkId)
  const { context } = await welcomeDone(USER)
  const [a, b] = [await context.newPage(), await context.newPage()]
  await Promise.all([a.goto(BASE + '/index.php/apps/spreed/'), b.goto(BASE + '/index.php/apps/spreed/')])
  await a.waitForTimeout(15000)
  const shown = (await a.locator('.shepherd-element:visible').count()) + (await b.locator('.shepherd-element:visible').count())
  await context.close()
  assert(shown === 1, `shown in ${shown} tabs`)
})

await check('tours: "New users only": an existing user does not get it, a new account does', async () => {
  await putTour(talkId, { audience: 'new', visibleToGroups: [] })
  await reshow(talkId)
  await new Promise(resolve => setTimeout(resolve, 1500))
  const { context, page: p } = await welcomeDone(OTHER)
  await p.goto(BASE + '/index.php/apps/spreed/')
  const none = await noTourWithin(p, 10000)
  await context.close()
  // Whether a login counts as after enabledAt is about the first login, so
  // a fresh account it is; enabledAt stays from the first switch-on
  addUser('introvox-e2e-new2')
  const fresh = await welcomeDone('introvox-e2e-new2')
  await fresh.page.goto(BASE + '/index.php/apps/spreed/')
  await step(fresh.page).waitFor({ timeout: 30000 })
  const title = await stepTitle(fresh.page)
  await fresh.context.close()
  await putTour(talkId, { audience: 'everyone' })
  assert(none, 'an existing user got a tour for new users')
  assert(title === 'Welcome to Talk', `new account: ${title}`)
})

await check('tours: switched off between loading the page and fetching the steps, nothing shows', async () => {
  await reshow(talkId)
  const { context, page: p } = await welcomeDone(USER)
  await p.route(/\/apps\/introvox\/api\/steps\?tour=/, async route => {
    await putTour(talkId, { enabled: false })
    await route.continue()
  })
  await p.goto(BASE + '/index.php/apps/spreed/')
  const none = await noTourWithin(p, 12000)
  await context.close()
  await putTour(talkId, { enabled: true })
  assert(none, 'a tour showed after it was switched off')
})

await check('tours: the picker and the preview of an app tour open in its app', async () => {
  await openToursPane()
  await page.locator('.introvox-tours__item', { hasText: 'Talk' }).filter({ hasNot: page.locator('.introvox-tours__badge') }).getByRole('button', { name: 'Edit steps' }).click()
  await page.waitForSelector('.step-item')
  await page.getByRole('button', { name: 'Preview tour' }).click()
  const previewSrc = await page.locator('iframe[name="introvox-tour-preview"]').getAttribute('src')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.locator('.step-item').first().getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit step' })
  await dialog.getByRole('button', { name: 'Element' }).click()
  await dialog.getByRole('button', { name: 'Pick element' }).click()
  const pickerSrc = await page.locator('iframe[name="introvox-element-picker"]').getAttribute('src')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await page.getByRole('dialog', { name: 'Edit step' }).getByRole('button', { name: 'Close', exact: true }).click()
  assert(/\/apps\/spreed\/$/.test(previewSrc) && /\/apps\/spreed\/$/.test(pickerSrc), `preview ${previewSrc}, picker ${pickerSrc}`)
})

await check('tours: deleting a tour keeps a backup and forgets who saw it', async () => {
  const seenBefore = occ(`user:setting ${OTHER} introvox tour_${talkId}_seen`).trim()
  const r = await api(page, 'DELETE', `/apps/introvox/admin/tours/${talkId}`)
  const left = (await tours()).map(t => t.id)
  const seenAfter = (() => { try { return occ(`user:setting ${OTHER} introvox tour_${talkId}_seen`).trim() } catch (e) { return 'gone' } })()
  const backups = ssh(`cd ${NC} && D=$(sudo -u www-data php occ config:system:get datadirectory); sudo sh -c "ls $D/appdata_*/introvox/backups/ 2>/dev/null"`)
  assert(r.status === 200 && !left.includes(talkId), JSON.stringify([r, left]))
  assert(seenBefore !== '' && seenAfter === 'gone', `seen ${seenBefore} → ${seenAfter}`)
  assert(backups.includes(`${talkId}-`), `backups: ${backups}`)
})

await check('update: tours stay off for users who switched the tour off on purpose, once', async () => {
  const users = { 'introvox-e2e-m1': 'opted', 'introvox-e2e-m2': 'finished', 'introvox-e2e-m3': 'old', 'introvox-e2e-m4': 'chose' }
  for (const uid of Object.keys(users)) {
    addUser(uid)
  }
  ssh(`cd ${NC} && o="sudo -u www-data php occ user:setting" && $o introvox-e2e-m1 introvox wizard_disabled true && $o introvox-e2e-m1 introvox wizard_started 1700000000 && $o introvox-e2e-m2 introvox wizard_disabled true && $o introvox-e2e-m2 introvox wizard_started 1700000000 && $o introvox-e2e-m2 introvox wizard_completed 1700000100 && $o introvox-e2e-m3 introvox wizard_disabled true && $o introvox-e2e-m4 introvox wizard_disabled true && $o introvox-e2e-m4 introvox wizard_started 1700000000 && $o introvox-e2e-m4 introvox tours_disabled false && sudo -u www-data php occ config:app:delete introvox tours_introduced >/dev/null`)
  const run = () => ssh(`cd ${NC} && sudo -u www-data php -r 'require "lib/base.php"; \\OCP\\Server::get(\\OCA\\IntroVox\\Migration\\IntroduceTours::class)->run(new \\OC\\Migration\\SimpleOutput(\\OCP\\Server::get(\\Psr\\Log\\LoggerInterface::class), "introvox"));' 2>&1`)
  run()
  const value = uid => { try { return occ(`user:setting ${uid} introvox tours_disabled`).trim() } catch (e) { return '-' } }
  const after = Object.fromEntries(Object.keys(users).map(uid => [users[uid], value(uid)]))
  ssh(`cd ${NC} && sudo -u www-data php occ user:setting introvox-e2e-m3 introvox wizard_started 1700000000`)
  run()
  const second = value('introvox-e2e-m3')
  // Who the update switched off can switch tours on again (a typed value
  // written by the update made that save fail)
  const m1 = await login(browser, 'introvox-e2e-m1')
  const back = await api(m1.page, 'POST', '/apps/introvox/personal/settings', { toursDisabled: false })
  await m1.context.close()
  assert(back.status === 200 && value('introvox-e2e-m1') === 'false', `switching on again: ${back.status} ${value('introvox-e2e-m1')}`)
  assert(JSON.stringify(after) === JSON.stringify({ opted: 'true', finished: '-', old: '-', chose: 'false' }), JSON.stringify(after))
  assert(second === '-', `ran again: ${second}`)
  return JSON.stringify(after)
})

await browser.close()
process.exit(summary() ? 1 : 0)
