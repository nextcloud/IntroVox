// Translating a tour and drafting its steps with the Nextcloud
// Assistant. Runs against the fake provider (fakeai/introvox_fakeai), which
// answers from the prompt: "[<code>] " before every translated word, three
// drafted steps, no JSON for GARBAGE, an exception for FAIL.
import path from 'node:path'
import { launch, login, api, check, summary, assert, BASE } from './lib.mjs'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const ADMIN = 'introvox-e2e-admin'
const USER = 'introvox-e2e-user'
const browser = await launch()
const admin = await login(browser, ADMIN)
const page = admin.page

const tours = async () => (await api(page, 'GET', '/apps/introvox/admin/tours')).data.tours
const stepsOf = async (tour, lang) => (await api(page, 'GET', `/apps/introvox/admin/steps?lang=${lang}&tour=${tour}`)).data.steps
const wait = async (task) => {
  for (let i = 0; i < 90; i++) {
    const r = await api(page, 'GET', `/apps/introvox/admin/assistant/tasks/${task}`)
    if (r.data?.status !== 'running') return r
    await page.waitForTimeout(1000)
  }
  return { data: { status: 'still running' } }
}

const ORIGINAL = [
  { id: 'd-1', title: '👋 Deck', text: '<p>Your <strong>boards</strong></p>', attachTo: '', enabled: true, visibleToGroups: [], page: '/apps/deck/' },
  { id: 'd-2', title: '📋 Boards', text: '<p>The list</p>', attachTo: '#app-navigation-vue', position: 'right', enabled: true, visibleToGroups: [], page: '/apps/deck/' },
]

let tourId
await check('assistant: setup — a Deck tour with two steps', async () => {
  for (const tour of (await tours()).filter(t => !t.builtin)) {
    const r = await api(page, 'DELETE', `/apps/introvox/admin/tours/${tour.id}`)
    assert(r.status === 200, `delete ${tour.id}: ${r.status}`)
  }
  const created = await api(page, 'POST', '/apps/introvox/admin/tours', { tour: { name: 'Deck AI', trigger: { type: 'app', app: 'deck' }, mainLanguage: 'en', visibleToGroups: [], audience: 'everyone' } })
  tourId = created.data?.tour?.id
  const saved = await api(page, 'POST', '/apps/introvox/admin/steps', { lang: 'en', tour: tourId, steps: ORIGINAL })
  assert(tourId && saved.status === 200, JSON.stringify([created, saved.status]))
  // A new admin gets the admin intro first; it would cover the page
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  const skip = page.locator('.shepherd-element:visible').getByRole('button', { name: 'Skip' })
  if (await skip.waitFor({ timeout: 8000 }).then(() => true, () => false)) {
    await skip.click()
  }
})

await check('assistant: available for admins, refused to others', async () => {
  const status = await api(page, 'GET', '/apps/introvox/admin/assistant')
  const user = await login(browser, USER)
  const asUser = await api(user.page, 'GET', '/apps/introvox/admin/assistant')
  const translateAsUser = await api(user.page, 'POST', '/apps/introvox/admin/assistant/translate', { tour: tourId, from: 'en', to: 'nl' })
  const noToken = await api(page, 'POST', '/apps/introvox/admin/assistant/draft', { tour: tourId, description: 'x', lang: 'en' }, { token: false })
  await user.context.close()
  assert(status.data?.available === true, JSON.stringify(status))
  assert(asUser.status === 403 && translateAsUser.status === 403, `user: ${asUser.status} ${translateAsUser.status}`)
  assert(noToken.status !== 200, `without CSRF token: ${noToken.status}`)
})

await check('assistant: what does not fit is refused before anything is asked', async () => {
  const codes = []
  for (const [kind, body] of [
    ['translate', { tour: tourId, from: 'en', to: 'en' }],
    ['translate', { tour: 'nope', from: 'en', to: 'nl' }],
    ['translate', { tour: tourId, from: 'en', to: 'xx-evil' }],
    ['translate', { tour: tourId, from: 'fr', to: 'nl' }],
    ['draft', { tour: tourId, description: '   ', lang: 'en' }],
    ['draft', { tour: tourId, description: 'x'.repeat(2001), lang: 'en' }],
    ['draft', { tour: tourId, description: 'x', lang: '' }],
  ]) {
    const r = await api(page, 'POST', `/apps/introvox/admin/assistant/${kind}`, body)
    codes.push(`${r.status}${r.data?.error ? ':' + r.data.error : ''}`)
  }
  const missing = await api(page, 'GET', '/apps/introvox/admin/assistant/tasks/999999')
  codes.push(`${missing.status}`)
  // fr: a tour of one's own has no steps in a language nobody wrote them in
  assert(JSON.stringify(codes.slice(0, 4)) === '["400:invalid","400:invalid","400:invalid","400:no_steps"]', codes.join(' '))
  assert(codes[4] === '400:invalid' && codes[5] === '400:invalid' && codes[6] === '400:invalid' && codes[7] === '404', codes.join(' '))
  return codes.join(' ')
})

await check('assistant: an answer without steps, and a failed task, are reported as such', async () => {
  const garbage = await api(page, 'POST', '/apps/introvox/admin/assistant/draft', { tour: tourId, description: 'GARBAGE please', lang: 'en' })
  const fail = await api(page, 'POST', '/apps/introvox/admin/assistant/draft', { tour: tourId, description: 'FAIL please', lang: 'en' })
  const [g, f] = [await wait(garbage.data.task), await wait(fail.data.task)]
  assert(g.data.status === 'failed' && g.data.error === 'unreadable', JSON.stringify(g.data))
  assert(f.data.status === 'failed' && f.data.error === 'failed', JSON.stringify(f.data))
})

await check('assistant: a tour changed while translating gives "changed", never stale steps', async () => {
  const r = await api(page, 'POST', '/apps/introvox/admin/assistant/translate', { tour: tourId, from: 'en', to: 'de' })
  await api(page, 'POST', '/apps/introvox/admin/steps', { lang: 'en', tour: tourId, steps: [...ORIGINAL, { ...ORIGINAL[0], id: 'd-3', title: 'Third' }] })
  const result = await wait(r.data.task)
  await api(page, 'POST', '/apps/introvox/admin/steps', { lang: 'en', tour: tourId, steps: ORIGINAL })
  assert(result.data.status === 'failed' && result.data.error === 'changed', JSON.stringify(result.data))
})

const openEditor = async () => {
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  await page.locator('.introvox-admin__panes').getByText('Tours', { exact: true }).click()
  await page.locator('.introvox-tours__item', { hasText: 'Deck AI' }).getByRole('button', { name: 'Edit steps' }).click()
  await page.waitForSelector('.step-item')
}

await check('assistant: write steps — description, progress, review, edit a title, add', async () => {
  await openEditor()
  await page.getByRole('button', { name: 'Write steps with AI' }).click()
  const dialog = page.getByRole('dialog', { name: 'Write steps with AI' })
  await dialog.getByLabel('What should the tour explain?').fill('How to make a card')
  await dialog.getByRole('button', { name: 'Write steps' }).click()
  await dialog.getByText('Writing …').waitFor({ timeout: 10000 })
  await page.screenshot({ path: path.join(DIR, 'shots', 'p7-draft-work.png') })
  const firstTitle = dialog.getByLabel('Title of step 1')
  await firstTitle.waitFor({ timeout: 60000 })
  const titles = await Promise.all([1, 2, 3].map(i => dialog.getByLabel(`Title of step ${i}`).inputValue()))
  await page.screenshot({ path: path.join(DIR, 'shots', 'p7-draft-review.png') })
  // An empty title cannot be added
  await firstTitle.fill(' ')
  const blocked = await dialog.getByRole('button', { name: 'Add steps' }).isDisabled()
  await firstTitle.fill('🃏 Cards, edited')
  // The text can be edited too
  await dialog.getByRole('button', { name: 'Edit text' }).nth(1).click()
  const editor = await dialog.locator('.step-text').count()
  await dialog.getByRole('button', { name: 'Add steps' }).click()
  await dialog.waitFor({ state: 'detached', timeout: 15000 })
  await page.getByText('Steps added').first().waitFor({ timeout: 10000 })
  const listed = await page.locator('.step-item').count()
  const saved = await stepsOf(tourId, 'en')
  const added = saved.slice(2)
  assert(titles[0] === '👋 About How to make a card' && titles[2] === '🎉 Done', JSON.stringify(titles))
  assert(blocked && editor === 1, `blocked ${blocked}, editors ${editor}`)
  assert(listed === 5 && saved.length === 5, `listed ${listed}, saved ${saved.length}`)
  assert(added[0].title === '🃏 Cards, edited' && added.every(s => /^ai-\d+-\d$/.test(s.id) && s.attachTo === '' && s.page === '/apps/deck/'), JSON.stringify(added))
  assert(JSON.stringify(saved.slice(0, 2).map(s => s.id)) === '["d-1","d-2"]', 'the steps there were changed')
}, page)

await check('assistant: translate into two languages — progress, review, save', async () => {
  await openEditor()
  await page.getByRole('button', { name: 'Translate with AI' }).click()
  const dialog = page.getByRole('dialog', { name: 'Translate with AI' })
  const select = dialog.locator('.v-select')
  // Typed until one option is left, then picked with the keyboard
  for (const language of ['Nederlands', 'Deutsch (Persönlich: Du)']) {
    await select.locator('input').fill(language)
    await page.keyboard.press('Enter')
  }
  await dialog.getByRole('button', { name: 'Translate', exact: true }).click()
  await dialog.getByText('Translating …').waitFor({ timeout: 10000 })
  await page.screenshot({ path: path.join(DIR, 'shots', 'p7-translate-work.png') })
  await dialog.getByRole('button', { name: 'Save translations' }).waitFor({ timeout: 90000 })
  const headings = await dialog.locator('h3').allTextContents()
  await page.screenshot({ path: path.join(DIR, 'shots', 'p7-translate-review.png') })
  await dialog.getByRole('button', { name: 'Save translations' }).click()
  await dialog.waitFor({ state: 'detached', timeout: 15000 })
  const en = await stepsOf(tourId, 'en')
  const nl = await stepsOf(tourId, 'nl')
  const de = await stepsOf(tourId, 'de')
  const overrides = (await api(page, 'GET', `/apps/introvox/admin/overrides?tour=${tourId}`)).data.overrides.map(o => o.code)
  assert(headings.map(h => h.trim()).join('|') === 'Nederlands|Deutsch (Persönlich: Du)', JSON.stringify(headings))
  assert(nl.length === en.length && nl.every((s, i) => s.title === `[nl] ${en[i].title}` && s.id === en[i].id && s.attachTo === en[i].attachTo && s.page === en[i].page), JSON.stringify(nl.map(s => s.title)))
  assert(nl[0].text === '<p>[nl] Your <strong>[nl] boards</strong></p>', nl[0].text)
  assert(de.length === en.length && de[1].title === '[de] 📋 Boards', JSON.stringify(de.map(s => s.title)))
  assert(overrides.includes('nl') && overrides.includes('de'), JSON.stringify(overrides))
}, page)

await check('assistant: a draft that cannot be used says so in the dialog', async () => {
  await openEditor()
  await page.getByRole('button', { name: 'Write steps with AI' }).click()
  const dialog = page.getByRole('dialog', { name: 'Write steps with AI' })
  await dialog.getByLabel('What should the tour explain?').fill('GARBAGE')
  await dialog.getByRole('button', { name: 'Write steps' }).click()
  await dialog.getByText('The answer could not be used. Try again.').waitFor({ timeout: 60000 })
  const addButtons = await dialog.getByRole('button', { name: 'Add steps' }).count()
  await page.screenshot({ path: path.join(DIR, 'shots', 'p7-draft-error.png') })
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  assert(addButtons === 0, 'Add steps offered for an answer without steps')
  assert((await stepsOf(tourId, 'en')).length === 5, 'steps changed')
}, page)

await check('assistant: the welcome tour drafts in the language being edited', async () => {
  const r = await api(page, 'POST', '/apps/introvox/admin/assistant/draft', { tour: 'welcome', description: 'The dashboard', lang: 'nl' })
  const result = await wait(r.data.task)
  assert(result.data.status === 'done' && result.data.language === 'nl' && result.data.steps.every(s => !('page' in s)), JSON.stringify(result.data))
})

await browser.close()
process.exit(summary() ? 1 : 0)
