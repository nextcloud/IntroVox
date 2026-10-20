// Images, GIFs and videos in steps.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { launch, login, api, check, summary, assert, BASE, FIXTURES } from './lib.mjs'

// The images and files to upload, made by media/make.php (PHP with GD)
const DIR = path.join(path.dirname(new URL(import.meta.url).pathname), 'media')
if (!fs.existsSync(path.join(DIR, 'photo.png'))) {
  execFileSync('php', ['make.php'], { cwd: DIR })
}
const VIDEO = process.env.VIDEO_FIXTURE || path.join(FIXTURES, 'mp4-udta.mp4')
const ADMIN = 'introvox-e2e-admin'
const USER = 'introvox-e2e-user'
const OTHER = 'introvox-e2e-other'
const browser = await launch()
const admin = await login(browser, ADMIN)
const page = admin.page

// Upload through the admin route, as the editor does
const upload = async (p, file, kind = 'media', name = path.basename(file)) => {
  const bytes = [...fs.readFileSync(file)]
  return p.evaluate(async ({ bytes, name, kind }) => {
    const body = new FormData()
    body.append('file', new File([new Uint8Array(bytes)], name))
    body.append('kind', kind)
    const response = await fetch(OC.generateUrl('/apps/introvox/admin/media'), { method: 'POST', headers: { requesttoken: OC.requestToken }, body })
    return { status: response.status, data: await response.json().catch(() => null) }
  }, { bytes, name, kind })
}
const mediaUrl = file => `${BASE}/index.php/apps/introvox/media/${file}`
const statusOf = async (p, file, headers = {}) => (await p.request.get(mediaUrl(file), { headers, maxRedirects: 0 })).status()
const saveSteps = (steps) => api(page, 'POST', '/apps/introvox/admin/steps', { steps, lang: 'en' })
const step = p => p.locator('.shepherd-element:visible')
const stepTitle = async p => (await step(p).locator('.shepherd-title').textContent()).trim()
const freshTour = async (user, setup) => {
  const session = await login(browser, user, { skipTour: false })
  await api(session.page, 'POST', '/apps/introvox/personal/settings', { wizardDisabled: false })
  await session.page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  if (setup) await setup(session.page)
  await session.page.goto(BASE + '/index.php/apps/files/')
  await step(session.page).waitFor({ timeout: 30000 })
  return session
}
const openSteps = async () => {
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  await page.locator('.introvox-admin__panes').getByText('Tours', { exact: true }).click()
  await page.locator('.introvox-tours__item', { hasText: 'Welcome tour' }).getByRole('button', { name: 'Edit steps' }).click()
  await page.waitForSelector('.step-item')
}

const files = {}

await check('media: uploads are checked, cleaned and kept', async () => {
  for (const name of ['photo.png', 'group.png', 'off.png', 'anim.gif', 'meta.jpg']) {
    const r = await upload(page, path.join(DIR, name))
    assert(r.status === 200 && r.data?.media?.file, `${name}: ${r.status} ${JSON.stringify(r.data)}`)
    files[name] = r.data.media
  }
  assert(files['photo.png'].width === 640 && files['photo.png'].height === 400, `photo ${JSON.stringify(files['photo.png'])}`)
  assert(files['anim.gif'].animated === true, `gif ${JSON.stringify(files['anim.gif'])}`)
  const again = await upload(page, path.join(DIR, 'photo.png'), 'media', 'other-name.png')
  assert(again.data.media.file === files['photo.png'].file, 'the same file got a second id')
  return Object.values(files).map(f => f.file).join(', ')
})

await check('media: an SVG named .png, a file over the limit and captions as media are refused', async () => {
  const fake = await upload(page, path.join(DIR, 'fake.png'))
  const big = await upload(page, path.join(DIR, 'big.png'))
  const vttAsMedia = await upload(page, path.join(DIR, 'captions.vtt'))
  assert(fake.status === 400 && fake.data.error === 'unsupported_type', `svg: ${JSON.stringify(fake)}`)
  // PHP's upload limit (2 MB on the VM) or IntroVox's own (5 MB), whichever is lower
  assert(big.status === 400 && ['too_large', 'too_large_for_server'].includes(big.data.error), `big: ${JSON.stringify(big)}`)
  assert(vttAsMedia.status === 400 && vttAsMedia.data.error === 'unsupported_type', `vtt: ${JSON.stringify(vttAsMedia)}`)
})

await check('media: metadata does not survive the upload', async () => {
  const served = await page.request.get(mediaUrl(files['meta.jpg'].file))
  const body = (await served.body()).toString('latin1')
  assert(served.status() === 200, `status ${served.status()}`)
  assert(!body.includes('SECRET-XMP-MARKER') && !body.includes('SECRET-COMMENT-MARKER'), 'markers still in the file')
})

await check('media: each file only for whoever gets an enabled step with it', async () => {
  const r = await saveSteps([
    { id: 'm-all', title: 'For everyone', text: '<p>All</p>', attachTo: '', enabled: true, visibleToGroups: [], media: { file: files['photo.png'].file, alt: 'A blue screenshot' } },
    { id: 'm-group', title: 'For the group', text: '<p>Group</p>', attachTo: '', enabled: true, visibleToGroups: ['introvox-e2e'], media: { file: files['group.png'].file, alt: 'Green' } },
    { id: 'm-off', title: 'Switched off', text: '<p>Off</p>', attachTo: '', enabled: false, visibleToGroups: [], media: { file: files['off.png'].file, alt: 'Red' } },
    { id: 'm-gif', title: 'A moving picture', text: '<p>GIF</p>', attachTo: '', enabled: true, visibleToGroups: [], media: { file: files['anim.gif'].file, alt: 'Colours changing' } },
    { id: 'm-done', title: 'Media done', text: '<p>Bye</p>', attachTo: '', enabled: true, visibleToGroups: [] },
  ])
  assert(r.status === 200, `save ${r.status} ${JSON.stringify(r.data)}`)
  const user = await login(browser, USER)
  const other = await login(browser, OTHER)
  const anonymous = await browser.newContext({ ignoreHTTPSErrors: true })
  const seen = {
    user: [await statusOf(user.page, files['photo.png'].file), await statusOf(user.page, files['group.png'].file), await statusOf(user.page, files['off.png'].file)],
    other: [await statusOf(other.page, files['photo.png'].file), await statusOf(other.page, files['group.png'].file), await statusOf(other.page, files['off.png'].file)],
    admin: [await statusOf(page, files['off.png'].file), await statusOf(page, files['meta.jpg'].file)],
    anonymous: (await anonymous.request.get(mediaUrl(files['photo.png'].file), { maxRedirects: 0 })).status(),
  }
  await user.context.close()
  await other.context.close()
  await anonymous.close()
  assert(seen.user.join() === '200,200,404', `user ${seen.user}`)
  assert(seen.other.join() === '200,404,404', `outside the group ${seen.other}`)
  assert(seen.admin.join() === '200,200', `admin ${seen.admin}`)
  assert(seen.anonymous !== 200, `logged out ${seen.anonymous}`)
  return JSON.stringify(seen)
})

await check('media: headers, and a 304 when unchanged', async () => {
  const response = await page.request.get(mediaUrl(files['photo.png'].file))
  const h = response.headers()
  const notModified = await statusOf(page, files['photo.png'].file, { 'If-None-Match': h.etag })
  assert(h['content-type'] === 'image/png', `type ${h['content-type']}`)
  assert(h['x-content-type-options'] === 'nosniff', 'nosniff')
  assert(h['cross-origin-resource-policy'] === 'same-origin', 'CORP')
  assert(h['content-security-policy'] === "default-src 'none'; sandbox", `CSP ${h['content-security-policy']}`)
  assert(/private/.test(h['cache-control']) && /no-cache/.test(h['cache-control']), `cache ${h['cache-control']}`)
  assert(h.etag && /^"[a-f0-9]{64}"$/.test(h.etag), `etag ${h.etag}`)
  assert(notModified === 304, `If-None-Match gave ${notModified}`)
})

await check('media: a page on another origin cannot show the image', async () => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true })
  const other = await context.newPage()
  await other.setContent(`<img id="x" src="${mediaUrl(files['photo.png'].file)}">`)
  await other.waitForTimeout(3000)
  const width = await other.locator('#x').evaluate(img => img.naturalWidth)
  await context.close()
  assert(width === 0, `loaded ${width} px`)
})

await check('media: the user\'s tour shows the image with its description', async () => {
  const { context, page: p } = await freshTour(USER)
  const title = await stepTitle(p)
  const image = step(p).locator('figure.introvox-media img')
  await image.waitFor()
  await p.waitForFunction(() => document.querySelector('.shepherd-element figure img')?.complete)
  const info = await image.evaluate(img => ({ width: img.naturalWidth, alt: img.alt }))
  await context.close()
  assert(title === 'For everyone', `first step ${title}`)
  assert(info.width === 640 && info.alt === 'A blue screenshot', JSON.stringify(info))
})

await check('media: a moving GIF has a pause button, and stands still with reduced motion', async () => {
  const toGif = async p => {
    for (let i = 0; i < 5 && (await stepTitle(p)) !== 'A moving picture'; i++) {
      await step(p).getByRole('button', { name: /^(Start tour|Next)$/ }).click()
      await p.waitForTimeout(500)
    }
  }
  const moving = await freshTour(OTHER)
  await toGif(moving.page)
  const button = step(moving.page).locator('.introvox-media__motion')
  const before = await button.getAttribute('aria-label')
  await button.focus()
  await moving.page.keyboard.press('Enter')
  const paused = await step(moving.page).evaluate(el => ({ img: el.querySelector('figure img').hidden, canvas: el.querySelector('figure canvas').hidden }))
  const after = await button.getAttribute('aria-label')
  await moving.context.close()

  const still = await freshTour(OTHER, p => p.emulateMedia({ reducedMotion: 'reduce' }))
  await toGif(still.page)
  await still.page.waitForTimeout(800)
  const reduced = await step(still.page).evaluate(el => ({ img: el.querySelector('figure img').hidden, label: el.querySelector('.introvox-media__motion').getAttribute('aria-label') }))
  await still.context.close()
  assert(before === 'Pause animation' && after === 'Play animation' && paused.img && !paused.canvas, `button ${before} → ${after}, ${JSON.stringify(paused)}`)
  assert(reduced.img === true && reduced.label === 'Play animation', `reduced motion ${JSON.stringify(reduced)}`)
})

await check('media: in the wizard, Save waits for a description', async () => {
  await openSteps()
  await page.locator('.step-item', { hasText: 'ID: m-done' }).getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit step' })
  await dialog.locator('.step-media input[type="file"]').setInputFiles(path.join(DIR, 'photo.png'))
  await dialog.locator('.step-media__preview img').waitFor()
  const save = dialog.getByRole('button', { name: 'Save' })
  const disabledWithoutAlt = await save.isDisabled()
  await dialog.getByLabel('Description (alt text) *').fill('The same blue screenshot')
  const enabledWithAlt = await save.isEnabled()
  await save.click()
  await page.waitForTimeout(1500)
  const stored = (await api(page, 'GET', '/apps/introvox/admin/steps?lang=en')).data.steps.find(s => s.id === 'm-done').media
  assert(disabledWithoutAlt && enabledWithAlt, `save disabled ${disabledWithoutAlt}, then enabled ${enabledWithAlt}`)
  assert(stored?.file === files['photo.png'].file && stored.width === 640 && stored.alt === 'The same blue screenshot', JSON.stringify(stored))
})

await check('media: a pasted screenshot is uploaded', async () => {
  await openSteps()
  await page.locator('.step-item', { hasText: 'ID: m-done' }).getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit step' })
  await dialog.getByRole('button', { name: 'Remove', exact: true }).click()
  const bytes = [...fs.readFileSync(path.join(DIR, 'pasted.png'))]
  await dialog.locator('.step-media').evaluate((block, bytes) => {
    const data = new DataTransfer()
    data.items.add(new File([new Uint8Array(bytes)], 'screenshot.png', { type: 'image/png' }))
    block.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
  }, bytes)
  await dialog.locator('.step-media__preview img').waitFor({ timeout: 15000 })
  const width = await dialog.locator('.step-media__preview img').getAttribute('width')
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  assert(width === '300', `pasted image width ${width}`)
})

await check('media: an error says what is wrong with a file', async () => {
  await openSteps()
  await page.locator('.step-item', { hasText: 'ID: m-done' }).getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit step' })
  await dialog.getByRole('button', { name: 'Remove', exact: true }).click()
  await dialog.locator('.step-media input[type="file"]').setInputFiles(path.join(DIR, 'big.png'))
  const message = await dialog.getByText(/The file is too large\. The limit is 5 MB\.|The file is larger than this server accepts/).textContent({ timeout: 30000 })
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  return message.trim()
})

await check('media: chosen from Files; deleting the original keeps the step\'s copy', async () => {
  const dav = `/remote.php/dav/files/${ADMIN}/e2e-anim.gif`
  const bytes = [...fs.readFileSync(path.join(DIR, 'anim.gif'))]
  const put = await page.evaluate(async ({ dav, bytes }) => (await fetch(dav, { method: 'PUT', headers: { requesttoken: OC.requestToken }, body: new Uint8Array(bytes) })).status, { dav, bytes })
  await openSteps()
  await page.locator('.step-item', { hasText: 'ID: m-done' }).getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit step' })
  await dialog.getByRole('button', { name: 'Remove', exact: true }).click()
  await dialog.getByRole('button', { name: 'Choose from Files' }).click()
  const picker = page.getByRole('dialog', { name: 'Choose an image or video' })
  await picker.waitFor({ timeout: 15000 })
  await picker.getByText('e2e-anim', { exact: false }).first().click()
  await picker.getByRole('button', { name: 'Choose' }).click()
  await dialog.locator('.step-media__preview img').waitFor({ timeout: 15000 })
  const src = await dialog.locator('.step-media__preview img').getAttribute('src')
  const file = src.split('/').pop()
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  const deleted = await page.evaluate(async dav => (await fetch(dav, { method: 'DELETE', headers: { requesttoken: OC.requestToken } })).status, dav)
  const still = await statusOf(page, file)
  assert(put === 201 || put === 204, `PUT ${put}`)
  assert(file === files['anim.gif'].file, `picked ${file}, expected the same content as anim.gif`)
  assert(deleted === 204 && still === 200, `deleted ${deleted}, served afterwards ${still}`)
})

await check('media: a file shared for viewing only is refused', async () => {
  const user = await login(browser, USER)
  const bytes = [...fs.readFileSync(path.join(DIR, 'viewonly.png'))]
  const shared = await user.page.evaluate(async ({ bytes, admin, user }) => {
    await fetch(`/remote.php/dav/files/${user}/viewonly.png`, { method: 'PUT', headers: { requesttoken: OC.requestToken }, body: new Uint8Array(bytes) })
    const body = new URLSearchParams({ path: '/viewonly.png', shareType: '0', shareWith: admin, permissions: '1', attributes: JSON.stringify([{ scope: 'permissions', key: 'download', value: false }]) })
    const response = await fetch('/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json', { method: 'POST', headers: { requesttoken: OC.requestToken, 'OCS-APIRequest': 'true' }, body })
    return response.status
  }, { bytes, admin: ADMIN, user: USER })
  await user.context.close()
  const r = await api(page, 'POST', '/apps/introvox/admin/media/from-files', { path: '/viewonly.png', kind: 'media' })
  assert(shared === 200, `share ${shared}`)
  assert(r.status === 400 && r.data.error === 'view_only', JSON.stringify(r))
})

await check('media: an import with a file this server lacks leaves it out and says so', async () => {
  const fileContent = JSON.stringify({ version: '1.0', language: 'en', steps: [
    { id: 'imp-a', title: 'Imported', text: '<p>x</p>', attachTo: '', enabled: true, visibleToGroups: [], media: { file: 'ab'.repeat(16) + '.png', alt: 'Gone' } },
  ] })
  const r = await api(page, 'POST', '/apps/introvox/admin/import', { fileContent })
  const stored = (await api(page, 'GET', '/apps/introvox/admin/steps?lang=en')).data.steps
  assert(r.status === 200 && r.data.missingMedia?.length === 1, JSON.stringify(r.data))
  assert(stored.length === 1 && !('media' in stored[0]), JSON.stringify(stored))
})

if (VIDEO) {
  const videoFiles = {}
  await check('video: an MP4 and its captions are kept', async () => {
    const video = await upload(page, VIDEO)
    const captions = await upload(page, path.join(DIR, 'captions.vtt'), 'captions')
    assert(video.status === 200, JSON.stringify(video))
    assert(captions.status === 200, JSON.stringify(captions))
    videoFiles.video = video.data.media
    videoFiles.captions = captions.data.media
    const r = await saveSteps([
      { id: 'v-loop', title: 'Like a GIF', text: '<p>Loop</p>', attachTo: '', enabled: true, visibleToGroups: [], media: { file: video.data.media.file, alt: 'A test pattern', playback: 'loop' } },
      { id: 'v-play', title: 'With a play button', text: '<p>Controls</p>', attachTo: '', enabled: true, visibleToGroups: [], media: { file: video.data.media.file, alt: 'A test pattern', playback: 'controls', captions: captions.data.media.file } },
      { id: 'v-done', title: 'Video done', text: '<p>Bye</p>', attachTo: '', enabled: true, visibleToGroups: [] },
    ])
    assert(r.status === 200, JSON.stringify(r.data))
    return `${video.data.media.width}x${video.data.media.height}, audio ${video.data.media.hasAudio}`
  })

  await check('video: ranges give 206 with the headers, a bad range 416', async () => {
    const url = mediaUrl(videoFiles.video.file)
    const full = await page.request.get(url)
    const part = await page.request.get(url, { headers: { Range: 'bytes=0-99' } })
    const bad = await page.request.get(url, { headers: { Range: 'bytes=999999999-' } })
    const h = part.headers()
    const size = (await full.body()).length
    assert(full.status() === 200 && full.headers()['accept-ranges'] === 'bytes', `full ${full.status()}`)
    assert(part.status() === 206 && h['content-range'] === `bytes 0-99/${size}` && (await part.body()).length === 100, `206 ${part.status()} ${h['content-range']}`)
    assert(h['content-type'] === 'video/mp4' && h['x-content-type-options'] === 'nosniff' && h['content-security-policy'] === "default-src 'none'; sandbox", JSON.stringify(h))
    assert(bad.status() === 416 && bad.headers()['content-range'] === `bytes */${size}`, `bad ${bad.status()} ${bad.headers()['content-range']}`)
  })

  await check('video: like a GIF it plays silently, and pauses when its step goes', async () => {
    const { context, page: p } = await freshTour(OTHER)
    await p.waitForFunction(() => { const v = document.querySelector('.shepherd-element video'); return v && !v.paused })
    const state = await step(p).locator('video').evaluate(v => ({ muted: v.muted, loop: v.loop, controls: v.controls }))
    const loopVideo = await step(p).locator('video').elementHandle()
    await step(p).getByRole('button', { name: 'Start tour' }).click()
    await p.waitForTimeout(800)
    const pausedAfter = await loopVideo.evaluate(v => v.paused)
    await context.close()
    assert(state.muted && state.loop && !state.controls, JSON.stringify(state))
    assert(pausedAfter, 'kept playing after its step went')
  })

  await check('video: with reduced motion it does not start', async () => {
    const { context, page: p } = await freshTour(OTHER, q => q.emulateMedia({ reducedMotion: 'reduce' }))
    await p.waitForTimeout(1500)
    const paused = await step(p).locator('video').evaluate(v => v.paused)
    await context.close()
    assert(paused, 'played with reduced motion')
  })

  await check('video: arrow keys on the video stay with the video; captions are on', async () => {
    const { context, page: p } = await freshTour(OTHER)
    await step(p).getByRole('button', { name: 'Start tour' }).click()
    await p.waitForTimeout(800)
    const title = await stepTitle(p)
    await step(p).locator('video').focus()
    await p.keyboard.press('ArrowRight')
    await p.waitForTimeout(600)
    const after = await stepTitle(p)
    await p.waitForFunction(() => document.querySelector('.shepherd-element video track')?.readyState === 2, null, { timeout: 15000 })
    const captions = await step(p).locator('video').evaluate(v => ({ mode: v.textTracks[0]?.mode, cues: v.textTracks[0]?.cues?.length }))
    await context.close()
    assert(title === 'With a play button' && after === title, `${title} → ${after}`)
    assert(captions.mode === 'showing' && captions.cues === 1, JSON.stringify(captions))
  })
}

await browser.close()
process.exit(summary() ? 1 : 0)
