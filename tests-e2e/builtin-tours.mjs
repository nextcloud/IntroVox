// The built-in tours for Files, Talk, Deck and Calendar.
import path from 'node:path'
import { launch, login, api, check, summary, assert, occ, BASE } from './lib.mjs'
import { playTour } from './builtin-walk.mjs'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const ADMIN = 'introvox-e2e-admin'
const USER = 'introvox-e2e-user'
const OTHER = 'introvox-e2e-other'
const browser = await launch()
const admin = await login(browser, ADMIN)
const page = admin.page

const step = p => p.locator('.shepherd-element:visible')
const tours = async () => (await api(page, 'GET', '/apps/introvox/admin/tours')).data.tours
const putTour = (id, tour) => api(page, 'PUT', `/apps/introvox/admin/tours/${id}`, { tour })
const reshow = id => api(page, 'POST', `/apps/introvox/admin/tours/${id}/reshow`)
// Logged in to a page without a built-in tour: Files, the default app,
// would start its tour already, and count it as seen
const welcomeDone = async (uid) => {
  const session = await login(browser, uid, { landing: '/index.php/settings/user' })
  await api(session.page, 'POST', '/apps/introvox/personal/settings', { wizardDisabled: true, toursDisabled: false })
  return session
}

const stepsOf = async (id, lang = 'en') => (await api(page, 'GET', `/apps/introvox/admin/steps?lang=${lang}&tour=${id}`)).data.steps

/**
 * Run a tour as the user, doing what its steps ask (builtin-walk.mjs)
 */
const walk = async (uid, app, steps) => {
  const s = await welcomeDone(uid)
  try {
    await s.page.goto(`${BASE}/index.php/apps/${app}/`)
    return await playTour(s.page, steps)
  } finally {
    await s.page.screenshot({ path: path.join(DIR, 'shots', `p6-${app}.png`) }).catch(() => {})
    await s.context.close()
  }
}

const BUILTIN = {
  'builtin-files': 'files',
  'builtin-talk': 'spreed',
  'builtin-deck': 'deck',
  'builtin-calendar': 'calendar',
}

await check('built-in: the four tours are listed once their app is there, switched off, and stay', async () => {
  for (const tour of (await tours()).filter(t => t.id !== 'welcome' && !t.builtin)) {
    await api(page, 'DELETE', `/apps/introvox/admin/tours/${tour.id}`)
  }
  for (const id of Object.keys(BUILTIN)) {
    await putTour(id, { enabled: false, visibleToGroups: [], audience: 'everyone', startAfterDays: 0, startFrom: '', startUntil: '' })
  }
  const all = await tours()
  const builtin = all.filter(t => t.builtin && t.id !== 'welcome')
  const removed = await api(page, 'DELETE', '/apps/introvox/admin/tours/builtin-files')
  const renamed = await putTour('builtin-files', { name: 'Mine', trigger: { type: 'app', app: 'deck' }, mainLanguage: 'nl' })
  const after = (await tours()).find(t => t.id === 'builtin-files')
  assert(JSON.stringify(builtin.map(t => t.id).sort()) === JSON.stringify(Object.keys(BUILTIN).sort()), JSON.stringify(builtin.map(t => t.id)))
  assert(builtin.every(t => t.enabled === false && t.stepCount >= 3 && t.trigger.app === BUILTIN[t.id]), JSON.stringify(builtin.map(t => [t.id, t.enabled, t.stepCount])))
  assert(removed.status === 404 && renamed.status === 200 && after.name === 'Files' && after.trigger.app === 'files' && after.mainLanguage === 'en', JSON.stringify([removed.status, renamed.status, after]))

  // In the list: the label, and no Delete
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  await page.locator('.introvox-admin__panes').getByText('Tours', { exact: true }).click()
  const row = page.locator('.introvox-tours__item', { hasText: 'Files' }).filter({ has: page.locator('.introvox-tours__badge') })
  await row.waitFor({ timeout: 15000 })
  await row.getByRole('button', { name: /More for Files/ }).click()
  const deleteItems = await page.getByRole('menuitem', { name: 'Delete' }).count()
  await page.keyboard.press('Escape')
  await page.screenshot({ path: path.join(DIR, 'shots', 'p6-list.png'), fullPage: true })
  assert(deleteItems === 0, 'Delete offered for a built-in tour')
})

for (const [id, app] of Object.entries(BUILTIN)) {
  await check(`built-in: the ${app} tour, step by step, points at what it talks about`, async () => {
    await putTour(id, { enabled: true })
    // Also when an earlier run showed it to this user already
    await reshow(id)
    const played = await walk(USER, app, await stepsOf(id))
    await putTour(id, { enabled: false })
    assert(played.ok, played.lines.join(' | '))
    return `${played.lines.length} steps, each on its element`
  })
}

await check('built-in: an admin\'s own text replaces the default; Reset brings it back', async () => {
  const defaults = (await api(page, 'GET', '/apps/introvox/admin/steps?lang=en&tour=builtin-files')).data.steps
  const own = defaults.map((s, i) => (i === 0 ? { ...s, title: 'Our Files', text: '<p>Ours</p>' } : s))
  await api(page, 'POST', '/apps/introvox/admin/steps', { lang: 'en', tour: 'builtin-files', steps: own })
  await putTour('builtin-files', { enabled: true })
  await reshow('builtin-files')
  // The first step is enough to see whose text it is
  const ownSeen = await walk(OTHER, 'files', own.slice(0, 1))
  await api(page, 'POST', '/apps/introvox/admin/reset', { lang: 'en', tour: 'builtin-files' })
  await reshow('builtin-files')
  const backSeen = await walk(OTHER, 'files', defaults.slice(0, 1))
  await putTour('builtin-files', { enabled: false })
  const listed = (await tours()).find(t => t.id === 'builtin-files')
  assert(ownSeen.ok && backSeen.ok, JSON.stringify([ownSeen.lines, backSeen.lines]))
  assert(JSON.stringify(listed.languages) === '[]', `languages after reset: ${JSON.stringify(listed.languages)}`)
})

await check('built-in: Tour settings change who gets it and when, not its name or app', async () => {
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  await page.locator('.introvox-admin__panes').getByText('Tours', { exact: true }).click()
  await page.locator('.introvox-tours__item', { hasText: 'Calendar' }).getByRole('button', { name: 'Edit steps' }).click()
  await page.getByRole('button', { name: 'Tour settings' }).click()
  const dialog = page.getByRole('dialog', { name: 'Tour settings' })
  await dialog.waitFor()
  const nameDisabled = await dialog.getByLabel('Name *').isDisabled()
  const back = await dialog.getByRole('button', { name: 'Back' }).count()
  await dialog.getByLabel('Days after someone\'s first login').fill('2')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await dialog.waitFor({ state: 'detached', timeout: 10000 })
  const calendar = (await tours()).find(t => t.id === 'builtin-calendar')
  await putTour('builtin-calendar', { startAfterDays: 0 })
  assert(nameDisabled && back === 0, `name disabled ${nameDisabled}, back ${back}`)
  assert(calendar.startAfterDays === 2 && calendar.name === 'Calendar' && calendar.trigger.app === 'calendar', JSON.stringify(calendar))
})

await check('built-in: in another language without its own translation, the English steps', async () => {
  occ(`user:setting ${OTHER} core lang fi`)
  await putTour('builtin-talk', { enabled: true })
  await reshow('builtin-talk')
  const english = await stepsOf('builtin-talk')
  const played = await walk(OTHER, 'spreed', english)
  await putTour('builtin-talk', { enabled: false })
  occ(`user:setting ${OTHER} core lang en`)
  assert(played.ok, played.lines.join(' | '))
})

await check('built-in: statistics follow its steps; an export becomes a tour of the importer\'s own', async () => {
  const stats = (await api(page, 'GET', '/apps/introvox/admin/tours/builtin-talk/statistics')).data.statistics
  const imported = await page.evaluate(async () => {
    const r = await fetch(OC.generateUrl('/apps/introvox/admin/tours/builtin-deck/export'), { headers: { requesttoken: OC.requestToken } })
    const form = new FormData()
    form.append('file', await r.blob(), 'deck.zip')
    return (await fetch(OC.generateUrl('/apps/introvox/admin/tours/import'), { method: 'POST', headers: { requesttoken: OC.requestToken }, body: form })).json()
  })
  const copy = imported.tour
  if (copy?.id) await api(page, 'DELETE', `/apps/introvox/admin/tours/${copy.id}`)
  const talkSteps = (await stepsOf('builtin-talk')).length
  const deckSteps = (await stepsOf('builtin-deck')).length
  // The languages the admin wrote steps in, or the default English steps
  const deck = (await tours()).find(t => t.id === 'builtin-deck')
  const languages = deck.languages.length ? deck.languages : ['en']
  assert(stats.steps.length === talkSteps && stats.counted >= 1, JSON.stringify(stats))
  assert(copy && !copy.builtin && copy.enabled === false && copy.trigger.app === 'deck' && copy.stepCount === deckSteps && JSON.stringify(copy.languages) === JSON.stringify(languages), JSON.stringify(copy))
})

await browser.close()
process.exit(summary() ? 1 : 0)
