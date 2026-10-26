// Steps that follow the user into an app. A step whose element only
// appears after the user did something waits aside, the page usable, and
// moves to the element once it is there; the picker says so when picking.
import path from 'node:path'
import { launch, login, api, check, summary, assert, BASE } from './lib.mjs'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const ADMIN = 'introvox-e2e-admin'
const USER = 'introvox-e2e-user'
const browser = await launch()
const admin = await login(browser, ADMIN)
const page = admin.page

const NEW_CONVERSATION = '.talk-dashboard__actions > :nth-child(2)'
const NAME = 'input[placeholder="Enter a name for this conversation"]'
const CREATE = '.new-group-conversation__footer > .button-vue--tertiary'
const PARTICIPANTS = 'input[aria-label="Search or add participants"]'
const ROW_SHARE = '[data-cy-files-list-row-action="sharing-status"]'
const NEW_LINK = 'button[aria-label="Create a new share link"]'

const tours = async () => (await api(page, 'GET', '/apps/introvox/admin/tours')).data.tours
const step = (p) => p.locator('.shepherd-element:visible')
const stepState = (p) => step(p).evaluate(el => {
  const box = el.getBoundingClientRect()
  return {
    title: el.querySelector('.shepherd-title')?.textContent.trim(),
    centered: el.classList.contains('shepherd-centered'),
    waiting: document.body.classList.contains('introvox-step-waiting'),
    // Aside: in a bottom corner (the left one while a dialog is open), no
    // taller than its content
    aside: (Math.abs(window.innerWidth - box.right - 24) < 2 || Math.abs(box.left - 24) < 2) && Math.abs(window.innerHeight - box.bottom - 24) < 2 && box.height < 300,
  }
})
const waitTitle = async (p, title, timeout = 20000) => {
  const until = Date.now() + timeout
  while (Date.now() < until) {
    if (await step(p).count() && (await stepState(p)).title === title) return
    await p.waitForTimeout(250)
  }
  throw new Error(`no step "${title}"`)
}
const makeTour = async (name, app, steps) => {
  const created = await api(page, 'POST', '/apps/introvox/admin/tours', { tour: { name, trigger: { type: 'app', app }, mainLanguage: 'en', visibleToGroups: [], audience: 'everyone' } })
  const id = created.data.tour.id
  const page_ = `/apps/${app}/`
  await api(page, 'POST', '/apps/introvox/admin/steps', { lang: 'en', tour: id, steps: steps.map(s => ({ position: 'bottom', enabled: true, visibleToGroups: [], page: page_, ...s })) })
  await api(page, 'PUT', `/apps/introvox/admin/tours/${id}`, { tour: { enabled: true } })
  return id
}
// A fresh run of an app tour for the user, in a fresh browser. Logged in to
// a page without the tour: Files, the default app, would start it already.
const userSession = async (tourId) => {
  await api(page, 'POST', `/apps/introvox/admin/tours/${tourId}/reshow`)
  const session = await login(browser, USER, { landing: '/index.php/settings/user' })
  await api(session.page, 'POST', '/apps/introvox/personal/settings', { wizardDisabled: true, toursDisabled: false })
  return session
}

// The built-in Talk and Files tours would come first; they are put back after
const builtinBefore = Object.fromEntries((await tours()).filter(t => ['builtin-talk', 'builtin-files'].includes(t.id)).map(t => [t.id, t.enabled]))
for (const id of Object.keys(builtinBefore)) await api(page, 'PUT', `/apps/introvox/admin/tours/${id}`, { tour: { enabled: false } })
for (const tour of (await tours()).filter(t => !t.builtin)) await api(page, 'DELETE', `/apps/introvox/admin/tours/${tour.id}`)

let talkTour
await check('follow (Talk): "add people" waits while the conversation is not there, the page usable, then moves to it', async () => {
  talkTour = await makeTour('Talk flow', 'spreed', [
    { id: 'tf-1', title: 'Start a conversation', text: '<p>Click New conversation.</p>', attachTo: NEW_CONVERSATION, advance: 'click' },
    { id: 'tf-2', title: 'Give it a name', text: '<p>Type a name.</p>', attachTo: NAME },
    { id: 'tf-3', title: 'Create it', text: '<p>Click Create conversation.</p>', attachTo: CREATE, position: 'top' },
    { id: 'tf-4', title: 'Add people', text: '<p>Search for someone here.</p>', attachTo: PARTICIPANTS, position: 'left' },
  ])
  const { context, page: p } = await userSession(talkTour)
  await p.goto(BASE + '/index.php/apps/spreed/')
  await waitTitle(p, 'Start a conversation', 30000)
  await p.locator(NEW_CONVERSATION).click()
  await waitTitle(p, 'Give it a name')
  await p.locator(NAME).fill('Tour test')
  await step(p).getByRole('button', { name: 'Next' }).click()
  await waitTitle(p, 'Create it')
  // Next before creating: the next step's element is not there yet
  await step(p).getByRole('button', { name: 'Next' }).click()
  await waitTitle(p, 'Add people')
  await p.waitForTimeout(7000)
  const waiting = await stepState(p)
  await p.screenshot({ path: path.join(DIR, 'shots', 'p9-talk-waiting.png') })
  // Longer than any wait before a step shows; the page takes the click
  await p.locator(CREATE).click({ timeout: 5000 })
  await p.waitForFunction(() => {
    const el = [...document.querySelectorAll('.shepherd-element')].find(e => e.offsetParent !== null)
    return el && !el.classList.contains('shepherd-centered')
  }, null, { timeout: 15000 })
  const moved = await stepState(p)
  const at = await step(p).evaluate(el => document.querySelector('.shepherd-target')?.getAttribute('aria-label'))
  await p.screenshot({ path: path.join(DIR, 'shots', 'p9-talk-moved.png') })
  await context.close()
  assert(waiting.title === 'Add people' && waiting.centered && waiting.waiting && waiting.aside, JSON.stringify(waiting))
  assert(moved.title === 'Add people' && !moved.centered && !moved.waiting && at === 'Search or add participants', JSON.stringify({ moved, at }))
})

await check('follow (Files): "share link" waits until the user opens a file\'s sharing, then moves to it', async () => {
  const filesTour = await makeTour('Files share', 'files', [
    { id: 'fs-1', title: 'Share a file', text: '<p>Open the sharing of any file.</p>', attachTo: ROW_SHARE, position: 'left' },
    { id: 'fs-2', title: 'A link for anyone', text: '<p>Create a link here.</p>', attachTo: NEW_LINK, position: 'left' },
    { id: 'fs-3', title: 'Done', text: '<p>That is it.</p>' },
  ])
  const { context, page: p } = await userSession(filesTour)
  await p.goto(BASE + '/index.php/apps/files/')
  await waitTitle(p, 'Share a file', 30000)
  await step(p).getByRole('button', { name: /Start tour/ }).click()
  await waitTitle(p, 'A link for anyone')
  await p.waitForTimeout(6000)
  const waiting = await stepState(p)
  await p.locator(ROW_SHARE).first().click({ timeout: 5000 })
  await p.waitForFunction(() => {
    const el = [...document.querySelectorAll('.shepherd-element')].find(e => e.offsetParent !== null)
    return el && !el.classList.contains('shepherd-centered')
  }, null, { timeout: 15000 })
  const moved = await stepState(p)
  await p.screenshot({ path: path.join(DIR, 'shots', 'p9-files-moved.png') })
  // The rest of the tour goes on as before
  await step(p).getByRole('button', { name: 'Next' }).click()
  await waitTitle(p, 'Done')
  await context.close()
  await api(page, 'DELETE', `/apps/introvox/admin/tours/${filesTour}`)
  assert(waiting.waiting && waiting.centered && waiting.aside, JSON.stringify(waiting))
  assert(!moved.centered && !moved.waiting, JSON.stringify(moved))
})

await check('follow: an element that never comes keeps the step waiting, and Next still goes on', async () => {
  const id = await makeTour('Never', 'files', [
    { id: 'nv-1', title: 'First', text: '<p>One</p>' },
    { id: 'nv-2', title: 'Not here', text: '<p>Nothing to point at</p>', attachTo: '#introvox-never-there' },
    { id: 'nv-3', title: 'Last', text: '<p>Three</p>' },
  ])
  const { context, page: p } = await userSession(id)
  await p.goto(BASE + '/index.php/apps/files/')
  await waitTitle(p, 'First', 30000)
  // Within a page the step waits 0.4 s after Next, not the 5 s of a page load
  const nextAt = Date.now()
  await step(p).getByRole('button', { name: /Start tour/ }).click()
  await waitTitle(p, 'Not here')
  const shownIn = Date.now() - nextAt
  await p.waitForTimeout(2000)
  const waiting = await stepState(p)
  await step(p).getByRole('button', { name: 'Next' }).click()
  await waitTitle(p, 'Last')
  const last = await stepState(p)
  // Back to a page-wide step: the page is covered again, as before
  const overlayBlocks = await p.evaluate(() => !document.body.classList.contains('introvox-step-waiting'))
  await context.close()
  await api(page, 'DELETE', `/apps/introvox/admin/tours/${id}`)
  assert(waiting.waiting && waiting.aside, JSON.stringify(waiting))
  assert(last.centered && !last.waiting && !last.aside && overlayBlocks, JSON.stringify({ last, overlayBlocks }))
  assert(shownIn < 2000, `the waiting step showed after ${shownIn} ms`)
  return `waiting step shown ${shownIn} ms after Next`
})

await check('click step: the → key does not pass it without the click', async () => {
  const id = await makeTour('Keys', 'files', [
    { id: 'ky-1', title: 'First', text: '<p>One</p>' },
    { id: 'ky-2', title: 'Click New', text: '<p>Click it</p>', attachTo: '[data-cy-upload-picker]', advance: 'click' },
    { id: 'ky-3', title: 'Last', text: '<p>Three</p>' },
  ])
  const { context, page: p } = await userSession(id)
  await p.goto(BASE + '/index.php/apps/files/')
  await waitTitle(p, 'First', 30000)
  await step(p).getByRole('button', { name: /Start tour/ }).click()
  await waitTitle(p, 'Click New')
  await step(p).focus()
  await p.keyboard.press('ArrowRight')
  await p.waitForTimeout(1500)
  const afterKey = (await stepState(p)).title
  await p.locator('[data-cy-upload-picker]').first().click()
  await waitTitle(p, 'Last')
  await context.close()
  await api(page, 'DELETE', `/apps/introvox/admin/tours/${id}`)
  assert(afterKey === 'Click New', `→ went on to ${afterKey}`)
})

await check('follow: with a dialog open, a waiting step stands on the left, clear of the dialog\'s buttons', async () => {
  const id = await makeTour('Dialog', 'files', [
    { id: 'dl-1', title: 'First', text: '<p>One</p>' },
    { id: 'dl-2', title: 'Not yet', text: '<p>Pick a folder first</p>', attachTo: '#introvox-never-there' },
    { id: 'dl-3', title: 'Last', text: '<p>Three</p>' },
  ])
  const { context, page: p } = await userSession(id)
  const side = () => step(p).evaluate(el => {
    const box = el.getBoundingClientRect()
    return Math.abs(box.left - 24) < 2 ? 'left' : Math.abs(window.innerWidth - box.right - 24) < 2 ? 'right' : `at ${Math.round(box.left)}`
  })
  await p.goto(BASE + '/index.php/apps/files/')
  await waitTitle(p, 'First', 30000)
  await step(p).getByRole('button', { name: /Start tour/ }).click()
  await waitTitle(p, 'Not yet')
  await p.waitForTimeout(1000)
  const before = await side()
  await p.evaluate(() => OC.dialogs.filepicker('Pick a folder', () => {}, false, 'httpd/unix-directory', true))
  const button = p.locator('.modal-mask .dialog__actions button').last()
  await button.waitFor()
  await p.waitForTimeout(1000)
  const during = await side()
  // A click on the dialog's button reaches the button, not the step
  const box = await button.boundingBox()
  const reachable = await p.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.dialog__actions'), { x: box.x + box.width / 2, y: box.y + box.height / 2 })
  await p.locator('.modal-mask .modal-container__close').click()
  await p.locator('.modal-mask').waitFor({ state: 'hidden' })
  await p.waitForTimeout(1000)
  const after = await side()
  await context.close()
  await api(page, 'DELETE', `/apps/introvox/admin/tours/${id}`)
  assert(before === 'right' && during === 'left' && reachable && after === 'right', JSON.stringify({ before, during, reachable, after }))
  return `${before} → ${during} while the dialog is open → ${after}`
})

await check('follow: on a 1280 × 720 screen a waiting step fits beside an open dialog', async () => {
  const id = await makeTour('Narrow', 'files', [
    { id: 'nw-1', title: 'First', text: '<p>One</p>' },
    { id: 'nw-2', title: 'Not yet', text: '<p>Fill in the form first</p>', attachTo: '#introvox-never-there' },
  ])
  const { context, page: p } = await userSession(id)
  await p.setViewportSize({ width: 1280, height: 720 })
  await p.goto(BASE + '/index.php/apps/files/')
  await waitTitle(p, 'First', 30000)
  await step(p).getByRole('button', { name: /Start tour/ }).click()
  await waitTitle(p, 'Not yet')
  // A dialog as wide as Contacts' invitation form, in the middle
  await p.evaluate(() => {
    const mask = document.createElement('div')
    mask.className = 'modal-mask introvox-e2e-dialog'
    mask.innerHTML = '<div class="modal-container" style="position: fixed; top: 120px; left: calc(50% - 300px); width: 600px; height: 480px"></div>'
    document.body.appendChild(mask)
  })
  await p.waitForTimeout(1000)
  const boxes = await step(p).evaluate(el => {
    const box = el.getBoundingClientRect()
    return { stepLeft: Math.round(box.left), stepRight: Math.round(box.right), dialogLeft: Math.round(document.querySelector('.introvox-e2e-dialog .modal-container').getBoundingClientRect().left) }
  })
  await context.close()
  await api(page, 'DELETE', `/apps/introvox/admin/tours/${id}`)
  assert(Math.abs(boxes.stepLeft - 24) < 2 && boxes.stepRight <= boxes.dialogLeft - 16, JSON.stringify(boxes))
  return `step ${boxes.stepLeft}–${boxes.stepRight} px, dialog from ${boxes.dialogLeft} px`
})

await check('typing: a step does not take the focus from a field outside it, also when the window resizes', async () => {
  const id = await makeTour('Typing', 'files', [
    { id: 'tp-1', title: 'First', text: '<p>One</p>' },
    { id: 'tp-2', title: 'Type somewhere', text: '<p>Type in a field</p>', attachTo: '[data-cy-upload-picker]' },
  ])
  const { context, page: p } = await userSession(id)
  await p.goto(BASE + '/index.php/apps/files/')
  await waitTitle(p, 'First', 30000)
  await step(p).getByRole('button', { name: /Start tour/ }).click()
  await waitTitle(p, 'Type somewhere')
  await p.evaluate(() => {
    const input = document.createElement('input')
    input.id = 'introvox-e2e-field'
    input.style.cssText = 'position: fixed; top: 8px; left: 50%; z-index: 100000'
    document.body.appendChild(input)
  })
  await p.focus('#introvox-e2e-field')
  await p.keyboard.type('abc')
  // A resize moves the step, and Shepherd focuses it 300 ms later
  await p.setViewportSize({ width: 1300, height: 850 })
  await p.waitForTimeout(800)
  await p.keyboard.type('def')
  const value = await p.inputValue('#introvox-e2e-field')
  const focused = await p.evaluate(() => document.activeElement?.id)
  // With no field in use the step still takes the focus, for keyboard users
  await p.evaluate(() => document.activeElement.blur())
  await p.setViewportSize({ width: 1440, height: 900 })
  await p.waitForTimeout(800)
  const stepFocused = await step(p).evaluate(el => el.contains(document.activeElement))
  await context.close()
  await api(page, 'DELETE', `/apps/introvox/admin/tours/${id}`)
  assert(value === 'abcdef' && focused === 'introvox-e2e-field', JSON.stringify({ value, focused }))
  assert(stepFocused, 'the step did not take the focus with no field in use')
})

await check('reload: the tour stays at its step on that page, and does not follow the user elsewhere', async () => {
  const id = await makeTour('Reload', 'files', [
    { id: 'rl-1', title: 'First', text: '<p>One</p>' },
    { id: 'rl-2', title: 'Second', text: '<p>Two</p>', attachTo: '[data-cy-upload-picker]' },
    { id: 'rl-3', title: 'Last', text: '<p>Three</p>' },
  ])
  const { context, page: p } = await userSession(id)
  await p.goto(BASE + '/index.php/apps/files/')
  await waitTitle(p, 'First', 30000)
  await step(p).getByRole('button', { name: /Start tour/ }).click()
  await waitTitle(p, 'Second')
  await p.reload({ waitUntil: 'domcontentloaded' })
  await waitTitle(p, 'Second', 30000)
  // Somewhere else the step does not belong: no tour there
  await p.goto(BASE + '/index.php/apps/dashboard/', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(5000)
  const elsewhere = await step(p).count()
  await context.close()
  await api(page, 'DELETE', `/apps/introvox/admin/tours/${id}`)
  assert(elsewhere === 0, 'a step showed on the dashboard')
})

await check('picker: an element reached by using the page says the step waits for it; one there from the start does not', async () => {
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  await page.locator('.introvox-admin__panes').getByText('Tours', { exact: true }).click()
  await page.locator('.introvox-tours__item', { hasText: 'Talk flow' }).getByRole('button', { name: 'Edit steps' }).click()
  await page.waitForSelector('.step-item')
  await page.getByRole('button', { name: 'Add step' }).click()
  const wizard = page.getByRole('dialog', { name: 'New step' })
  await wizard.getByRole('button', { name: 'Element' }).click()
  await wizard.getByRole('button', { name: 'Pick element' }).click()
  const frame = page.frameLocator('iframe[name="introvox-element-picker"]')
  await frame.locator(NEW_CONVERSATION).waitFor({ timeout: 30000 })
  const note = page.getByText('You got here by using the page.', { exact: false })
  // Picked straight away: nothing to say
  await frame.locator(NEW_CONVERSATION).click()
  await page.getByText('Selected element').waitFor()
  const before = await note.count()
  // Browse: make a conversation, then Shift-click "add people" in it
  await page.getByText('Browse', { exact: true }).click()
  await frame.locator(NEW_CONVERSATION).click()
  await frame.locator(NAME).fill('Picked in the editor')
  await frame.locator(CREATE).click()
  await frame.locator(PARTICIPANTS).waitFor({ timeout: 20000 })
  await page.keyboard.down('Shift')
  await frame.locator(PARTICIPANTS).click({ modifiers: ['Shift'] })
  await page.keyboard.up('Shift')
  await note.waitFor({ timeout: 5000 })
  const pageNote = await page.locator('.introvox-picker__page').textContent()
  await page.screenshot({ path: path.join(DIR, 'shots', 'p9-picker-note.png') })
  await page.getByRole('button', { name: 'Cancel' }).click()
  await page.keyboard.press('Escape')
  assert(before === 0, 'note shown without browsing')
  assert(/\/apps\/spreed\//.test(pageNote), pageNote)
}, page)

if (talkTour) await api(page, 'DELETE', `/apps/introvox/admin/tours/${talkTour}`)
for (const [id, enabled] of Object.entries(builtinBefore)) await api(page, 'PUT', `/apps/introvox/admin/tours/${id}`, { tour: { enabled } })
await browser.close()
process.exit(summary() ? 1 : 0)
