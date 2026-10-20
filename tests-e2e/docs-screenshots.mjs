// The screenshots in docs/screenshots/, taken again on the server in
// config.local.json: node docs-screenshots.mjs. Needs the built-in tours on
// and the checklist on the Dashboard. Adds a sample tour ("Talk for teams")
// and a fresh user, shows every checklist task for a moment, and puts all of
// it back. Run tours-backup.mjs around it on a server with tours of its own,
// so they do not show up in the list.
import path from 'node:path'
import { launch, api, addUser, occ, BASE, CONFIG, PASSWORD, DIR } from './lib.mjs'

const OUT = path.join(DIR, '..', 'docs', 'screenshots')
const ADMIN = 'introvox-e2e-admin'
// Someone new: Talk's own sample conversations only, nothing done yet
const USER = 'introvox-e2e-shots'
const browser = await launch()

// Twice the pixels, like the screenshots in the App Store. The admin pages
// are taller than a screen: a tall window keeps them whole.
const session = async (user, { skipTour = true, height = 900 } = {}) => {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height },
    deviceScaleFactor: 2,
    // Talk warns about HeadlessChrome over its buttons
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  })
  if (skipTour) {
    await context.addInitScript(() => localStorage.setItem('introvox_completed', 'true'))
  }
  if (CONFIG.dismiss?.length) {
    await context.addInitScript((selectors) => {
      new MutationObserver(() => selectors.forEach(s => document.querySelectorAll(s).forEach(b => b.click())))
        .observe(document, { childList: true, subtree: true })
    }, CONFIG.dismiss)
  }
  const page = await context.newPage()
  await page.goto(BASE + '/index.php/login')
  await page.fill('input[name="user"]', user)
  await page.fill('input[name="password"]', PASSWORD)
  await Promise.all([page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 60000, waitUntil: 'domcontentloaded' }), page.click('button[type="submit"]')])
  return { context, page }
}
const shot = async (locator, name) => {
  await locator.screenshot({ path: path.join(OUT, name), animations: 'disabled' })
  console.log('wrote', name)
}

const admin = await session(ADMIN, { height: 2400 })
const page = admin.page
await api(page, 'POST', '/apps/introvox/admin/intro/done')
addUser(USER)

// Every checklist task for the screenshots; the admin's choice after
const checklistBefore = (await api(page, 'GET', '/apps/introvox/admin/settings')).data.checklist
const chosenBefore = checklistBefore.tasks.filter(task => task.chosen).map(task => task.id)
await api(page, 'POST', '/apps/introvox/admin/settings', { checklist: { tasks: checklistBefore.tasks.map(task => task.id) } })

// A tour of the admin's own, for the list
const made = await api(page, 'POST', '/apps/introvox/admin/tours', { tour: { name: 'Talk for teams', trigger: { type: 'app', app: 'spreed' }, mainLanguage: 'en', visibleToGroups: [], audience: 'everyone' } })
const sampleId = made.data.tour.id
await api(page, 'POST', '/apps/introvox/admin/steps', {
  lang: 'en',
  tour: sampleId,
  steps: [
    { id: 'tt-1', title: '💬 Talk for teams', text: '<p>Every team has a conversation of its own.</p>', attachTo: '', enabled: true, visibleToGroups: [], page: '/apps/spreed/' },
    { id: 'tt-2', title: '🔍 Find your team', text: '<p>Search for your team\'s name here.</p>', attachTo: '.conversations-search', position: 'right', enabled: true, visibleToGroups: [], page: '/apps/spreed/' },
  ],
})
await api(page, 'PUT', `/apps/introvox/admin/tours/${sampleId}`, { tour: { enabled: true } })

try {
  const pane = async (name) => {
    await page.goto(BASE + '/index.php/settings/admin/introvox')
    await page.locator('.introvox-admin__panes').getByText(name, { exact: true }).click()
    await page.waitForTimeout(1500)
  }

  await pane('Tours')
  await page.locator('.introvox-tours__item').first().waitFor()
  await shot(page.locator('.introvox-admin'), 'admin-settings.png')

  await page.getByRole('button', { name: 'New tour' }).click()
  const newTour = page.getByRole('dialog')
  await newTour.waitFor()
  await page.waitForTimeout(500)
  await shot(newTour.locator('.modal-container'), 'new-tour.png')
  await page.keyboard.press('Escape')

  await pane('Settings')
  await shot(page.locator('.introvox-admin'), 'settings.png')

  await pane('Statistics')
  await page.locator('.introvox-admin .v-select, .introvox-admin [role="combobox"]').first().click()
  await page.locator('.vs__dropdown-menu li', { hasText: /^\s*Talk\s*$/ }).first().click()
  await page.waitForTimeout(2000)
  await shot(page.locator('.introvox-admin'), 'statistics.png')

  // The step editor, on a step of the built-in Talk tour that waits for a name
  await pane('Tours')
  await page.locator('.introvox-tours__item', { hasText: 'Talk' }).filter({ has: page.locator('.introvox-tours__badge') }).getByRole('button', { name: 'Edit steps' }).click()
  await page.waitForSelector('.step-item')
  await page.locator('.step-item', { hasText: 'ID: talk-name' }).getByRole('button', { name: 'Edit' }).click()
  const editor = page.getByRole('dialog')
  await editor.locator('.step-wizard__nav').waitFor()
  await page.waitForTimeout(800)
  for (const [label, name] of [['Content', 'content.png'], ['Behavior', 'behavior.png'], ['Visible to', 'visible-to.png']]) {
    await editor.locator('.step-wizard__nav-item', { hasText: label }).click()
    await page.waitForTimeout(600)
    await shot(editor.locator('.modal-container'), name)
  }
  await editor.getByRole('button', { name: 'Close', exact: true }).click()

  // What people see
  const user = await session(USER)
  await api(user.page, 'POST', '/apps/introvox/personal/settings', { wizardDisabled: true })
  // One task done, as it ticks itself off: a file uploaded
  await user.page.evaluate(async (uid) => fetch(`/remote.php/dav/files/${uid}/Notes.txt`, { method: 'PUT', headers: { requesttoken: OC.requestToken }, body: 'Notes' }), USER)
  await user.page.goto(BASE + '/index.php/settings/user/introvox-help')
  await user.page.locator('#introvox-personal-settings').waitFor()
  await user.page.waitForTimeout(2000)
  await shot(user.page.locator('#introvox-personal-settings'), 'personal-settings.png')

  await user.page.goto(BASE + '/index.php/apps/dashboard/')
  const checklist = user.page.locator('.panel', { hasText: 'Getting started' })
  if (await checklist.waitFor({ timeout: 20000 }).then(() => true, () => false)) {
    await user.page.waitForTimeout(1500)
    await shot(checklist, 'dashboard-checklist.png')
  } else {
    console.log('no checklist on the Dashboard: switch it on under Settings to take dashboard-checklist.png')
  }

  // A step that asks to click, with its outline and arrow: started by link,
  // so nobody's "seen" is reset
  await user.page.goto(BASE + '/index.php/apps/introvox/tour/builtin-talk')
  const step = user.page.locator('.shepherd-element:visible')
  await step.waitFor({ timeout: 30000 })
  await step.getByRole('button', { name: /Start tour|Next/ }).first().click()
  await user.page.locator('.introvox-pointer').waitFor({ timeout: 15000 })
  await user.page.waitForTimeout(1500)
  await user.page.screenshot({ path: path.join(OUT, 'tour-step.png'), animations: 'disabled' })
  console.log('wrote tour-step.png')
  await user.context.close()
} finally {
  await api(page, 'DELETE', `/apps/introvox/admin/tours/${sampleId}`)
  await api(page, 'POST', '/apps/introvox/admin/settings', { checklist: { tasks: chosenBefore } })
  await browser.close()
  occ(`user:delete ${USER}`)
}
