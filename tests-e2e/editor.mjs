import { launch, login, api, check, summary, assert, BASE } from './lib.mjs'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ADMIN = 'introvox-e2e-admin'
const USER = 'introvox-e2e-user'
// Downloads and files to upload, outside the repository
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'introvox-e2e-'))

const TEST_STEPS = [
  { id: 'e2e-welcome', title: '<b>E2E</b> welcome', text: '<p>Hello <strong>bold</strong></p><style>body{display:none}</style><img src="x">', attachTo: '', position: 'right', enabled: true, visibleToGroups: [] },
  { id: 'e2e-waffle', title: 'Open the apps menu', text: '<p>Click it</p>', attachTo: '.app-menu__waffle', position: 'bottom', advance: 'click', enabled: true, visibleToGroups: [] },
  { id: 'e2e-talk-item', title: 'This is Talk', text: '<p>In the menu</p>', attachTo: '[role="menu"] a.app-item[href*="/apps/spreed/"]', openFirst: '.app-menu__waffle', position: 'right', enabled: true, visibleToGroups: [] },
  { id: 'e2e-talk', title: 'Inside Talk', text: '<p>Talk page</p>', attachTo: '', page: '/apps/spreed/', position: 'right', enabled: true, visibleToGroups: [] },
  { id: 'e2e-disabled', title: 'Disabled draft', text: '<p>x</p>', attachTo: '', enabled: false, visibleToGroups: [] },
  { id: 'e2e-group', title: 'Group only', text: '<p>for the group</p>', attachTo: '', enabled: true, visibleToGroups: ['introvox-e2e'] },
  { id: 'e2e-done', title: 'Done E2E', text: '<p>Bye</p>', attachTo: '', enabled: true, visibleToGroups: [] },
]

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
// The admin page's panes are an NcRadioGroup: a visually hidden radio per
// pane, chosen by clicking its label, as a user does.
async function openPane(page, name) {
  // Since tours per app, the Steps pane is Tours: a list, with the welcome
  // tour's steps one click further
  const label = name === 'Steps' ? 'Tours' : name
  await page.locator('.introvox-admin__panes').getByText(label, { exact: true }).click()
  await page.getByRole('radio', { name: label, exact: true }).waitFor({ state: 'attached' })
  if (!(await page.getByRole('radio', { name: label, exact: true }).isChecked())) {
    throw new Error(`pane ${label} did not open`)
  }
  if (name === 'Steps') {
    await page.locator('.introvox-tours__item', { hasText: 'Welcome tour' }).getByRole('button', { name: 'Edit steps' }).click()
  }
}

const browser = await launch()

// ---------------------------------------------------------------- setup + API
const { context: adminCtx, page } = await login(browser, ADMIN)
await adminCtx.setExtraHTTPHeaders({})

await check('setup: save the test tour through the admin API', async () => {
  const r = await api(page, 'POST', '/apps/introvox/admin/steps', { steps: TEST_STEPS, lang: 'en' })
  assert(r.status === 200 && r.data?.success, `status ${r.status} ${JSON.stringify(r.data)}`)
}, page)

await check('validation: a page leading to another site is refused', async () => {
  const bad = TEST_STEPS.map(s => (s.id === 'e2e-done' ? { ...s, page: '//example.com/login' } : s))
  const r = await api(page, 'POST', '/apps/introvox/admin/steps', { steps: bad, lang: 'en' })
  assert(r.status === 400, `expected 400, got ${r.status}`)
  return r.data?.error
}, page)

await check('validation: a wrong type is refused instead of breaking the tour', async () => {
  const bad = TEST_STEPS.map(s => (s.id === 'e2e-done' ? { ...s, visibleToGroups: 'admin' } : s))
  const r = await api(page, 'POST', '/apps/introvox/admin/steps', { steps: bad, lang: 'en' })
  assert(r.status === 400, `expected 400, got ${r.status}`)
  return r.data?.error
}, page)

await check('/api/steps as admin: no disabled step, no foreign group step, no group lists', async () => {
  const r = await api(page, 'GET', '/apps/introvox/api/steps')
  assert(r.status === 200, `status ${r.status}`)
  const ids = r.data.steps.map(s => s.id)
  assert(JSON.stringify(ids) === JSON.stringify(['e2e-welcome', 'e2e-waffle', 'e2e-talk-item', 'e2e-talk', 'e2e-done']), `ids ${ids}`)
  assert(r.data.steps.every(s => !('visibleToGroups' in s)), 'visibleToGroups leaked')
  return ids.join(', ')
}, page)

await check('CSRF: a tracking call without request token is refused', async () => {
  const r = await api(page, 'POST', '/apps/introvox/api/wizard/skip', null, { token: false })
  assert(r.status === 412, `expected 412, got ${r.status}`)
}, page)

await check('rate limit: tracking calls stop after 10 per hour', async () => {
  const statuses = []
  for (let i = 0; i < 12; i++) {
    statuses.push((await api(page, 'POST', '/apps/introvox/api/wizard/skip')).status)
  }
  assert(statuses.includes(429), `no 429 in ${statuses}`)
  return statuses.join(',')
}, page)

await check('anonymous: /api/steps requires login', async () => {
  const anon = await browser.newContext({ ignoreHTTPSErrors: true })
  const response = await anon.request.get(BASE + '/index.php/apps/introvox/api/steps')
  await anon.close()
  assert(response.status() === 401, `expected 401, got ${response.status()}`)
})

// ---------------------------------------------------------------- admin UI
const gotoSteps = async () => {
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  await openPane(page, 'Steps')
  await page.waitForSelector('.step-item', { timeout: 20000 })
}
const stepItem = (id) => page.locator('.step-item', { hasText: `ID: ${id}` })

await check('admin: the step list shows the test tour, titles as text', async () => {
  await gotoSteps()
  const count = await page.locator('.step-item').count()
  assert(count === 7, `expected 7 steps, got ${count}`)
  const title = await stepItem('e2e-welcome').locator('.step-title').textContent()
  assert(title.includes('<b>E2E</b>'), `title rendered as ${title}`)
  const html = await stepItem('e2e-welcome').locator('.preview-text').innerHTML()
  assert(!/<style|<img/i.test(html) && /<strong>/.test(html), `preview html ${html}`)
}, page)

await check('wizard: edit a step and save; it survives a reload', async () => {
  await stepItem('e2e-done').getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Title *').fill('Done E2E edited')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await page.waitForTimeout(1500)
  await page.reload()
  await openPane(page, 'Steps')
  await page.waitForSelector('.step-item')
  const title = await stepItem('e2e-done').locator('.step-title').textContent()
  assert(title.trim() === 'Done E2E edited', `title after reload: ${title}`)
}, page)

// ---------------------------------------------------------------- text editor
const storedText = async (id) => {
  const r = await api(page, 'GET', '/apps/introvox/admin/steps?lang=en')
  return r.data.steps.find(step => step.id === id)?.text
}

await check('editor: bold, a list and a link are saved as the tour wants them', async () => {
  await stepItem('e2e-done').getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog')
  const editor = dialog.locator('.step-text__content')
  await editor.waitFor()
  assert((await editor.textContent()).includes('Bye'), 'editor does not show the text')
  await editor.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('Intro ')
  await dialog.getByRole('button', { name: 'Bold' }).click()
  // The button follows the editor's state a frame later
  const pressed = await dialog.locator('button[aria-label="Bold"][aria-pressed="true"]')
    .waitFor({ timeout: 2000 }).then(() => 'true', () => 'false')
  await page.keyboard.type('bold')
  await dialog.getByRole('button', { name: 'Bold' }).click()
  await page.keyboard.press('Enter')
  await dialog.getByRole('button', { name: 'Bulleted list' }).click()
  await page.keyboard.type('one')
  await page.keyboard.press('Enter')
  await page.keyboard.type('two')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.keyboard.type('See ')
  await dialog.getByRole('button', { name: 'Link', exact: true }).click()
  await dialog.getByLabel('Link address').fill('javascript:alert(1)')
  await dialog.getByLabel('Link address').press('Enter')
  const refused = await dialog.getByText('Use a web address such as nextcloud.com').count()
  await dialog.getByLabel('Link address').fill('nextcloud.com')
  await dialog.getByLabel('Link address').press('Enter')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await page.waitForTimeout(1500)
  const text = await storedText('e2e-done')
  assert(pressed === 'true', `Bold button aria-pressed ${pressed}`)
  assert(refused === 1, 'javascript: link was not refused')
  const expected = '<p>Intro <strong>bold</strong></p><ul><li>one</li><li>two</li></ul><p>See <a target="_blank" href="https://nextcloud.com">https://nextcloud.com</a></p>'
  assert(text === expected, `stored ${text}`)
  return text
}, page)

await check('editor: HTML users never see is named, and goes once the text changes; small print stays', async () => {
  const r = await api(page, 'GET', '/apps/introvox/admin/steps?lang=en')
  const withHidden = '<p>For the group <small>fine print</small></p><style>p{}</style><img src="x">'
  const steps = r.data.steps.map(step => (step.id === 'e2e-group' ? { ...step, text: withHidden } : step))
  await api(page, 'POST', '/apps/introvox/admin/steps', { steps, lang: 'en' })
  await page.reload()
  await openPane(page, 'Steps')
  await page.waitForSelector('.step-item')
  await stepItem('e2e-group').getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit step' })
  const editor = dialog.locator('.step-text__content')
  await editor.waitFor()
  const small = await editor.locator('small').textContent()
  const note = await dialog.locator('.step-text__hidden').textContent()
  const textareas = await dialog.locator('textarea.step-text__html').count()
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await page.waitForTimeout(800)
  const untouched = await storedText('e2e-group')
  await stepItem('e2e-group').getByRole('button', { name: 'Edit' }).click()
  await editor.click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type('!')
  const noteAfterEdit = await dialog.locator('.step-text__hidden').count()
  await dialog.getByRole('button', { name: 'Save' }).click()
  await page.waitForTimeout(1500)
  const saved = await storedText('e2e-group')
  assert(textareas === 0, 'opened as HTML')
  assert(small === 'fine print', `small print in the editor: ${small}`)
  assert(/<style>/.test(note) && /<img>/.test(note), `note: ${note}`)
  assert(untouched === withHidden, `changed by opening: ${untouched}`)
  assert(noteAfterEdit === 0, 'note still there after the change')
  assert(saved === '<p>For the group <small>fine print!</small></p>', `saved ${saved}`)
  return note.trim()
}, page)

await check('editor: HTML and back; Escape in the link field keeps the dialog', async () => {
  await stepItem('e2e-done').getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('.step-text__content').waitFor()
  await dialog.getByRole('button', { name: 'Edit as HTML' }).click()
  const area = dialog.locator('textarea.step-text__html')
  const shown = await area.inputValue()
  await area.fill('<p>Back <em>again</em></p>')
  await dialog.getByRole('button', { name: 'Edit as HTML' }).click()
  const em = await dialog.locator('.step-text__content em').textContent()
  await dialog.getByRole('button', { name: 'Link', exact: true }).click()
  await dialog.getByLabel('Link address').press('Escape')
  const dialogOpen = await dialog.isVisible()
  const fieldGone = (await dialog.getByLabel('Link address').count()) === 0
  await dialog.getByRole('button', { name: 'Save' }).click()
  await page.waitForTimeout(1500)
  const text = await storedText('e2e-done')
  assert(shown.startsWith('<p>Intro <strong>bold</strong></p><ul>'), `HTML view showed ${shown}`)
  assert(em === 'again', `editor after HTML: ${em}`)
  assert(dialogOpen && fieldGone, `after Escape: dialog ${dialogOpen}, link field gone ${fieldGone}`)
  assert(text === '<p>Back <em>again</em></p>', `stored ${text}`)
}, page)

await check('emoji: the picker puts one in the text and in front of the title', async () => {
  await stepItem('e2e-done').getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit step' })
  const editor = dialog.locator('.step-text__content')
  await editor.click()
  await page.keyboard.press('ControlOrMeta+End')
  await dialog.locator('.step-text__toolbar').getByRole('button', { name: 'Insert emoji' }).click()
  // The picker moves the focus to its search field once it has opened
  await page.waitForFunction(() => document.activeElement?.placeholder === 'Search emoji', null, { timeout: 5000 })
  await page.keyboard.type('rocket')
  await page.locator('.emoji-mart-emoji[aria-label^="🚀"]').first().click()
  const title = dialog.getByLabel('Title *')
  await title.click()
  await title.evaluate(input => input.setSelectionRange(0, 0))
  await dialog.locator('.step-wizard__title').getByRole('button', { name: 'Insert emoji' }).click()
  // The picker moves the focus to its search field once it has opened
  await page.waitForFunction(() => document.activeElement?.placeholder === 'Search emoji', null, { timeout: 5000 })
  await page.keyboard.type('wave')
  await page.locator('.emoji-mart-emoji[aria-label^="👋"]').first().click()
  await dialog.getByRole('button', { name: 'Save' }).click()
  await page.waitForTimeout(1500)
  const r = await api(page, 'GET', '/apps/introvox/admin/steps?lang=en')
  const step = r.data.steps.find(s => s.id === 'e2e-done')
  // At the cursor, in whatever formatting is there (italic after an earlier check)
  assert(/🚀(<\/em>)?<\/p>$/.test(step.text), `text ${step.text}`)
  assert(step.title.startsWith('👋 Done E2E'), `title ${step.title}`)
  return `${step.title} | ${step.text}`
}, page)

await check('wizard: add a step by walking the pages, then delete it', async () => {
  await page.getByRole('button', { name: 'Add step' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Title *').fill('E2E added')
  for (let i = 0; i < 3 && await dialog.getByRole('button', { name: 'Next' }).count(); i++) {
    await dialog.getByRole('button', { name: 'Next' }).click()
  }
  await dialog.getByRole('button', { name: 'Save' }).click()
  await page.waitForTimeout(1500)
  await page.reload()
  await openPane(page, 'Steps')
  await page.waitForSelector('.step-item')
  const added = page.locator('.step-item', { hasText: 'E2E added' })
  assert(await added.count() === 1, 'added step not found after reload')
  await added.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Confirm' }).click()
  await page.waitForTimeout(1500)
  await page.reload()
  await openPane(page, 'Steps')
  await page.waitForSelector('.step-item')
  assert(await page.locator('.step-item', { hasText: 'E2E added' }).count() === 0, 'deleted step is back after reload')
}, page)

await check('wizard: closing a new step without saving removes it', async () => {
  const before = await page.locator('.step-item').count()
  await page.getByRole('button', { name: 'Add step' }).click()
  await page.getByRole('dialog').waitFor()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(800)
  const after = await page.locator('.step-item').count()
  assert(after === before, `steps before ${before}, after ${after}`)
}, page)

await check('list: switching a step off survives a reload', async () => {
  const toggle = stepItem('e2e-welcome').locator('input[type="checkbox"]')
  await stepItem('e2e-welcome').locator('.checkbox-radio-switch').click()
  await page.waitForTimeout(1500)
  await page.reload()
  await openPane(page, 'Steps')
  await page.waitForSelector('.step-item')
  const off = !(await stepItem('e2e-welcome').locator('input[type="checkbox"]').isChecked())
  // switch it back on for the tour tests
  await stepItem('e2e-welcome').locator('.checkbox-radio-switch').click()
  await page.waitForTimeout(1500)
  assert(off, 'step still enabled after reload')
  void toggle
}, page)

await check('export: the download holds the test tour', async () => {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.getByRole('button', { name: 'Export' }).click(),
  ])
  const file = path.join(TMP, 'export.json')
  await download.saveAs(file)
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert(data.steps?.some(s => s.id === 'e2e-welcome'), 'exported steps lack e2e-welcome')
  return `${data.steps.length} steps`
}, page)

await check('import: a file with an off-site page is refused, tour unchanged', async () => {
  const bad = path.join(TMP, 'bad-import.json')
  fs.writeFileSync(bad, JSON.stringify({ language: 'en', steps: [{ id: 'x', title: 'x', page: '//example.com' }] }))
  await page.setInputFiles('input[type="file"]', bad)
  await page.waitForTimeout(2000)
  const toast = await page.locator('.toastify').allTextContents()
  const r = await api(page, 'GET', '/apps/introvox/admin/steps?lang=en')
  assert(r.data.steps.length === 7, `steps changed to ${r.data.steps.length}`)
  assert(toast.some(t => /page must be a path/i.test(t)), `no error toast: ${toast}`)
}, page)

await check('load failure: no empty tour to add to, just an error and Try again', async () => {
  // Make the next GET of the step list fail, as on a dropped connection
  const stepList = url => url.pathname.endsWith('/apps/introvox/admin/steps')
  await page.route(stepList, route =>
    route.request().method() === 'GET' ? route.abort() : route.continue())
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  await openPane(page, 'Steps')
  await page.getByText('The steps could not be loaded.').waitFor({ timeout: 15000 })
  const addDisabled = await page.getByRole('button', { name: 'Add step' }).isDisabled()
  const emptyTour = await page.getByText('No steps defined yet.').count()
  await page.unroute(stepList)
  await page.getByRole('button', { name: 'Try again' }).click()
  await page.waitForSelector('.step-item', { timeout: 15000 })
  const count = await page.locator('.step-item').count()
  assert(addDisabled && emptyTour === 0, `add disabled ${addDisabled}, empty-tour message ${emptyTour}`)
  assert(count === 7, `after Try again: ${count} steps`)
}, page)

await check('languages: quick changes, then another language, keep each language its own steps', async () => {
  const NL = [
    { id: 'nl-a', title: 'NL een', text: '<p>een</p>', attachTo: '', enabled: true, visibleToGroups: [] },
    { id: 'nl-b', title: 'NL twee', text: '<p>twee</p>', attachTo: '', enabled: true, visibleToGroups: [] },
  ]
  await api(page, 'POST', '/apps/introvox/admin/steps', { steps: TEST_STEPS, lang: 'en' })
  await api(page, 'POST', '/apps/introvox/admin/steps', { steps: NL, lang: 'nl' })
  await gotoSteps()
  // Slow saves and slower loads: the second save still waits in the queue
  // when the language changes, and the new language's list is not there yet
  const stepList = url => url.pathname.endsWith('/apps/introvox/admin/steps')
  await page.route(stepList, async route => {
    await new Promise(resolve => setTimeout(resolve, route.request().method() === 'GET' ? 2500 : 1000))
    await route.continue()
  })
  await stepItem('e2e-welcome').locator('.checkbox-radio-switch').click()
  await stepItem('e2e-done').locator('.checkbox-radio-switch').click()
  await page.locator('#introvox-language-select').click()
  await page.keyboard.type('Ne')
  // Typing in the search box must not switch the language by itself
  await page.waitForTimeout(800)
  const languageWhileTyping = await page.locator('.step-item .step-id').first().textContent()
  await page.getByRole('option').filter({ hasText: /Nederlands|Dutch/ }).first().click()
  await page.waitForTimeout(6000)
  await page.unroute(stepList)
  const en = (await api(page, 'GET', '/apps/introvox/admin/steps?lang=en')).data.steps
  const nl = (await api(page, 'GET', '/apps/introvox/admin/steps?lang=nl')).data.steps
  const shown = await page.locator('.step-item .step-id').allTextContents()
  // Back to the test tour, and no Dutch override left behind
  await api(page, 'POST', '/apps/introvox/admin/steps', { steps: TEST_STEPS, lang: 'en' })
  await api(page, 'POST', '/apps/introvox/admin/reset', { lang: 'nl' })
  await gotoSteps()
  const off = id => en.find(step => step.id === id)?.enabled === false
  assert(nl.map(step => step.id).join(',') === 'nl-a,nl-b', `nl now holds ${nl.map(step => step.id)}`)
  assert(off('e2e-welcome') && off('e2e-done'), `en: welcome ${en.find(s => s.id === 'e2e-welcome')?.enabled}, done ${en.find(s => s.id === 'e2e-done')?.enabled}`)
  assert(shown.join(',').includes('nl-a'), `screen shows ${shown}`)
  assert(/e2e-/.test(languageWhileTyping), `while typing the list showed ${languageWhileTyping}`)
  return `en ${en.length} steps with both off, nl ${nl.map(step => step.id)}`
}, page)

// ---------------------------------------------------------------- picker
await check('picker: pick the waffle; header element gets no page', async () => {
  await stepItem('e2e-waffle').getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Element' }).click()
  await dialog.getByRole('button', { name: 'Pick element' }).click()
  const frame = page.frameLocator('iframe[name="introvox-element-picker"]')
  await frame.locator('.app-menu__waffle').waitFor({ timeout: 20000 })
  await frame.locator('.app-menu__waffle').click()
  const panel = page.locator('.introvox-picker__panel')
  await panel.waitFor()
  const candidates = await panel.locator('code').allTextContents()
  assert(candidates[0] === '.app-menu__waffle', `candidates ${candidates}`)
  const pageNote = await page.locator('.introvox-picker__page').textContent()
  assert(/header/.test(pageNote), `page note: ${pageNote}`)
  await page.getByRole('button', { name: 'Use this element' }).click()
  await page.getByRole('dialog').getByText('.app-menu__waffle').first().waitFor()
  return candidates.join(' | ')
}, page)

await check('picker: Shift-click an item in the open apps menu fills Open first', async () => {
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Pick element' }).click()
  const frame = page.frameLocator('iframe[name="introvox-element-picker"]')
  await frame.locator('.app-menu__waffle').waitFor({ timeout: 20000 })
  await page.getByText('Browse', { exact: true }).click()
  await frame.locator('.app-menu__waffle').click()
  const talkItem = frame.locator('[role="menu"] a.app-item[href*="/apps/spreed/"]')
  await talkItem.waitFor({ timeout: 5000 })
  await talkItem.click({ modifiers: ['Shift'] })
  const panel = page.locator('.introvox-picker__panel')
  await panel.waitFor()
  const info = await panel.textContent()
  assert(/opened first/i.test(info), `no open-first note: ${info.slice(0, 200)}`)
  const candidates = await panel.locator('.introvox-picker__selector').allTextContents()
  await page.getByRole('button', { name: 'Use this element' }).click()
  const summary = await page.getByRole('dialog').locator('.step-wizard__target').textContent()
  assert(/Opens .+ first/.test(summary), `wizard summary: ${summary}`)
  return candidates.join(' | ')
}, page)

await check('picker: an element inside Talk gets page /apps/spreed/', async () => {
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Pick element' }).click()
  const frame = page.frameLocator('iframe[name="introvox-element-picker"]')
  await frame.locator('.app-menu__waffle').waitFor({ timeout: 20000 })
  await page.getByText('Browse', { exact: true }).click()
  await frame.locator('.app-menu__waffle').click()
  await frame.locator('[role="menu"] a.app-item[href*="/apps/spreed/"]').click()
  await page.waitForTimeout(5000)
  await page.getByText('Select', { exact: true }).click()
  const button = frame.getByRole('button', { name: /New conversation/i }).first()
  await button.waitFor({ timeout: 20000 })
  await button.click()
  const note = await page.locator('.introvox-picker__page').textContent()
  const candidates = await page.locator('.introvox-picker__panel code').allTextContents()
  assert(/\/apps\/spreed\//.test(note), `page note: ${note}`)
  assert(candidates.every(c => !/call\/[a-z0-9]{6,}/i.test(c)), `token in selector: ${candidates}`)
  await page.getByRole('button', { name: 'Cancel' }).click()
  await page.keyboard.press('Escape') // close the wizard without saving
  return candidates.join(' | ')
}, page)

// ---------------------------------------------------------------- preview
await check('preview: the tour runs in the frame, HTML cleaned, title as text', async () => {
  await gotoSteps()
  await page.getByRole('button', { name: 'Preview tour' }).click()
  const frame = page.frameLocator('iframe[name="introvox-tour-preview"]')
  const step = frame.locator('.shepherd-element:visible')
  await step.waitFor({ timeout: 20000 })
  const title = await step.locator('.shepherd-title').textContent()
  const html = await step.locator('.shepherd-text').innerHTML()
  assert(title.includes('<b>E2E</b>'), `title ${title}`)
  assert(!/<style|<img/i.test(html) && /<strong>bold<\/strong>/.test(html), `text ${html}`)
}, page)

await check('preview: click-to-continue, menu stays open, cross-app, group view', async () => {
  const frame = page.frameLocator('iframe[name="introvox-tour-preview"]')
  // show the group step too
  await page.locator('.introvox-preview__audience input').click()
  await page.locator('.vs__dropdown-menu li', { hasText: /^\s*introvox-e2e\s*$/ }).click()
  const step = () => frame.locator('.shepherd-element:visible')
  await step().locator('.shepherd-title', { hasText: 'E2E' }).waitFor({ timeout: 20000 })
  await step().getByRole('button', { name: 'Start tour' }).click()
  await step().locator('.shepherd-title', { hasText: 'Open the apps menu' }).waitFor()
  const nextHidden = await step().locator('.introvox-advance-button').isHidden()
  const hint = await step().locator('.introvox-click-hint').isVisible()
  assert(nextHidden && hint, `next hidden ${nextHidden}, hint ${hint}`)
  await frame.locator('.app-menu__waffle').click()
  await step().locator('.shepherd-title', { hasText: 'This is Talk' }).waitFor({ timeout: 5000 })
  await step().hover()
  await page.waitForTimeout(800)
  const menuOpen = await frame.locator('[role="menu"] a.app-item[href*="/apps/spreed/"]').isVisible()
  assert(menuOpen, 'apps menu closed after moving to the tooltip')
  await step().getByRole('button', { name: 'Next' }).click()
  await step().locator('.shepherd-title', { hasText: 'Inside Talk' }).waitFor({ timeout: 30000 })
  await step().getByRole('button', { name: 'Next' }).click()
  await step().locator('.shepherd-title', { hasText: 'Group only' }).waitFor({ timeout: 10000 })
  await page.getByRole('button', { name: 'Close', exact: true }).click()
}, page)

// ---------------------------------------------------------------- real tour
await check('tour (admin): starts quickly, click-to-continue, Talk, back home on Done', async () => {
  const { context, page: p } = await login(browser, ADMIN, { skipTour: false })
  await context.addInitScript(() => localStorage.removeItem('introvox_completed'))
  // make sure the admin's own tour is not marked disabled from earlier runs
  await api(p, 'POST', '/apps/introvox/personal/settings', { wizardDisabled: false })
  const started = Date.now()
  await p.goto(BASE + '/index.php/apps/dashboard/')
  const step = () => p.locator('.shepherd-element:visible')
  await step().waitFor({ timeout: 20000 })
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  await step().getByRole('button', { name: 'Start tour' }).click()
  await step().locator('.shepherd-title', { hasText: 'Open the apps menu' }).waitFor()
  await p.locator('.app-menu__waffle').click()
  await step().locator('.shepherd-title', { hasText: 'This is Talk' }).waitFor({ timeout: 5000 })
  await step().getByRole('button', { name: 'Next' }).click()
  await p.waitForURL(/apps\/spreed|\/call\//, { timeout: 30000 })
  await step().locator('.shepherd-title', { hasText: 'Inside Talk' }).waitFor({ timeout: 30000 })
  await step().getByRole('button', { name: 'Next' }).click()
  const last = await step().locator('.shepherd-title').textContent()
  assert(/Done E2E/.test(last), `admin saw "${last}" after Talk (group step must be skipped)`)
  await step().getByRole('button', { name: 'Done' }).click()
  await p.waitForURL(url => !/spreed|\/call\//.test(url.pathname), { timeout: 20000 })
  const home = new URL(p.url()).pathname
  await context.close()
  return `first step after ${seconds}s, back home at ${home}`
})

await check('tour (user in group): /api/steps has the group step, no group lists', async () => {
  const { context, page: p } = await login(browser, USER)
  const r = await api(p, 'GET', '/apps/introvox/api/steps')
  await context.close()
  const ids = r.data.steps.map(s => s.id)
  assert(ids.includes('e2e-group') && !ids.includes('e2e-disabled'), `ids ${ids}`)
  assert(r.data.steps.every(s => !('visibleToGroups' in s)), 'visibleToGroups leaked')
  return ids.join(', ')
})

// ---------------------------------------------------------------- other pages
await check('personal settings: "Start tours by themselves" saves straight away', async () => {
  const { context, page: p } = await login(browser, USER)
  await p.goto(BASE + '/index.php/settings/user/introvox-help')
  const toggle = p.getByText('Start tours by themselves')
  await toggle.waitFor({ timeout: 20000 })
  await p.waitForTimeout(1500)
  await toggle.click()
  await p.waitForTimeout(1500)
  const after = await api(p, 'GET', '/apps/introvox/personal/settings')
  await toggle.click()
  await p.waitForTimeout(1500)
  const back = await api(p, 'GET', '/apps/introvox/personal/settings')
  await context.close()
  assert(after.data.toursDisabled === true && back.data.toursDisabled === false, `after ${JSON.stringify(after.data)}, back ${JSON.stringify(back.data)}`)
})

await check('admin: the Statistics tab loads', async () => {
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  await openPane(page, 'Statistics')
  await page.getByText('Tour usage', { exact: true }).waitFor({ timeout: 15000 })
  await page.locator('.introvox-tour-stats .stat-card').first().waitFor({ timeout: 15000 })
}, page)

await browser.close()
process.exit(summary() ? 1 : 0)
