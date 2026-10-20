// Statistics per tour (how far people get) and moving a whole tour.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { launch, login, api, check, summary, assert, ssh, occ, addUser, BASE, NC, FIXTURES } from './lib.mjs'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const ADMIN = 'introvox-e2e-admin'
const USER = 'introvox-e2e-user'
const OTHER = 'introvox-e2e-other'
const PNG = fs.readFileSync(path.join(FIXTURES, 'png-dirty.png'))
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'introvox-p4-'))
const browser = await launch()
const admin = await login(browser, ADMIN)
const page = admin.page


const step = p => p.locator('.shepherd-element:visible')
const stepTitle = async p => (await step(p).locator('.shepherd-title').textContent()).trim()
const waitTitle = async (p, title) => {
  for (let i = 0; i < 40; i++) {
    if (await step(p).count() && await stepTitle(p) === title) return
    await p.waitForTimeout(250)
  }
  throw new Error(`step "${title}" did not show; showing ${await step(p).count() ? await stepTitle(p) : 'nothing'}`)
}
const clickStep = (p, name) => step(p).getByRole('button', { name: name.source === 'Next' ? /^(Next|Start tour)/ : name }).click()
const welcomeDone = async (uid) => {
  const session = await login(browser, uid)
  await api(session.page, 'POST', '/apps/introvox/personal/settings', { wizardDisabled: true, toursDisabled: false })
  return session
}
const stats = async (id, lang = '') => (await api(page, 'GET', `/apps/introvox/admin/tours/${id}/statistics?lang=${lang}`)).data.statistics
const reached = s => Object.fromEntries(s.steps.map(st => [st.id, st.reached]))
const reshow = id => api(page, 'POST', `/apps/introvox/admin/tours/${id}/reshow`)
const tours = async () => (await api(page, 'GET', '/apps/introvox/admin/tours')).data.tours

// Bytes in and out of the page, with the request token
const upload = (p, url, fields) => p.evaluate(async ({ url, fields }) => {
  const form = new FormData()
  for (const [name, value] of Object.entries(fields)) {
    if (value && value.base64) {
      const bytes = Uint8Array.from(atob(value.base64), c => c.charCodeAt(0))
      form.append(name, new Blob([bytes], { type: value.type }), value.filename)
    } else {
      form.append(name, value)
    }
  }
  const r = await fetch(OC.generateUrl(url), { method: 'POST', headers: { requesttoken: OC.requestToken }, body: form })
  return { status: r.status, data: await r.json().catch(() => null) }
}, { url, fields })
const download = async (p, url) => {
  const result = await p.evaluate(async (url) => {
    const r = await fetch(OC.generateUrl(url), { headers: { requesttoken: OC.requestToken } })
    const buffer = new Uint8Array(await r.arrayBuffer())
    let binary = ''
    for (let i = 0; i < buffer.length; i += 0x8000) binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000))
    return { status: r.status, type: r.headers.get('Content-Type'), disposition: r.headers.get('Content-Disposition'), base64: btoa(binary) }
  }, url)
  return { ...result, bytes: Buffer.from(result.base64, 'base64') }
}
const zipFile = (name, bytes) => ({ base64: bytes.toString('base64'), type: 'application/zip', filename: name })

// Zips through Python's zipfile: read one, or write one that says what we want
const py = (code, input) => execFileSync('python3', ['-c', code], { input, encoding: 'utf8' })
const readZip = (bytes) => {
  const file = path.join(TMP, 'read.zip')
  fs.writeFileSync(file, bytes)
  return JSON.parse(py(`import zipfile,json,sys; z=zipfile.ZipFile(${JSON.stringify(file)}); print(json.dumps({'names': z.namelist(), 'manifest': json.loads(z.read('tour.json'))}))`))
}
const writeZip = (entries) => {
  const file = path.join(TMP, `write-${Date.now()}-${Math.random().toString(16).slice(2)}.zip`)
  const spec = Object.fromEntries(Object.entries(entries).map(([name, value]) => [name, Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64')]))
  py(`import zipfile,json,sys,base64; spec=json.load(sys.stdin); z=zipfile.ZipFile(${JSON.stringify(file)},'w')\nfor n,b in spec.items(): z.writestr(n, base64.b64decode(b))\nz.close()`, JSON.stringify(spec))
  return fs.readFileSync(file)
}

let talkId = null
let mediaFile = null
let talkZip = null
let welcomeZip = null

await check('setup: a welcome tour of three steps, and a Talk tour with an image in two languages', async () => {
  for (const tour of (await tours()).filter(t => t.id !== 'welcome')) {
    await api(page, 'DELETE', `/apps/introvox/admin/tours/${tour.id}`)
  }
  const welcome = await api(page, 'POST', '/apps/introvox/admin/steps', { lang: 'en', steps: [
    { id: 'w-1', title: 'Welcome one', text: '<p>1</p>', attachTo: '', enabled: true, visibleToGroups: [] },
    { id: 'w-2', title: 'Welcome two', text: '<p>2</p>', attachTo: '', enabled: true, visibleToGroups: [] },
    { id: 'w-3', title: 'Welcome three', text: '<p>3</p>', attachTo: '', enabled: true, visibleToGroups: [] },
  ] })
  const media = await upload(page, '/apps/introvox/admin/media', { file: { base64: PNG.toString('base64'), type: 'image/png', filename: 'talk.png' }, kind: 'media' })
  mediaFile = media.data?.media?.file
  const created = await api(page, 'POST', '/apps/introvox/admin/tours', { tour: { name: 'Talk', trigger: { type: 'app', app: 'spreed' }, mainLanguage: 'en', visibleToGroups: [], audience: 'everyone' } })
  talkId = created.data?.tour?.id
  const talkStep = (id, title, extra = {}) => ({ id, title, text: `<p>${title}</p>`, attachTo: '', enabled: true, visibleToGroups: [], page: '/apps/spreed/', ...extra })
  const en = await api(page, 'POST', '/apps/introvox/admin/steps', { lang: 'en', tour: talkId, steps: [
    talkStep('t-1', 'Talk one', { media: { file: mediaFile, alt: 'The Talk window', decorative: false, size: 'small' } }),
    talkStep('t-2', 'Talk two'),
    talkStep('t-3', 'Talk three'),
  ] })
  const nl = await api(page, 'POST', '/apps/introvox/admin/steps', { lang: 'nl', tour: talkId, steps: [talkStep('t-1', 'Talk een')] })
  const on = await api(page, 'PUT', `/apps/introvox/admin/tours/${talkId}`, { tour: { enabled: true } })
  assert(welcome.status === 200 && media.status === 200 && created.status === 200 && en.status === 200 && nl.status === 200 && on.status === 200,
    JSON.stringify([welcome.status, media.status, media.data, created.status, en.status, en.data, nl.status, on.status, on.data]))
  return `${talkId}, ${mediaFile}`
})

await check('statistics: a run that started by itself counts how far it got', async () => {
  const s = await welcomeDone(USER)
  await s.page.goto(BASE + '/index.php/apps/spreed/')
  await waitTitle(s.page, 'Talk one')
  await clickStep(s.page, /Next/)
  await waitTitle(s.page, 'Talk two')
  await step(s.page).locator('.shepherd-cancel-icon').click()
  await s.page.waitForTimeout(1500)
  await s.context.close()
  const st = await stats(talkId)
  assert(st.started === 1 && st.completed === 0 && st.counted === 1, JSON.stringify(st))
  assert(JSON.stringify(reached(st)) === JSON.stringify({ 't-1': 1, 't-2': 1, 't-3': 0 }), JSON.stringify(reached(st)))
})

await check('statistics: a start by hand and going back count nothing more', async () => {
  const s = await welcomeDone(USER)
  await s.page.goto(BASE + '/index.php/settings/user/introvox-help')
  const row = s.page.locator('.introvox-personal__tour', { hasText: 'Talk' })
  await row.waitFor({ timeout: 20000 })
  await row.getByRole('button', { name: /^Start/ }).click()
  await s.page.waitForURL(/apps\/spreed/, { timeout: 30000 })
  await waitTitle(s.page, 'Talk one')
  await clickStep(s.page, /Next/)
  await waitTitle(s.page, 'Talk two')
  await clickStep(s.page, /Next/)
  await waitTitle(s.page, 'Talk three')
  await step(s.page).locator('.shepherd-cancel-icon').click()
  await s.page.waitForTimeout(1500)
  await s.context.close()

  const o = await welcomeDone(OTHER)
  await o.page.goto(BASE + '/index.php/apps/spreed/')
  await waitTitle(o.page, 'Talk one')
  await clickStep(o.page, /Next/)
  await waitTitle(o.page, 'Talk two')
  await clickStep(o.page, /Next/)
  await waitTitle(o.page, 'Talk three')
  await clickStep(o.page, /Back/)
  await waitTitle(o.page, 'Talk two')
  await clickStep(o.page, /Next/)
  await waitTitle(o.page, 'Talk three')
  await clickStep(o.page, /Done/)
  await o.page.waitForTimeout(1500)
  await o.context.close()

  const st = await stats(talkId)
  assert(st.started === 2 && st.completed === 1 && st.counted === 2, JSON.stringify(st))
  assert(JSON.stringify(reached(st)) === JSON.stringify({ 't-1': 2, 't-2': 2, 't-3': 1 }), JSON.stringify(reached(st)))
})

await check('statistics: after "Show again" a new run starts over', async () => {
  await reshow(talkId)
  const s = await welcomeDone(USER)
  await s.page.goto(BASE + '/index.php/apps/spreed/')
  await waitTitle(s.page, 'Talk one')
  await step(s.page).locator('.shepherd-cancel-icon').click()
  await s.page.waitForTimeout(1500)
  await s.context.close()
  const st = await stats(talkId)
  assert(JSON.stringify(reached(st)) === JSON.stringify({ 't-1': 2, 't-2': 1, 't-3': 1 }), JSON.stringify(reached(st)))
})

await check('statistics: the welcome tour counts too, per language', async () => {
  addUser('introvox-e2e-new3')
  const before = reached(await stats('welcome', 'en'))
  const s = await login(browser, 'introvox-e2e-new3', { skipTour: false })
  await s.page.goto(BASE + '/index.php/apps/files/')
  await waitTitle(s.page, 'Welcome one')
  await clickStep(s.page, /Next/)
  await waitTitle(s.page, 'Welcome two')
  await step(s.page).locator('.shepherd-cancel-icon').click()
  await s.page.waitForTimeout(1500)
  await s.context.close()
  const st = await stats('welcome', 'en')
  const after = reached(st)
  assert(after['w-1'] === before['w-1'] + 1 && after['w-2'] === before['w-2'] + 1 && after['w-3'] === before['w-3'], JSON.stringify([before, after]))
  assert(st.language === 'en' && st.languages.includes('en'), JSON.stringify(st))
})

await check('statistics: only for those who get the tour; admin routes for admins', async () => {
  await api(page, 'PUT', `/apps/introvox/admin/tours/${talkId}`, { tour: { visibleToGroups: ['introvox-e2e'] } })
  const o = await login(browser, OTHER)
  const u = await login(browser, USER)
  const seen = {
    outside: await api(o.page, 'POST', `/apps/introvox/api/tours/${talkId}/reached`, { step: 't-1', index: 1 }),
    unknown: await api(o.page, 'POST', '/apps/introvox/api/tours/no-such-tour/reached', { step: 't-1', index: 1 }),
    badStep: await api(u.page, 'POST', `/apps/introvox/api/tours/${talkId}/reached`, { step: 'a b', index: 1 }),
    badIndex: await api(u.page, 'POST', `/apps/introvox/api/tours/${talkId}/reached`, { step: 't-1', index: 0 }),
    statistics: await api(u.page, 'GET', `/apps/introvox/admin/tours/${talkId}/statistics`),
    export: await api(u.page, 'GET', `/apps/introvox/admin/tours/${talkId}/export`),
    import: await upload(u.page, '/apps/introvox/admin/tours/import', { file: zipFile('x.zip', writeZip({ 'tour.json': {} })) }),
  }
  await o.context.close()
  await u.context.close()
  await api(page, 'PUT', `/apps/introvox/admin/tours/${talkId}`, { tour: { visibleToGroups: [] } })
  assert(seen.outside.status === 404 && JSON.stringify(seen.outside) === JSON.stringify(seen.unknown), JSON.stringify([seen.outside, seen.unknown]))
  assert(seen.badStep.status === 400 && seen.badIndex.status === 400, JSON.stringify([seen.badStep, seen.badIndex]))
  assert(seen.statistics.status === 403 && seen.export.status === 403 && seen.import.status === 403, JSON.stringify([seen.statistics.status, seen.export.status, seen.import.status]))
})

await check('statistics pane: pick a tour, see how far people get, step by step', async () => {
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  await page.locator('.introvox-admin__panes').getByText('Statistics', { exact: true }).click()
  const stepsList = page.locator('.introvox-tour-stats__step')
  await stepsList.first().waitFor({ timeout: 20000 })
  const welcomeRows = await stepsList.count()
  await page.locator('.introvox-tour-stats__pickers .vs__search').first().click()
  // Our own Talk tour comes before the built-in one
  await page.getByRole('option', { name: 'Talk' }).first().click()
  await page.waitForFunction(() => [...document.querySelectorAll('.introvox-tour-stats__step-title')].some(el => el.textContent.includes('Talk one')), null, { timeout: 15000 })
  const rows = await stepsList.allTextContents()
  const languages = await page.locator('.introvox-tour-stats__pickers .v-select').count()
  await page.screenshot({ path: path.join(DIR, 'shots', 'p4-statistics.png'), fullPage: true })
  assert(welcomeRows === 3 && rows.length === 3, `rows ${welcomeRows} / ${rows.length}`)
  assert(/2 people\s*·\s*100%/.test(rows[0]) && /1 person\s*·\s*50%/.test(rows[2]), JSON.stringify(rows))
  assert(languages === 2, `language picker: ${languages}`)
})

await check('export: the whole tour in one .zip, its image included', async () => {
  const result = await download(page, `/apps/introvox/admin/tours/${talkId}/export`)
  talkZip = result.bytes
  const zip = readZip(talkZip)
  assert(result.status === 200 && /application\/zip/.test(result.type) && result.disposition.includes(`introvox-tour-${talkId}.zip`), JSON.stringify([result.status, result.type, result.disposition]))
  assert(JSON.stringify(zip.names.sort()) === JSON.stringify(['media/' + mediaFile, 'tour.json'].sort()), JSON.stringify(zip.names))
  const m = zip.manifest
  assert(m.format === 'introvox-tour' && m.version === 1 && m.tour.kind === 'app' && m.tour.name === 'Talk' && JSON.stringify(Object.keys(m.languages)) === '["en","nl"]', JSON.stringify(m.tour))
  assert(m.languages.en[0].media.file === mediaFile && !('id' in m.tour) && !('enabled' in m.tour), JSON.stringify(m.languages.en[0]))
})

await check('import: uploaded in the Tours pane it becomes a new tour, switched off, with its image', async () => {
  const file = path.join(TMP, 'talk.zip')
  fs.writeFileSync(file, talkZip)
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  await page.locator('.introvox-admin__panes').getByText('Tours', { exact: true }).click()
  await page.locator('.introvox-tours__item').first().waitFor()
  await page.getByRole('button', { name: 'Import tour' }).click()
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('menuitem', { name: 'Upload a file' }).click(),
  ])
  await chooser.setFiles(file)
  const toast = await page.locator('.toast-success, .toastify').filter({ hasText: 'Imported Talk' }).first().textContent({ timeout: 20000 })
  await page.locator('.introvox-tours__item', { hasText: 'Talk' }).filter({ hasNot: page.locator('.introvox-tours__badge') }).nth(1).waitFor({ timeout: 10000 })
  const all = await tours()
  const imported = all.find(t => t.id !== talkId && t.name === 'Talk' && !t.builtin)
  const en = (await api(page, 'GET', `/apps/introvox/admin/steps?lang=en&tour=${imported?.id}`)).data.steps
  const nl = (await api(page, 'GET', `/apps/introvox/admin/steps?lang=nl&tour=${imported?.id}`)).data.steps
  const image = await page.evaluate(async (file) => (await fetch(OC.generateUrl('/apps/introvox/media/' + file))).status, en?.[0]?.media?.file)
  assert(/switched off/.test(toast), toast)
  assert(imported && imported.enabled === false && imported.trigger.app === 'spreed' && JSON.stringify(imported.languages) === '["en","nl"]', JSON.stringify(imported))
  assert(en.length === 3 && nl.length === 1 && en[0].media?.file && image === 200, JSON.stringify([en.length, nl.length, en[0].media, image]))
  await api(page, 'DELETE', `/apps/introvox/admin/tours/${imported.id}`)
  return imported.id
})

await check('import: groups and media this Nextcloud lacks are left out and named', async () => {
  const manifest = readZip(talkZip).manifest
  manifest.tour.visibleToGroups = ['introvox-e2e', 'no-such-group']
  manifest.languages.en[1].visibleToGroups = ['no-such-group-2']
  const zip = writeZip({ 'tour.json': manifest })
  const r = await upload(page, '/apps/introvox/admin/tours/import', { file: zipFile('t.zip', zip) })
  const steps = (await api(page, 'GET', `/apps/introvox/admin/steps?lang=en&tour=${r.data?.tour?.id}`)).data.steps
  if (r.data?.tour?.id) await api(page, 'DELETE', `/apps/introvox/admin/tours/${r.data.tour.id}`)
  assert(r.status === 200 && JSON.stringify(r.data.droppedGroups.sort()) === '["no-such-group","no-such-group-2"]' && r.data.mediaLeftOut === 1, JSON.stringify(r.data))
  assert(JSON.stringify(r.data.tour.visibleToGroups) === '["introvox-e2e"]' && !steps[0].media && JSON.stringify(steps[1].visibleToGroups) === '[]', JSON.stringify([r.data.tour, steps[0], steps[1]]))
})

await check('import: anything that is not a tour package is refused, with a message', async () => {
  const manifest = readZip(talkZip).manifest
  const cases = {
    unexpected_file: writeZip({ 'tour.json': manifest, '../evil.php': '<?php' }),
    no_manifest: writeZip({ ['media/' + 'a'.repeat(32) + '.png']: 'x' }),
    newer_version: writeZip({ 'tour.json': { ...manifest, version: 99 } }),
    bad_tour: writeZip({ 'tour.json': { ...manifest, tour: { ...manifest.tour, trigger: { type: 'page', page: 'https://evil.example/' } } } }),
    not_a_package: Buffer.from('not a zip'),
  }
  const got = {}
  for (const [reason, bytes] of Object.entries(cases)) {
    const r = await upload(page, '/apps/introvox/admin/tours/import', { file: zipFile('x.zip', bytes) })
    got[reason] = `${r.status} ${r.data?.error}`
  }
  const after = (await tours()).filter(t => t.name === 'Talk' && !t.builtin).length
  // And in the page: the message
  const bad = path.join(TMP, 'bad.zip')
  fs.writeFileSync(bad, cases.unexpected_file)
  await page.getByRole('button', { name: 'Import tour' }).click()
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('menuitem', { name: 'Upload a file' }).click()])
  await chooser.setFiles(bad)
  const message = await page.locator('.toast-error, .toastify').filter({ hasText: 'not a tour exported from IntroVox' }).first().textContent({ timeout: 15000 })
  for (const reason of Object.keys(cases)) {
    assert(got[reason] === `400 ${reason}`, JSON.stringify(got))
  }
  assert(after === 1 && message, `tours named Talk: ${after}`)
})

await check('import: from the admin\'s own Files, as for large files', async () => {
  const put = await page.evaluate(async ({ uid, base64 }) => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    const r = await fetch(OC.linkToRemote('dav') + `/files/${uid}/introvox-e2e-tour.zip`, { method: 'PUT', headers: { requesttoken: OC.requestToken }, body: bytes })
    return r.status
  }, { uid: ADMIN, base64: talkZip.toString('base64') })
  const r = await api(page, 'POST', '/apps/introvox/admin/tours/import', { path: '/introvox-e2e-tour.zip' })
  const missing = await api(page, 'POST', '/apps/introvox/admin/tours/import', { path: '/no-such-file.zip' })
  if (r.data?.tour?.id) await api(page, 'DELETE', `/apps/introvox/admin/tours/${r.data.tour.id}`)
  await page.evaluate(async (uid) => fetch(OC.linkToRemote('dav') + `/files/${uid}/introvox-e2e-tour.zip`, { method: 'DELETE', headers: { requesttoken: OC.requestToken } }), ADMIN)
  assert([201, 204].includes(put) && r.status === 200 && r.data.tour.name === 'Talk' && missing.status === 400 && missing.data.error === 'not_found', JSON.stringify([put, r.status, r.data, missing]))
})

await check('welcome tour: exported are only the admin\'s own steps; an import asks first, then replaces them', async () => {
  const exported = await download(page, '/apps/introvox/admin/tours/welcome/export')
  welcomeZip = exported.bytes
  const zip = readZip(welcomeZip)
  // Change the welcome tour, then bring it back from the file
  await api(page, 'POST', '/apps/introvox/admin/steps', { lang: 'en', steps: [{ id: 'other', title: 'Other', text: '<p>x</p>', attachTo: '', enabled: true, visibleToGroups: [] }] })
  const asked = await upload(page, '/apps/introvox/admin/tours/import', { file: zipFile('w.zip', welcomeZip) })
  const untouched = (await api(page, 'GET', '/apps/introvox/admin/steps?lang=en&tour=welcome')).data.steps.map(s => s.id)
  // Through the page: the confirmation, then the import
  const file = path.join(TMP, 'welcome.zip')
  fs.writeFileSync(file, welcomeZip)
  await page.getByRole('button', { name: 'Import tour' }).click()
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('menuitem', { name: 'Upload a file' }).click()])
  await chooser.setFiles(file)
  const dialog = page.getByRole('dialog', { name: 'Replace the welcome tour?' })
  await dialog.waitFor({ timeout: 15000 }).catch(async (e) => {
    await page.screenshot({ path: path.join(DIR, 'shots', 'p4-welcome-confirm.png') })
    console.log('dialogs:', await page.getByRole('dialog').evaluateAll(ds => ds.map(d => d.textContent.slice(0, 200))))
    throw e
  })
  const text = await dialog.textContent()
  await dialog.getByRole('button', { name: 'Replace' }).click()
  await page.locator('.toast-success, .toastify').filter({ hasText: 'welcome tour' }).first().waitFor({ timeout: 15000 })
  const replaced = (await api(page, 'GET', '/apps/introvox/admin/steps?lang=en&tour=welcome')).data.steps.map(s => s.id)
  assert(zip.manifest.tour.kind === 'welcome' && JSON.stringify(Object.keys(zip.manifest.languages)) === '["en"]', JSON.stringify(zip.manifest.tour))
  assert(asked.status === 409 && asked.data.error === 'confirm_welcome' && JSON.stringify(untouched) === '["other"]', JSON.stringify([asked, untouched]))
  assert(/in en/.test(text) && JSON.stringify(replaced) === '["w-1","w-2","w-3"]', JSON.stringify([text, replaced]))
})

await check('welcome tour: with only the translated defaults there is nothing of the admin\'s to export', async () => {
  const keep = (await api(page, 'GET', '/apps/introvox/admin/steps?lang=en&tour=welcome')).data.steps
  await api(page, 'POST', '/apps/introvox/admin/reset', { lang: 'en' })
  const r = await download(page, '/apps/introvox/admin/tours/welcome/export')
  await api(page, 'POST', '/apps/introvox/admin/steps', { lang: 'en', steps: keep })
  const body = JSON.parse(r.bytes.toString())
  assert(r.status === 400 && body.error === 'nothing_to_export', JSON.stringify([r.status, body]))
})

await check('media: a file whose stored copy was removed is kept again on the next upload', async () => {
  // As cleaning up IntroVox's app data by hand would: the bytes go, the index stays
  ssh(`cd ${NC} && sudo -u www-data php -r 'require "lib/base.php"; \\OCP\\Server::get(\\OCP\\Files\\AppData\\IAppDataFactory::class)->get("introvox")->getFolder("media")->getFile("${mediaFile}")->delete();'`)
  const gone = await page.evaluate(async (file) => (await fetch(OC.generateUrl('/apps/introvox/media/' + file))).status, mediaFile)
  const again = await upload(page, '/apps/introvox/admin/media', { file: { base64: PNG.toString('base64'), type: 'image/png', filename: 'talk.png' }, kind: 'media' })
  const served = await page.evaluate(async (file) => (await fetch(OC.generateUrl('/apps/introvox/media/' + file))).status, again.data?.media?.file)
  assert(gone === 404 && again.status === 200 && served === 200, JSON.stringify([gone, again.status, again.data, served]))
})

await check('delete: who got how far goes with the tour', async () => {
  const before = (() => { try { return occ(`user:setting ${OTHER} introvox tour_${talkId}_reached`).trim() } catch (e) { return 'gone' } })()
  await api(page, 'DELETE', `/apps/introvox/admin/tours/${talkId}`)
  const after = (() => { try { return occ(`user:setting ${OTHER} introvox tour_${talkId}_reached`).trim() } catch (e) { return 'gone' } })()
  assert(/^1\|3\|t-3$/.test(before) && after === 'gone', `${before} → ${after}`)
})

await browser.close()
fs.rmSync(TMP, { recursive: true, force: true })
process.exit(summary() ? 1 : 0)
