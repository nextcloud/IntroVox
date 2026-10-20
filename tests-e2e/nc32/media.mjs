// Nextcloud 32: uploaded media served with the right headers
import fs from 'node:fs'
import path from 'node:path'
import { launch, BASE, ADMIN_PASSWORD, FIXTURES, DIR } from './nc32.mjs'
const browser = await launch()
const context = await browser.newContext()
const page = await context.newPage()
await page.goto(BASE + '/index.php/login')
await page.fill('input[name="user"]', 'admin')
await page.fill('input[name="password"]', ADMIN_PASSWORD)
await Promise.all([page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 60000, waitUntil: 'domcontentloaded' }), page.click('button[type="submit"]')])
const upload = async file => page.evaluate(async ({ bytes, name }) => {
  const body = new FormData(); body.append('file', new File([new Uint8Array(bytes)], name)); body.append('kind', 'media')
  const r = await fetch(OC.generateUrl('/apps/introvox/admin/media'), { method: 'POST', headers: { requesttoken: OC.requestToken }, body })
  return r.json()
}, { bytes: [...fs.readFileSync(file)], name: file.split('/').pop() })
const image = await upload(path.join(DIR, 'media', 'photo.png'))
const video = await upload(path.join(FIXTURES, 'mp4-udta.mp4'))
const url = f => `${BASE}/index.php/apps/introvox/media/${f}`
const img = await page.request.get(url(image.media.file))
const part = await page.request.get(url(video.media.file), { headers: { Range: 'bytes=0-99' } })
console.log('image', img.status(), img.headers()['content-type'], img.headers()['content-security-policy'])
console.log('video', part.status(), part.headers()['content-range'], part.headers()['content-type'])
await browser.close()
