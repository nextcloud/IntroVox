// The admin intro and the telemetry question, from the "never asked" state:
// no telemetry_enabled, no telemetry_asked, and admin2 has not had the intro.
import { launch, login, api, check, summary, assert, BASE, occ } from './lib.mjs'

for (const key of ['telemetry_enabled', 'telemetry_asked']) {
  occ(`config:app:delete introvox ${key}`)
}
try { occ('user:setting --delete introvox-e2e-admin2 introvox admin_intro_done') } catch (e) {}

const browser = await launch()
const telemetryOn = async (page) => (await api(page, 'GET', '/apps/introvox/admin/statistics')).data?.telemetry?.enabled
const pane = (page, name) => page.getByRole('radio', { name, exact: true })
const step = (page) => page.locator('.shepherd-element:visible')
const stepTitle = async (page) => (await step(page).locator('.shepherd-title').textContent()).trim()
const admin1 = await login(browser, 'introvox-e2e-admin')
// The second admin has never seen any tour: the user tour could start too
const admin2 = await login(browser, 'introvox-e2e-admin2', { skipTour: false })

await check('telemetry: nothing is sent before an admin was asked', async () => {
  const on = await telemetryOn(admin1.page)
  assert(on === false, `telemetry enabled: ${on}`)
})

await check('intro: a new admin gets the admin tour, not the user tour, then the question', async () => {
  const page = admin2.page
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  await step(page).waitFor({ timeout: 30000 })
  const titles = [await stepTitle(page)]
  assert(titles[0] === 'Welcome to IntroVox', `first step: ${titles[0]}`)
  assert((await page.locator('.shepherd-element').count()) === 1, 'two tours at once')
  await step(page).getByRole('button', { name: 'Show me' }).click()
  const checks = {}
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(400)
    const title = await stepTitle(page)
    titles.push(title)
    if (title === 'One tour, every language') checks.stepsPane = await pane(page, 'Tours').isChecked()
    if (title === 'A step in four moves') checks.howTo = await step(page).locator('ol li').count()
    if (title === 'On for everyone') checks.settingsPane = await pane(page, 'Settings').isChecked()
    await step(page).getByRole('button', { name: 'Next' }).click()
  }
  await page.waitForTimeout(400)
  titles.push(await stepTitle(page))
  const link = step(page).locator('a')
  checks.manual = `${await link.getAttribute('href')} ${await link.getAttribute('target')}`
  const askedBefore = await telemetryOn(page)
  await step(page).getByRole('button', { name: 'Done' }).click()
  const question = page.getByRole('dialog', { name: 'Help improve IntroVox' })
  await question.waitFor({ timeout: 10000 })
  await page.waitForTimeout(800)
  const onceAsked = await telemetryOn(page)
  const listed = await question.locator('li').allTextContents()
  await question.getByRole('button', { name: 'Do not share' }).click()
  await page.waitForTimeout(1500)
  const declined = await telemetryOn(page)
  assert(titles.join(' > ') === 'Welcome to IntroVox > Four parts > Tours > One tour, every language > A step in four moves > See it as others do > On for everyone > That is all', titles.join(' > '))
  assert(checks.stepsPane && checks.settingsPane, `panes ${JSON.stringify(checks)}`)
  assert(checks.howTo === 4, `how-to items ${checks.howTo}`)
  assert(/docs\/admin\/guide\.md _blank$/.test(checks.manual), `manual link ${checks.manual}`)
  assert(askedBefore === false && onceAsked === true && declined === false, `telemetry before ${askedBefore}, asked ${onceAsked}, declined ${declined}`)
  assert(listed.some(item => /license key/.test(item)), `list: ${listed}`)
  return `${titles.length} steps; telemetry off → on once asked → off after Do not share`
})

await check('intro: shown once per admin, the question once per instance', async () => {
  await admin2.page.reload()
  await admin2.page.waitForSelector('.introvox-admin__panes')
  await admin2.page.waitForTimeout(4000)
  const again = await step(admin2.page).count()
  await admin1.page.goto(BASE + '/index.php/settings/admin/introvox')
  await admin1.page.waitForSelector('.introvox-admin__panes')
  await admin1.page.waitForTimeout(4000)
  const otherAdminTour = await step(admin1.page).count()
  const otherAdminQuestion = await admin1.page.getByRole('dialog', { name: 'Help improve IntroVox' }).count()
  assert(again === 0, 'the tour came back')
  assert(otherAdminTour === 0 && otherAdminQuestion === 0, `other admin: tour ${otherAdminTour}, question ${otherAdminQuestion}`)
})

await check('intro: Support shows it again, without the question', async () => {
  const page = admin2.page
  await page.locator('.introvox-admin__panes').getByText('Support', { exact: true }).click()
  await page.getByRole('button', { name: 'Show the admin tour again' }).click()
  await step(page).waitFor({ timeout: 10000 })
  const title = await stepTitle(page)
  // Shepherd listens for Escape on the step, which takes the focus once shown
  await page.waitForFunction(() => document.activeElement?.closest('.shepherd-element'), null, { timeout: 5000 })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1000)
  const open = await step(page).count()
  const question = await page.getByRole('dialog', { name: 'Help improve IntroVox' }).count()
  const back = await pane(page, 'Support').isChecked()
  assert(title === 'Welcome to IntroVox', `title ${title}`)
  assert(open === 0 && question === 0, `after Escape: tour ${open}, question ${question}`)
  assert(back, 'not back on the Support pane')
})

await check('intro: the user tour starts on the next page', async () => {
  const page = admin2.page
  await page.goto(BASE + '/index.php/apps/files/')
  await step(page).waitFor({ timeout: 30000 })
  const title = await stepTitle(page)
  assert(title !== 'Welcome to IntroVox', `got the admin tour: ${title}`)
  return title
})

await browser.close()
process.exit(summary() ? 1 : 0)
