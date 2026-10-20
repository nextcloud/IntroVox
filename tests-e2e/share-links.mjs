// Share links: typed mid-tour, and opened without a session. Needs the
// built-in Talk and Deck tours on.
import { launch, login, check, summary, assert, BASE, PASSWORD } from './lib.mjs'
const browser = await launch()
const { page: p } = await login(browser, 'introvox-e2e-admin')
const LINK = BASE + '/index.php/apps/spreed/?introvox-tour=builtin-talk'
const step = () => p.locator('.shepherd-element:visible')
const title = async () => (await step().locator('.shepherd-title').textContent()).trim()
const forward = () => step().locator('.shepherd-button:not(.shepherd-button-secondary)').first()
const waitTitle = async (want) => {
  for (let i = 0; i < 80; i++) {
    if (await step().count() && await title() === want) return
    await p.waitForTimeout(250)
  }
  throw new Error(`no "${want}", but ${await step().count() ? await title() : 'no step'}`)
}
await check('share link: typed mid-tour in the same tab, it starts its tour from the first step', async () => {
  await p.goto(LINK)
  await waitTitle('💬 Welcome to Talk')
  await forward().click()
  await waitTitle('🚀 A conversation for your team')
  const resumeBefore = await p.evaluate(() => sessionStorage.getItem('introvox_tour_resume'))
  await p.goto(LINK)
  await waitTitle('💬 Welcome to Talk')
  const resumeAfter = await p.evaluate(() => sessionStorage.getItem('introvox_tour_resume'))
  return `resume entry before: ${resumeBefore ? 'yes' : 'no'}, after: ${resumeAfter ? 'yes' : 'no'}`
})
// Nextcloud drops the query from the login redirect, so the link is a route
await check('share link: opened while logged out, it starts its tour after logging in', async () => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.goto(BASE + '/index.php/apps/introvox/tour/builtin-deck')
  assert(page.url().includes('/login'), `not on the login page: ${page.url()}`)
  await page.fill('input[name="user"]', 'introvox-e2e-admin')
  await page.fill('input[name="password"]', PASSWORD)
  await Promise.all([page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 60000, waitUntil: 'domcontentloaded' }), page.click('button[type="submit"]')])
  const title = page.locator('.shepherd-element:visible .shepherd-title')
  await title.waitFor({ timeout: 30000 })
  const shown = (await title.textContent()).trim()
  await context.close()
  assert(shown === '🗂️ Welcome to Deck', `step: ${shown}`)
  return shown
})

await browser.close()
process.exit(summary() ? 1 : 0)
