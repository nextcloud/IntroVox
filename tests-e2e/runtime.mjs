// The small bootstrap and the lazy tour chunk.
import { launch, login, api, check, summary, assert, BASE } from './lib.mjs'

const ADMIN = 'introvox-e2e-admin'
const STEPS = [
  { id: 'rt-welcome', title: 'Runtime welcome', text: '<p>Hi</p>', attachTo: '', enabled: true, visibleToGroups: [] },
  { id: 'rt-hidden', title: 'Hidden target', text: '<p>Centered</p>', attachTo: '#introvox-e2e-hidden', position: 'bottom', enabled: true, visibleToGroups: [] },
  { id: 'rt-talk', title: 'Inside Talk', text: '<p>Talk</p>', attachTo: '', page: '/apps/spreed/', enabled: true, visibleToGroups: [] },
  { id: 'rt-done', title: 'Runtime done', text: '<p>Bye</p>', attachTo: '', enabled: true, visibleToGroups: [] },
]
const TOUR_CHUNK = /\/apps\/introvox\/js\/tour\.[0-9a-f]{8}\.js/
const INTROVOX_CALL = /\/apps\/introvox\/(api|personal)\//

const browser = await launch()
const setup = await login(browser, ADMIN)

await check('setup: the runtime test tour', async () => {
  const r = await api(setup.page, 'POST', '/apps/introvox/admin/steps', { steps: STEPS, lang: 'en' })
  assert(r.status === 200, `status ${r.status}`)
})

// A logged-in tab for which the welcome tour is open again: no local mark,
// and the server's "done" taken back
const freshTab = async (options = {}) => {
  const session = await login(browser, ADMIN, { skipTour: false, ...options })
  await api(session.page, 'POST', '/apps/introvox/personal/settings', { wizardDisabled: false })
  await session.page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  return session
}
const recordRequests = (page) => {
  const urls = []
  page.on('request', request => urls.push(request.url()))
  return urls
}
const step = page => page.locator('.shepherd-element:visible')
const stepTitle = async page => (await step(page).locator('.shepherd-title').textContent()).trim()
const button = (page, name) => step(page).getByRole('button', { name, exact: true })

await check('runtime: a new user gets the welcome tour; the tour code comes in a chunk', async () => {
  const { context, page } = await freshTab()
  const urls = recordRequests(page)
  let mainSize = 0
  page.on('response', async response => {
    if (/\/apps\/introvox\/js\/main\.js/.test(response.url())) {
      mainSize = (await response.body().catch(() => Buffer.alloc(0))).length
    }
  })
  await page.goto(BASE + '/index.php/apps/files/')
  await step(page).waitFor({ timeout: 30000 })
  const title = await stepTitle(page)
  await context.close()
  assert(title === 'Runtime welcome', `first step ${title}`)
  assert(urls.some(url => TOUR_CHUNK.test(url)), 'tour chunk not loaded')
  return `main.js ${Math.round(mainSize / 1024)} KB`
})

await check('runtime: after Done, a reload asks IntroVox nothing and loads no tour code', async () => {
  const { context, page } = await freshTab()
  await page.goto(BASE + '/index.php/apps/files/')
  await step(page).waitFor({ timeout: 30000 })
  await button(page, 'Start tour').click()
  const titles = []
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(600)
    await step(page).waitFor({ timeout: 30000 })
    const title = await stepTitle(page)
    titles.push(title)
    if (title === 'Runtime done') {
      break
    }
    await button(page, 'Next').click()
  }
  await button(page, 'Done').click()
  await page.waitForTimeout(4000)
  const urls = recordRequests(page)
  await page.reload()
  await page.waitForTimeout(5000)
  await context.close()
  const calls = urls.filter(url => INTROVOX_CALL.test(url) || TOUR_CHUNK.test(url))
  assert(titles.includes('Inside Talk') && titles.at(-1) === 'Runtime done', `steps ${titles.join(' > ')}`)
  assert(calls.length === 0, `after reload: ${calls.join(', ')}`)
  return titles.join(' > ')
})

await check('runtime: after the close button, a reload asks IntroVox nothing either', async () => {
  const { context, page } = await freshTab()
  await page.goto(BASE + '/index.php/apps/files/')
  await step(page).waitFor({ timeout: 30000 })
  await step(page).locator('.shepherd-cancel-icon').click()
  await page.waitForTimeout(1500)
  const urls = recordRequests(page)
  await page.reload()
  await page.waitForTimeout(5000)
  await context.close()
  const calls = urls.filter(url => INTROVOX_CALL.test(url) || TOUR_CHUNK.test(url))
  assert(calls.length === 0, `after reload: ${calls.join(', ')}`)
})

await check('runtime: a resume entry without tourId, from before tours had ids, carries on in Talk', async () => {
  const { context, page } = await freshTab()
  await page.evaluate(() => {
    localStorage.setItem('introvox_completed', 'true')
    sessionStorage.setItem('introvox_tour_resume', JSON.stringify({ stepId: 'rt-talk', forward: true, failed: [], startPage: '/apps/files/', at: Date.now() }))
  })
  await page.goto(BASE + '/index.php/apps/spreed/')
  await step(page).waitFor({ timeout: 30000 })
  const title = await stepTitle(page)
  await context.close()
  assert(title === 'Inside Talk', `step ${title}`)
})

await check('runtime: at 390 px, a step whose element is hidden is centered', async () => {
  const { context, page } = await freshTab()
  await page.setViewportSize({ width: 390, height: 844 })
  await context.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const hidden = document.createElement('div')
      hidden.id = 'introvox-e2e-hidden'
      hidden.style.display = 'none'
      hidden.textContent = 'hidden'
      document.body.appendChild(hidden)
    })
  })
  await page.goto(BASE + '/index.php/apps/files/')
  await step(page).waitFor({ timeout: 30000 })
  await button(page, 'Start tour').click()
  await page.waitForTimeout(800)
  const title = await stepTitle(page)
  const centered = await step(page).evaluate(el => el.classList.contains('shepherd-centered'))
  await context.close()
  assert(title === 'Hidden target' && centered, `step ${title}, centered ${centered}`)
})

await check('runtime: someone else\'s same-origin iframe starts no tour', async () => {
  const { context, page } = await freshTab()
  await page.goto(BASE + '/index.php/apps/files/')
  await page.evaluate(src => {
    const frame = document.createElement('iframe')
    frame.name = 'some-viewer'
    frame.src = src
    frame.style.cssText = 'width:900px;height:600px'
    document.body.appendChild(frame)
  }, BASE + '/index.php/apps/files/')
  await page.waitForTimeout(12000)
  const inner = page.frame({ name: 'some-viewer' })
  const loaded = inner ? await inner.locator('#header, header').count() : 0
  const tourInside = inner ? await inner.locator('.shepherd-element').count() : -1
  await context.close()
  assert(loaded > 0, 'the iframe did not load Nextcloud')
  assert(tourInside === 0, `tour elements in the iframe: ${tourInside}`)
})

await check('runtime: IntroVox\'s settings page loads no tour code', async () => {
  const { context, page } = await freshTab()
  const urls = recordRequests(page)
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  await page.waitForSelector('.introvox-admin__panes')
  await page.waitForTimeout(5000)
  const tours = await page.locator('.shepherd-element').count()
  await context.close()
  assert(!urls.some(url => TOUR_CHUNK.test(url)) && tours === 0, `chunk ${urls.filter(url => TOUR_CHUNK.test(url))}, tour elements ${tours}`)
})

await check('runtime: the preview starts while the tour code loads slowly', async () => {
  const { context, page } = await login(browser, ADMIN)
  await page.route(url => TOUR_CHUNK.test(url.href), async route => {
    await new Promise(resolve => setTimeout(resolve, 3000))
    await route.continue()
  })
  await page.goto(BASE + '/index.php/settings/admin/introvox')
  await page.locator('.introvox-admin__panes').getByText('Tours', { exact: true }).click()
  await page.locator('.introvox-tours__item', { hasText: 'Welcome tour' }).getByRole('button', { name: 'Edit steps' }).click()
  await page.waitForSelector('.step-item')
  await page.getByRole('button', { name: 'Preview tour' }).click()
  const frame = page.frameLocator('iframe[name="introvox-tour-preview"]')
  await frame.locator('.shepherd-element').first().waitFor({ timeout: 40000 })
  const title = (await frame.locator('.shepherd-title').first().textContent()).trim()
  await context.close()
  assert(title === 'Runtime welcome', `preview shows ${title}`)
})

await check('runtime: a welcome tour with every step switched off shows nothing, not the bundled steps', async () => {
  await api(setup.page, 'POST', '/apps/introvox/admin/steps', { steps: STEPS.map(s => ({ ...s, enabled: false })), lang: 'en' })
  const { context, page } = await freshTab()
  await page.goto(BASE + '/index.php/apps/files/')
  const shown = await step(page).waitFor({ timeout: 15000 }).then(() => stepTitle(page), () => null)
  await context.close()
  await api(setup.page, 'POST', '/apps/introvox/admin/steps', { steps: STEPS, lang: 'en' })
  assert(shown === null, `a step showed: ${shown}`)
})

await browser.close()
process.exit(summary() ? 1 : 0)
